import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { deploymentCandidate, isCurrentCommit, successfulMainRun, assertPublicDemoIngress, deploymentParameters, readyEndpoint, verifyBuild, verifyEndpoint } from './deployment.mjs'

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
      secrets: [], ingress: {
        external: true, allowInsecure: false, targetPort: 8080, exposedPort: 0, transport: 'Auto',
        fqdn: 'demo.example.azurecontainerapps.io',
      },
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

test('restricted ingress is rejected before deployment parameters can broaden access', () => {
  for (const change of [
    { external: false }, { allowInsecure: true },
    { ipSecurityRestrictions: [{ name: 'office', action: 'Allow', ipAddressRange: '192.0.2.0/24' }] },
    { ipSecurityRestrictions: [{ name: 'blocked', action: 'Deny', ipAddressRange: '198.51.100.0/24' }] },
    { ipSecurityRestrictions: {} }, { clientCertificateMode: 'Require' },
    { clientCertificateMode: 'Accept' }, { targetPort: 80 }, { transport: 'tcp', exposedPort: 9000 },
    { customDomains: [{ name: 'demo.example.com' }] },
    { additionalPortMappings: [{ targetPort: 9000, external: false }] },
    { corsPolicy: { allowedOrigins: ['https://demo.example.com'] } },
    { stickySessions: { affinity: 'sticky' } },
  ]) {
    const restricted = structuredClone(app)
    Object.assign(restricted.properties.configuration.ingress, change)
    const before = structuredClone(restricted)
    assert.throws(() => deploymentParameters(restricted, registry, image), /ingress|certificate/)
    assert.throws(() => readyEndpoint(restricted, image), /ingress|certificate/)
    assert.deepEqual(restricted, before)
  }
})

test('the existing Azure public-demo defaults remain deployable', () => {
  const existing = structuredClone(app)
  Object.assign(existing.properties.configuration.ingress, {
    clientCertificateMode: null, customDomains: null, ipSecurityRestrictions: null,
    additionalPortMappings: null, corsPolicy: null, stickySessions: null,
  })
  assert.doesNotThrow(() => deploymentParameters(existing, registry, image))
  Object.assign(existing.properties.configuration.ingress, {
    clientCertificateMode: 'Ignore', customDomains: [], ipSecurityRestrictions: [],
    additionalPortMappings: [], stickySessions: { affinity: 'none' },
  })
  assert.doesNotThrow(() => assertPublicDemoIngress(existing))
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

test('the configured secret endpoint must match the actual deployed HTTPS endpoint', () => {
  const endpoint = readyEndpoint(app, image)
  assert.doesNotThrow(() => verifyEndpoint(endpoint, endpoint))
  assert.doesNotThrow(() => verifyEndpoint(endpoint, endpoint.slice(0, -1)))
  for (const other of ['http://demo.example.azurecontainerapps.io/', 'https://other.example.azurecontainerapps.io/',
    `${endpoint}different-path`, `${endpoint}?different-query`]) {
    assert.throws(() => verifyEndpoint(endpoint, other), /AZURE_APP_URL/)
  }
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

test('only the eligible release job serializes deployment through completion of live smoke checks', () => {
  const entry = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
  const workflow = readFileSync(new URL('../.github/workflows/deploy-azure.yml', import.meta.url), 'utf8')
  assert.match(entry, /workflow_run:/)
  assert.doesNotMatch(entry, /pull_request:|^concurrency:/m)
  const [gate, release] = entry.split('\n  release:')
  assert.doesNotMatch(gate, /concurrency:|id-token: write/)
  assert.match(release, /needs: gate/)
  assert.match(release, /if: needs\.gate\.outputs\.eligible == 'true'/)
  assert.match(release, /concurrency:\s+group: azure-demo-deployment\s+cancel-in-progress: false/)
  assert.match(release, /uses: \.\/\.github\/workflows\/deploy-azure\.yml/)
  assert.match(release, /source_sha: \$\{\{ needs\.gate\.outputs\.sha \}\}/)
  assert.match(workflow, /workflow_call:/)
  assert.doesNotMatch(workflow, /workflow_run:|workflow_dispatch:|pull_request:|concurrency:/)
  assert.match(workflow, /ref: \$\{\{ inputs\.source_sha \}\}/)
  assert.match(workflow, /persist-credentials: false/)
  assert.match(workflow, /azure\/login@v2/)
  assert.match(workflow, /--template-file infra\/deploy\.bicep/)
  assert.match(workflow, /if: steps\.current\.outputs\.current == 'true'/)
  assert.match(workflow, /--build-arg "SOURCE_SHA=\$\{SOURCE_SHA\}"/)
  const apply = workflow.split('      - name: Refresh ingress, deploy and verify the ready revision')[1]
  assert.ok(apply.indexOf('node scripts/deployment.mjs parameters') < apply.indexOf('az deployment group create'))
  assert.ok(apply.indexOf('> "$RUNNER_TEMP/container-app.json"') < apply.indexOf('node scripts/deployment.mjs parameters'))
  const smoke = workflow.split('\n  smoke:')[1]
  assert.ok(smoke)
  assert.match(smoke, /needs: deploy/)
  assert.match(smoke, /if: needs\.deploy\.outputs\.deployed == 'true'/)
  assert.doesNotMatch(smoke, /id-token: write|azure\/login/)
  assert.match(smoke, /npm run test:deployed/)
  const deployedConfig = readFileSync(new URL('../playwright.deployed.config.ts', import.meta.url), 'utf8')
  assert.match(deployedConfig, /webServer: undefined/)
  assert.match(deployedConfig, /protocol !== 'https:'/)
})

test('Azure secrets are explicitly passed to the reusable workflow without secret-derived job outputs', () => {
  const entry = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8')
  const workflow = readFileSync(new URL('../.github/workflows/deploy-azure.yml', import.meta.url), 'utf8')
  const setup = readFileSync(new URL('./setup-azure-auth-for-pipeline.ps1', import.meta.url), 'utf8')
  const declaredSecrets = workflow.split('    secrets:')[1].split('\npermissions:')[0]
  for (const key of ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID', 'AZURE_RESOURCE_GROUP',
    'AZURE_CONTAINER_APP', 'AZURE_CONTAINER_REGISTRY', 'AZURE_IMAGE_REPOSITORY', 'AZURE_APP_URL']) {
    assert.ok(entry.includes(`${key}: \${{ secrets.${key} }}`), `Caller must explicitly pass ${key}`)
    assert.match(declaredSecrets, new RegExp(`${key}:\\s+required: true`))
    assert.ok(workflow.includes(`\${{ secrets.${key} }}`), `Callee must consume ${key}`)
  }
  assert.doesNotMatch(entry + workflow, /\bvars\./)
  assert.doesNotMatch(entry, /secrets: inherit/)
  assert.doesNotMatch(workflow, /outputs\.url/)
  const smoke = workflow.split('\n  smoke:')[1]
  assert.match(smoke, /ASSESSMENT_URL: \$\{\{ secrets\.AZURE_APP_URL \}\}/)
  assert.doesNotMatch(smoke, /echo.*\$ASSESSMENT_URL/)
  assert.match(setup, /'secret', 'set'/)
  assert.doesNotMatch(setup, /'variable', 'set'/)
})
