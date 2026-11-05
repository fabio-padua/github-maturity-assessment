param location string
param identityName string
param repository string
param federatedSubject string

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: identityName
  location: location
  tags: {
    purpose: 'github-actions-deployment'
    repository: repository
  }
}

module federation './github-federation.bicep' = {
  name: 'github-main'
  params: {
    identityName: identity.name
    federatedSubject: federatedSubject
  }
}

output clientId string = identity.properties.clientId
output principalId string = identity.properties.principalId
