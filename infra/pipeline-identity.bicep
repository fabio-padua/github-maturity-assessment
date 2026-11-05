targetScope = 'subscription'

param location string
param identityResourceGroupName string
param identityName string
param applicationResourceGroupName string
param repository string

resource identityGroup 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: identityResourceGroupName
  location: location
  tags: {
    purpose: 'github-actions-deployment'
    repository: repository
  }
}

resource applicationGroup 'Microsoft.Resources/resourceGroups@2025-04-01' existing = {
  name: applicationResourceGroupName
}

module identity './modules/pipeline-identity.bicep' = {
  name: 'pipeline-identity'
  scope: identityGroup
  params: {
    location: location
    identityName: identityName
    repository: repository
  }
}

module permissions './modules/pipeline-permissions.bicep' = {
  name: 'pipeline-permissions'
  scope: applicationGroup
  params: {
    principalId: identity.outputs.principalId
  }
}

output clientId string = identity.outputs.clientId
output tenantId string = tenant().tenantId
