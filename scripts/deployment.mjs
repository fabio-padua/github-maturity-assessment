import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function assertSha(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value)) throw new Error('Expected a full Git commit SHA.')
  return value
}

export function githubFederationSubject(profile) {
  if (profile?.use_default !== true || typeof profile.use_immutable_subject !== 'boolean') {
    throw new Error('Unsupported or custom GitHub OIDC subject profile; review the trust configuration explicitly.')
  }
  const name = '[a-zA-Z0-9_.-]+'
  const prefixPattern = profile.use_immutable_subject
    ? new RegExp(`^repo:${name}@[1-9][0-9]*/${name}@[1-9][0-9]*$`)
    : new RegExp(`^repo:${name}/${name}$`)
  if (typeof profile.sub_claim_prefix !== 'string' || !prefixPattern.test(profile.sub_claim_prefix)) {
    throw new Error('GitHub did not return a valid subject prefix matching its configured OIDC mode.')
  }
  return `${profile.sub_claim_prefix}:ref:refs/heads/main`
}

export function deploymentCandidate({ eventName, event, repository, ref, sha }) {
  if (eventName === 'workflow_run') {
    const run = event.workflow_run
    if (run?.name !== 'Quality checks' || run.conclusion !== 'success' || run.event !== 'push'
      || run.head_branch !== 'main' || run.head_repository?.full_name !== repository) {
      return { eligible: false, reason: 'Only successful push CI from this repository main branch may deploy.' }
    }
    return { eligible: true, sha: assertSha(run.head_sha) }
  }
  if (eventName === 'workflow_dispatch') {
    if (ref !== 'refs/heads/main') throw new Error('Manual deployment is allowed only from main.')
    return { eligible: true, sha: assertSha(sha) }
  }
  throw new Error('Unsupported deployment trigger.')
}

export function isCurrentCommit(sha, latest) {
  return assertSha(sha) === assertSha(latest)
}

export function successfulMainRun(run, sha, repository) {
  return run?.name === 'Quality checks' && run.head_sha === sha && run.head_branch === 'main' && run.event === 'push'
    && run.conclusion === 'success' && run.head_repository?.full_name === repository
}

function required(name) {
  if (!process.env[name]) throw new Error(`Missing ${name}. Complete .azure/pipeline-setup.md before deploying.`)
  return process.env[name]
}

async function github(path) {
  const response = await fetch(`https://api.github.com/repos/${required('GITHUB_REPOSITORY')}/${path}`, {
    headers: { Authorization: `Bearer ${required('GH_TOKEN')}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`GitHub preflight failed (${response.status}): ${path}`)
  return response.json()
}

function output(name, value) {
  appendFileSync(required('GITHUB_OUTPUT'), `${name}=${value}\n`)
}

function summary(text) {
  appendFileSync(required('GITHUB_STEP_SUMMARY'), `${text}\n`)
}

function groupPrefix(id) {
  const match = /^\/subscriptions\/[^/]+\/resourceGroups\/[^/]+(?=\/|$)/i.exec(id ?? '')
  if (!match) throw new Error('Invalid application resource ID.')
  return match[0]
}

function resourceName(id, type, prefix) {
  const expected = `${prefix}/providers/${type}/`
  if (!id?.toLowerCase().startsWith(expected.toLowerCase())) throw new Error(`Expected ${type} inside the application resource group.`)
  const name = id.slice(expected.length)
  if (!name || name.includes('/')) throw new Error(`Invalid ${type} resource name.`)
  return name
}

export function assertPublicDemoIngress(app) {
  const ingress = app.properties?.configuration?.ingress
  if (ingress?.external !== true || ingress.allowInsecure !== false) {
    throw new Error('Expected the existing HTTPS-only public demo ingress; internal or insecure ingress cannot use this template.')
  }
  for (const setting of ['ipSecurityRestrictions', 'customDomains', 'additionalPortMappings']) {
    if (ingress[setting] != null && (!Array.isArray(ingress[setting]) || ingress[setting].length)) {
      throw new Error(`Deployment stopped: the public-demo template would overwrite ingress ${setting}.`)
    }
  }
  if (ingress.clientCertificateMode != null && ingress.clientCertificateMode.toLowerCase() !== 'ignore') {
    throw new Error('Deployment stopped: the public-demo template would overwrite client certificate requirements.')
  }
  if (ingress.targetPort !== 8080 || (ingress.exposedPort != null && ingress.exposedPort !== 0)
    || (ingress.transport != null && ingress.transport.toLowerCase() !== 'auto')
    || ingress.corsPolicy != null
    || (ingress.stickySessions != null && ingress.stickySessions.affinity?.toLowerCase() !== 'none')) {
    throw new Error('Deployment stopped: ingress differs from the supported public-demo template.')
  }
}

export function deploymentParameters(app, registry, image) {
  const prefix = groupPrefix(app.id)
  if (app.type?.toLowerCase() !== 'microsoft.app/containerapps' || !app.name || !app.location) {
    throw new Error('Expected an existing Container App.')
  }
  assertPublicDemoIngress(app)
  const registryName = resourceName(registry.id, 'Microsoft.ContainerRegistry/registries', prefix)
  const server = registry.loginServer
  if (!server || !image?.startsWith(`${server}/`) || !/@sha256:[a-f0-9]{64}$/.test(image)) {
    throw new Error('Deployment requires an immutable digest from the configured registry.')
  }
  const configuration = app.properties?.configuration
  const identities = Object.keys(app.identity?.userAssignedIdentities ?? {})
  const pull = configuration?.registries?.find(item => item.server === server)
  if (app.identity?.type !== 'UserAssigned' || !pull?.identity || identities.length !== 1 || identities[0].toLowerCase() !== pull.identity.toLowerCase()) {
    throw new Error('Expected the existing single managed identity for private registry pulls.')
  }
  if (configuration.secrets?.length || app.properties?.template?.containers?.length !== 1
    || app.properties.template.volumes?.length || app.properties.template.containers[0].env?.length) {
    throw new Error('This deployment wrapper supports only the existing secret-free, single-container static demo.')
  }
  const values = {
    location: app.location.replace(/\s+/g, '').toLowerCase(),
    appName: app.name,
    environmentName: resourceName(app.properties.managedEnvironmentId, 'Microsoft.App/managedEnvironments', prefix),
    registryName,
    identityName: resourceName(pull.identity, 'Microsoft.ManagedIdentity/userAssignedIdentities', prefix),
    containerImage: image,
    tags: app.tags ?? {},
  }
  return {
    $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',
    contentVersion: '1.0.0.0',
    parameters: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }])),
  }
}

export function readyEndpoint(app, image) {
  const p = app.properties
  if (p?.provisioningState !== 'Succeeded' || !p.latestRevisionName || p.latestReadyRevisionName !== p.latestRevisionName
    || p.template?.containers?.[0]?.image !== image) throw new Error('The expected image does not have a ready revision.')
  assertPublicDemoIngress(app)
  if (!p.configuration.ingress.fqdn?.endsWith('.azurecontainerapps.io')) {
    throw new Error('Expected the existing HTTPS-only Container Apps endpoint.')
  }
  return `https://${p.configuration.ingress.fqdn}/`
}

export function verifyBuild(info, sha) {
  if (info?.commit !== assertSha(sha)) throw new Error('The live endpoint is serving a different build commit.')
}

export function verifyEndpoint(actual, configured) {
  const expected = new URL(configured)
  if (expected.protocol !== 'https:' || expected.href !== new URL(actual).href) {
    throw new Error('AZURE_APP_URL must match the deployed Container App HTTPS endpoint.')
  }
}

async function health(url, sha) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(new URL('build-info.json', url), {
        redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(30_000),
      })
      if (!response.ok) throw new Error(`Build identity endpoint returned HTTP ${response.status}.`)
      verifyBuild(await response.json(), sha)
      const root = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) })
      if (!root.ok || !(await root.text()).includes('/assets/')) throw new Error('The live application shell is not healthy.')
      return
    } catch (error) {
      if (attempt === 2) throw error
      console.warn(`HTTPS/build verification attempt ${attempt + 1} failed: ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 10_000))
    }
  }
}

async function main(command) {
  if (command === 'federation-subject') {
    console.log(githubFederationSubject(JSON.parse(readFileSync(0, 'utf8'))))
  } else if (command === 'gate') {
    const event = JSON.parse(readFileSync(required('GITHUB_EVENT_PATH'), 'utf8'))
    const candidate = deploymentCandidate({
      eventName: required('GITHUB_EVENT_NAME'), event, repository: required('GITHUB_REPOSITORY'),
      ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA,
    })
    if (!candidate.eligible) {
      output('eligible', 'false')
      summary(`Deployment skipped: ${candidate.reason}`)
      return
    }
    const latest = (await github('git/ref/heads/main')).object.sha
    if (!isCurrentCommit(candidate.sha, latest)) {
      output('eligible', 'false')
      summary(`Deployment skipped: ${candidate.sha} was superseded on main.`)
      return
    }
    const runs = await github(`actions/workflows/ci.yml/runs?branch=main&event=push&head_sha=${candidate.sha}&status=success&per_page=20`)
    if (!runs.workflow_runs?.some(run => successfulMainRun(run, candidate.sha, required('GITHUB_REPOSITORY')))) {
      throw new Error('The latest main commit has no successful Quality checks run. Retry after CI succeeds.')
    }
    output('eligible', 'true')
    output('sha', candidate.sha)
    summary(`Deployment authorized for CI-verified main commit ${candidate.sha}.`)
  } else if (command === 'current') {
    const current = isCurrentCommit(required('SOURCE_SHA'), (await github('git/ref/heads/main')).object.sha)
    output('current', String(current))
    if (!current) summary('Container App not updated: a newer main commit arrived during the build. The built image remains in ACR.')
  } else if (command === 'configuration') {
    for (const name of ['AZURE_CLIENT_ID', 'AZURE_TENANT_ID', 'AZURE_SUBSCRIPTION_ID', 'AZURE_RESOURCE_GROUP',
      'AZURE_CONTAINER_APP', 'AZURE_CONTAINER_REGISTRY', 'AZURE_IMAGE_REPOSITORY', 'ASSESSMENT_URL']) required(name)
    if (new URL(required('ASSESSMENT_URL')).protocol !== 'https:') throw new Error('AZURE_APP_URL must use HTTPS.')
    assertSha(required('SOURCE_SHA'))
  } else if (command === 'parameters') {
    const temp = required('RUNNER_TEMP')
    const app = JSON.parse(readFileSync(resolve(temp, 'container-app.json'), 'utf8'))
    const registry = JSON.parse(readFileSync(resolve(temp, 'registry.json'), 'utf8'))
    const parameters = deploymentParameters(app, registry, required('CONTAINER_IMAGE'))
    verifyEndpoint(`https://${app.properties.configuration.ingress.fqdn}/`, required('ASSESSMENT_URL'))
    writeFileSync(resolve(temp, 'deploy.parameters.json'), JSON.stringify(parameters))
  } else if (command === 'ready') {
    const app = JSON.parse(readFileSync(resolve(required('RUNNER_TEMP'), 'deployed-app.json'), 'utf8'))
    verifyEndpoint(readyEndpoint(app, required('CONTAINER_IMAGE')), required('ASSESSMENT_URL'))
    output('deployed', 'true')
  } else if (command === 'health') {
    const url = new URL(required('ASSESSMENT_URL'))
    if (url.protocol !== 'https:') throw new Error('Live verification requires HTTPS.')
    await health(url, assertSha(required('SOURCE_SHA')))
  } else {
    throw new Error('Unknown deployment command.')
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main(process.argv[2])
