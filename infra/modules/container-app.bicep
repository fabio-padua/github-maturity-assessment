param location string
param appName string
param environmentName string
param registryName string
param identityName string
param tags object
param containerImage string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

resource environment 'Microsoft.App/managedEnvironments@2026-07-01' existing = {
  name: environmentName
}

resource registry 'Microsoft.ContainerRegistry/registries@2025-11-01' existing = {
  name: registryName
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' existing = {
  name: identityName
}

var isPlaceholder = containerImage == 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
var effectivePort = isPlaceholder ? 80 : 8080

resource app 'Microsoft.App/containerApps@2026-07-01' = {
  name: appName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: effectivePort
        transport: 'auto'
        allowInsecure: false
      }
      registries: isPlaceholder
        ? []
        : [
            {
              server: registry.properties.loginServer
              identity: identity.id
            }
          ]
      secrets: []
    }
    template: {
      containers: [
        {
          name: 'github-maturity-assessment'
          image: containerImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          probes: [
            {
              type: 'Startup'
              httpGet: {
                path: '/'
                port: effectivePort
              }
              periodSeconds: 5
              timeoutSeconds: 2
              failureThreshold: 30
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/'
                port: effectivePort
              }
              periodSeconds: 5
              timeoutSeconds: 2
              failureThreshold: 3
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/'
                port: effectivePort
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 2
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
    }
  }
}

output id string = app.id
output appName string = app.name
output fqdn string = app.properties.configuration.ingress.fqdn
