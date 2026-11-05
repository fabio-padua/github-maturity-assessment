import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { deploymentCandidate, isCurrentCommit, successfulMainRun, deploymentParameters, readyEndpoint, verifyBuild } from './deployment.mjs'

const sha = 'a'.repeat(40)
const newer = 'b'.repeat(40)
const repository = 'example/assessment'
const run = {
  name: 'Quality checks', conclusion: 'success', event: 'push',
  head_branch: 'main', head_sha: sha, head_repository: { full_name: repository },
}
const context = { eventName: 'workflow_run', event: { workflow_run: run }, repository, ref: 'refs/heads/main', sha }

test('only successful push CI on this repository main is eligible', () => {
  assert.deepEqual(deploymentCandidate(context), { eligible: true, sha })
  for (const change of [
    { conclusion: 'failure' }, { conclusion: 'cancelled' }, { event: 'pull_request' },
    { head_branch: 'feature' }, { head_repository: { full_name: 'fork/assessment' } },
    { head_repository: null }, { name: 'Untrusted workflow' },
  ]) {
    const changed = { ...run, ...change }
    assert.equal(deploymentCandidate({ ...context, event: { workflow_run: changed } }).eligible, false)
    assert.equal(successfulMainRun(changed, sha, repository), false)
  }
})

test('manual runs cannot select branches or arbitrary commits', () => {
  assert.deepEqual(deploymentCandidate({ ...context, eventName: 'workflow_dispatch' }), { eligible: true, sha })
  assert.throws(() => deploymentCandidate({ ...context, eventName: 'workflow_dispatch', ref: 'refs/heads/feature' }), /only from main/)
  assert.throws(() => deploymentCandidate({ ...context, eventName: 'pull_request' }), /Unsupported/)
  assert.throws(() => deploymentCandidate({ ...context, event: { workflow_run: { ...run, head_sha: 'main; echo unsafe' } } }), /commit SHA/)
})

test('current commit and successful CI checks are exact', () => {
  assert.equal(isCurrentCommit(sha, sha), true)
  assert.equal(isCurrentCommit(sha, newer), false)
  assert.equal(successfulMainRun(run, sha, repository), true)
  assert.equal(successfulMainRun(run, newer, repository), false)
  assert.throws(() => isCurrentCommit('main', newer), /commit SHA/)
})

const group = '/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/demo'
const identity = `${group}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/app-pull`
const registry = { id: `${group}/providers/Microsoft.ContainerRegistry/registries/demoacr`, name: 'demoacr', loginServer: 'demoacr.azurecr.io' }
const image = `demoacr.azurecr.io/assessment@sha256:${'c'.repeat(64)}`
const app = {
  id: `${group}/providers/Microsoft.App/containerApps/demo-app`, name: 'demo-app',
  type: 'Microsoft.App/containerapps', location: 'East US 2',
  tags: { owner: 'unchanged', 'created-at': 'original-date' },
  identity: { type: 'UserAssigned', userAssignedIdentities: { [identity.toLowerCase()]: {} } },
  properties: {
    managedEnvironmentId: `${group}/providers/Microsoft.App/managedEnvironments/demo-environment`,
    provisioningState: 'Succeeded', latestRevisionName: 'new-revision', latestReadyRevisionName: 'new-revision',
    configuration: {
      registries: [{ server: registry.loginServer, identity }],
      secrets: [], ingress: { allowInsecure: false, fqdn: 'demo.example.azurecontainerapps.io' },
    },
    template: { containers: [{ image }] },
  },
}

test('deployment parameters preserve names, tags, location and the existing pull identity', () => {
  const before = structuredClone(app)
  const params = deploymentParameters(app, registry, image).parameters
  assert.deepEqual(params, {
    location: { value: 'eastus2' }, appName: { value: 'demo-app' },
    environmentName: { value: 'demo-environment' }, registryName: { value: 'demoacr' },
    identityName: { value: 'app-pull' }, containerImage: { value: image }, tags: { value: app.tags },
  })
  assert.deepEqual(app, before)
})

test('deployment rejects mutable/foreign images and unknown configuration rather than overwriting it', () => {
  assert.throws(() => deploymentParameters(app, registry, 'demoacr.azurecr.io/assessment:latest'), /immutable/)
  assert.throws(() => deploymentParameters(app, registry, `foreign.azurecr.io/assessment@sha256:${'c'.repeat(64)}`), /immutable/)
  const changed = structuredClone(app)
  changed.properties.configuration.secrets = [{ name: 'existing-secret' }]
  assert.throws(() => deploymentParameters(changed, registry, image), /secret-free/)
  const multipleIdentities = structuredClone(app)
  multipleIdentities.identity.userAssignedIdentities['other-identity'] = {}
  assert.throws(() => deploymentParameters(multipleIdentities, registry, image), /single managed identity/)
  assert.throws(() => deploymentParameters(app, { ...registry, id: registry.id.replace('/demo/', '/other/') }, image), /application resource group/)
})

test('ready endpoint requires the expected ready image and HTTPS', () => {
  assert.equal(readyEndpoint(app, image), 'https://demo.example.azurecontainerapps.io/')
  const old = structuredClone(app)
  old.properties.latestReadyRevisionName = 'old-revision'
  assert.throws(() => readyEndpoint(old, image), /ready revision/)
  assert.throws(() => readyEndpoint(app, 'different-image'), /ready revision/)
  const insecure = structuredClone(app)
  insecure.properties.configuration.ingress.allowInsecure = true
  assert.throws(() => readyEndpoint(insecure, image), /HTTPS-only/)
})

test('the served build identity must match the tested commit', () => {
  assert.doesNotThrow(() => verifyBuild({ commit: sha }, sha))
  assert.throws(() => verifyBuild({ commit: newer }, sha), /different build/)
  assert.throws(() => verifyBuild({ commit: 'unknown' }, sha), /different build/)
})

test('the Docker build stamp records the exact commit and rejects invalid build arguments', () => {
  const dockerfile = readFileSync(new URL('../infra/Dockerfile', import.meta.url), 'utf8')
  const code = /^RUN node -e "(.*)"$/m.exec(dockerfile)?.[1]
  assert.ok(code, 'The image must generate build-info.json during its build.')
  const directory = mkdtempSync(join(tmpdir(), 'assessment-build-stamp-'))
  try {
    mkdirSync(join(directory, 'dist'))
    const result = spawnSync(process.execPath, ['-e', code], { cwd: directory, env: { ...process.env, SOURCE_SHA: sha }, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(JSON.parse(readFileSync(join(directory, 'dist', 'build-info.json'), 'utf8')), { commit: sha })
    const invalid = spawnSync(process.execPath, ['-e', code], { cwd: directory, env: { ...process.env, SOURCE_SHA: 'invalid' } })
    assert.notEqual(invalid.status, 0)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('workflow separates privileged CD from CI and live smoke tests', () => {
  const workflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
  assert.match(workflow, /workflow_run:/)
  assert.doesNotMatch(workflow, /pull_request:/)
  assert.match(workflow, /cancel-in-progress: false/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /ref: \$\{\{ needs\.gate\.outputs\.sha \}\}/)
  assert.match(workflow, /azure\/login@v2/)
  assert.match(workflow, /--template-file infra\/deploy\.bicep/)
  assert.match(workflow, /if: steps\.current\.outputs\.current == 'true'/)
  assert.match(workflow, /--build-arg "SOURCE_SHA=\$\{SOURCE_SHA\}"/)
  const smoke = workflow.split('\n  smoke:')[1]
  assert.ok(smoke)
  assert.doesNotMatch(smoke, /id-token: write|azure\/login/)
  assert.match(smoke, /npm run test:deployed/)
  const deployedConfig = readFileSync(new URL('../playwright.deployed.config.ts', import.meta.url), 'utf8')
  assert.match(deployedConfig, /webServer: undefined/)
  assert.match(deployedConfig, /protocol !== 'https:'/)
})
