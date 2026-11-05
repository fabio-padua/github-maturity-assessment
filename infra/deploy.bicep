targetScope = 'resourceGroup'

param location string
param appName string
param environmentName string
param registryName string
param identityName string
param tags object

@description('The immutable ACR digest reference built from the CI-verified commit.')
@minLength(1)
param containerImage string

module app './modules/container-app.bicep' = {
  name: 'container-app'
  params: {
    location: location
    appName: appName
    environmentName: environmentName
    registryName: registryName
    identityName: identityName
    containerImage: containerImage
    tags: tags
  }
}

output fqdn string = app.outputs.fqdn
