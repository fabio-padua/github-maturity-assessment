param principalId string

var contributorRole = 'b24988ac-6180-42a0-ab88-20f7382dd24c'

resource permissions 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, principalId, contributorRole)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', contributorRole)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
