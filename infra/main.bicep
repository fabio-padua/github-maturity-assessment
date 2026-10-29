targetScope = 'subscription'

@minLength(1)
@maxLength(64)
param environmentName string

@minLength(1)
param location string

param sessionId string
param deployedBy string
param createdAt string
param deployerObjectId string

@description('Container image. Leave as the public placeholder for phase 1; pass an immutable ACR image for phase 2.')
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

var tags = {
  'app-onboard-skill': 'true'
  'app-onboard-session-id': sessionId
  'created-at': createdAt
  environment: environmentName
  'deployed-by': deployedBy
}

resource rg 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: 'rg-gh-maturity-demo-977a'
  location: location
  tags: tags
}

module registry './modules/registry.bicep' = {
  name: 'registry'
  scope: rg
  params: {
    location: location
    registryName: 'crghmaturitydemo977a'
    tags: tags
  }
}

module identity './modules/identity.bicep' = {
  name: 'identity'
  scope: rg
  params: {
    location: location
    identityName: 'id-gh-maturity-demo-977a'
    tags: tags
  }
}

module environment './modules/environment.bicep' = {
  name: 'environment'
  scope: rg
  params: {
    location: location
    environmentName: 'cae-gh-maturity-demo-977a'
    tags: tags
  }
}

module containerApp './modules/container-app.bicep' = {
  name: 'container-app'
  scope: rg
  params: {
    location: location
    appName: 'ca-gh-maturity-demo-977a'
    environmentName: 'cae-gh-maturity-demo-977a'
    registryName: 'crghmaturitydemo977a'
    identityName: 'id-gh-maturity-demo-977a'
    containerImage: containerImage
    tags: tags
  }
  dependsOn: [environment, registry, identity, roleAssignments]
}

module roleAssignments './modules/role-assignments.bicep' = {
  name: 'role-assignments'
  scope: rg
  params: {
    registryName: 'crghmaturitydemo977a'
    principalId: identity.outputs.principalId
  }
  dependsOn: [registry]
}

output resourceGroupName string = rg.name
output registryName string = registry.outputs.registryName
output registryLoginServer string = registry.outputs.loginServer
output containerAppName string = containerApp.outputs.appName
output containerAppFqdn string = containerApp.outputs.fqdn
