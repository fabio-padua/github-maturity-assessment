param location string
param identityName string
param repository string

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: identityName
  location: location
  tags: {
    purpose: 'github-actions-deployment'
    repository: repository
  }
}

resource federation 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2024-11-30' = {
  parent: identity
  name: 'github-main'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    subject: 'repo:${repository}:ref:refs/heads/main'
    audiences: ['api://AzureADTokenExchange']
  }
}

output clientId string = identity.properties.clientId
output principalId string = identity.properties.principalId
