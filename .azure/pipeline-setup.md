# Azure demo continuous deployment

Deployment configuration belongs in repository Actions Secrets. **Never add actual tenant IDs, subscription IDs, client IDs, resource names, registry names, image repository values, or deployment URLs to this document.**

## Required repository Secrets

Use **Settings -> Secrets and variables -> Actions -> Secrets -> New repository secret**.

| Secret name | What to provide |
|---|---|
| `AZURE_CLIENT_ID` | Client/application ID of the dedicated deployment managed identity; not its principal/object ID |
| `AZURE_TENANT_ID` | Directory containing the deployment identity |
| `AZURE_SUBSCRIPTION_ID` | Subscription containing the existing demo |
| `AZURE_RESOURCE_GROUP` | Existing application resource group |
| `AZURE_CONTAINER_APP` | Existing Container App name |
| `AZURE_CONTAINER_REGISTRY` | Existing ACR name, without a hostname suffix |
| `AZURE_IMAGE_REPOSITORY` | Repository name inside ACR |
| `AZURE_APP_URL` | Existing Container App HTTPS endpoint |

No client secret, password, registry credential or PAT is required. The workflow explicitly forwards only these eight secrets to its reusable release workflow.

The endpoint is supplied directly as `AZURE_APP_URL` to deployment verification and the low-privilege smoke job. It is checked against the actual deployed application and is not passed as a cross-job output, which GitHub might suppress because its hostname contains a secret value. No encoded-secret outputs or credential-bearing artifacts are used.

Merge the Secrets workflow change before retrying CD; older workflow revisions still read Actions Variables.

## Deployment identity and scope

The pipeline uses a dedicated user-assigned managed identity, separate from the application's image-pull identity. Its backing Microsoft Entra Service Principal has type `ManagedIdentity`. Use its **client ID**, not its object ID, for `AZURE_CLIENT_ID`.

The deployment identity belongs in a separate identity resource group. Grant Contributor only on the existing application resource group, not on the subscription or the identity's own resource group. This enables ACR remote builds and resource-group Bicep deployment without permission to grant Azure RBAC or rewrite its own federation.

The federated credential uses:

```text
Issuer:   https://token.actions.githubusercontent.com
Subject:  <GITHUB_SUB_CLAIM_PREFIX>:ref:refs/heads/main
Audience: api://AzureADTokenExchange
```

The setup script reads `actions/oidc/customization/sub` for the intended repository and derives the subject from its `sub_claim_prefix`. Repositories using immutable subjects include owner and repository IDs in that prefix; a name-only subject will not match. Keep immutable subjects enabled. Both default immutable and default legacy profiles are supported, but missing, inconsistent or custom profiles fail explicitly rather than guessing a trust relationship.

Replace placeholders locally, not in committed documentation. Verify the subject matches the intended repository's actual profile exactly. Issuer and audience remain fixed; only the main branch is trusted. The Bicep subject is a required parameter with no legacy-format fallback.

The current private-repository plan does not provide private branch protection or deployment-environment approvals. The workflow therefore uses a strict main-ref federation and repository Secrets. It gates deployment on CI but does not enforce PRs or independent review. A suitably licensed repository can add required reviews and environment approvals separately.

## Optional administrator setup script

For reconciliation, review `scripts/setup-azure-auth-for-pipeline.ps1` and its Bicep templates before running them. Azure CLI, `gh` and Node.js 24 or newer are required. Use the actual target values only in your local session. The operator requires permission to create the identity resource group, assign the scoped role, read the repository's OIDC profile, and administer repository Secrets.

Run with `-WhatIf` first. The script previews the identity deployment and prompts before applying Azure permissions or configuring Secrets. It is not executed by CI or CD. Running it is unnecessary when the intended identity already exists and an administrator enters the Secrets manually.

No script execution, PR creation or merge automatically fills repository Secrets. Missing configuration fails explicitly. Allow role assignments to propagate before the first deployment. If setup is interrupted, reconcile the same identity and scopes rather than creating duplicate identities or widening permissions.

## Merge, deploy and verify

1. Main CI succeeds for the latest commit.
2. The deployment gate rejects PR, fork, failed-CI and superseded-commit events.
3. Only an eligible release acquires the concurrency lock. The reusable workflow retains that lock through deployment and the separate low-privilege smoke job; no duplicate lock exists inside it.
4. OIDC signs in as the dedicated identity. ACR builds the verified source with a unique SHA/run/attempt tag; deployment uses the immutable digest.
5. Main and live ingress are rechecked before applying Bicep. Internal ingress, IP restrictions, client-certificate requirements and incompatible ingress customizations stop CD rather than being cleared. Extend the template through review to preserve those controls; do not remove restrictions to make CD pass.
6. After ARM deployment completes, bounded polling waits for a fresh read of the target image's ready revision; deployment completion alone is not readiness. Ingress checks remain enforced, and an older image or timeout fails the run. The smoke job then verifies HTTPS, the actual build commit, all three language workflows, report precision and refresh-to-reset behavior. It has no Azure OIDC permission and never starts a local fallback server.

Only the existing demo is targeted. The code deployment wrapper does not reprovision the registry/environment or grant roles. Failure produces a failed Actions run and diagnostic artifacts; it never silently rolls back, deletes resources, changes regions/SKUs or disables HTTPS.

After configuration, use **Actions -> Deploy Azure demo -> Run workflow**, selecting `main`, to retry. Manual runs still require successful CI for the latest main commit.

## Cost and cleanup

The identity and its resource group have no base compute cost. Normal registry, build, traffic and Container Apps charges continue; tagged images accumulate until cleaned up.

When the demonstration is no longer needed, an authorized administrator should inspect and remove its dedicated application and identity resources using the intended target values from their local configuration. Cleanup is destructive and never executed by CI or CD. Do not copy target identifiers or cleanup commands containing actual configuration values into committed documentation.
