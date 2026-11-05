[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'High')]
param(
  [string] $SubscriptionId = '05205f08-8cae-45d2-bf60-65805d367aa7',
  [string] $ApplicationResourceGroup = 'rg-gh-maturity-demo-977a',
  [string] $ContainerApp = 'ca-gh-maturity-demo-977a',
  [string] $Registry = 'crghmaturitydemo977a',
  [string] $ImageRepository = 'github-maturity-assessment',
  [string] $Repository = 'fabio-padua/github-maturity-assessment',
  [string] $IdentityResourceGroup = 'rg-gh-maturity-demo-ci',
  [string] $IdentityName = 'id-gh-maturity-demo-ci',
  [string] $Location = 'eastus2'
)

$ErrorActionPreference = 'Stop'

function Invoke-Checked {
  param([string] $Tool, [string[]] $Arguments)
  $result = & $Tool @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Tool failed (exit $LASTEXITCODE); setup has not completed." }
  return $result
}

if ($IdentityResourceGroup -eq $ApplicationResourceGroup) {
  throw 'The deployment identity must be outside the application resource group.'
}
if ($Repository -notmatch '^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$') { throw 'Expected repository owner/name.' }

$account = Invoke-Checked az @('account', 'show', '--subscription', $SubscriptionId, '-o', 'json') | ConvertFrom-Json
$repo = Invoke-Checked gh @('repo', 'view', $Repository, '--json', 'viewerPermission') | ConvertFrom-Json
if ($repo.viewerPermission -ne 'ADMIN') { throw 'Repository administrator permission is required to set Actions variables.' }
$null = Invoke-Checked az @('group', 'show', '-n', $ApplicationResourceGroup, '--subscription', $SubscriptionId, '-o', 'none')
$null = Invoke-Checked az @('resource', 'show', '--resource-group', $ApplicationResourceGroup,
  '--name', $ContainerApp, '--resource-type', 'Microsoft.App/containerApps',
  '--api-version', '2026-07-01', '--subscription', $SubscriptionId, '-o', 'none')
$registryResource = Invoke-Checked az @('acr', 'show', '-n', $Registry, '--subscription', $SubscriptionId, '-o', 'json') | ConvertFrom-Json
if ($registryResource.id -notlike "*/resourceGroups/$ApplicationResourceGroup/*") {
  throw 'The configured registry must be inside the application resource group.'
}
if ($registryResource.roleAssignmentMode -ne 'LegacyRegistryPermissions') {
  throw 'This setup uses the existing classic registry permissions; ABAC registries require a different role design.'
}

Write-Host "Subscription: $($account.name) ($SubscriptionId)"
Write-Host "Application scope: $ApplicationResourceGroup; Container App: $ContainerApp; registry: $Registry"
Write-Host "Identity scope: $IdentityResourceGroup; identity: $IdentityName; region: $Location"
Write-Host "OIDC subject: repo:${Repository}:ref:refs/heads/main"
Write-Host 'The identity receives Contributor only on the application resource group, not the subscription or its own identity group.'
$template = Join-Path $PSScriptRoot '..\infra\pipeline-identity.bicep'
$parameters = @('--parameters', "identityResourceGroupName=$IdentityResourceGroup", "identityName=$IdentityName",
  "applicationResourceGroupName=$ApplicationResourceGroup", "repository=$Repository", "location=$Location")
Invoke-Checked az (@('deployment', 'sub', 'what-if', '--subscription', $SubscriptionId,
  '--location', $Location, '--template-file', $template) + $parameters) | Out-Host
if (-not $PSCmdlet.ShouldProcess($Repository, 'Create Azure deployment identity, grant scoped access and configure Actions variables')) {
  return
}
$result = Invoke-Checked az (@('deployment', 'sub', 'create', '--subscription', $SubscriptionId,
  '--location', $Location, '--name', 'gh-maturity-pipeline-identity', '--template-file', $template,
  '--query', 'properties.outputs', '-o', 'json') + $parameters) | ConvertFrom-Json
if (-not $result.clientId.value -or -not $result.tenantId.value) { throw 'Azure did not return the pipeline identity IDs.' }

$variables = @{
  AZURE_CLIENT_ID = $result.clientId.value
  AZURE_TENANT_ID = $result.tenantId.value
  AZURE_SUBSCRIPTION_ID = $SubscriptionId
  AZURE_RESOURCE_GROUP = $ApplicationResourceGroup
  AZURE_CONTAINER_APP = $ContainerApp
  AZURE_CONTAINER_REGISTRY = $Registry
  AZURE_IMAGE_REPOSITORY = $ImageRepository
}
foreach ($item in $variables.GetEnumerator()) {
  $null = Invoke-Checked gh @('variable', 'set', $item.Key, '--repo', $Repository, '--body', [string] $item.Value)
}
Write-Host 'OIDC setup complete. Allow time for Azure RBAC propagation before the first deployment.'
Write-Host 'After the workflow PR is merged and main CI succeeds, Deploy Azure demo runs automatically; no workflow is dispatched by this setup script.'
