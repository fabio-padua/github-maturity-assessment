# Azure demo continuous deployment

The deployment identity was created and verified on 2026-11-05 at the user's request. GitHub secrets are still configured by the repository administrator; opening or merging this PR does not populate them. Until configured, CD fails clearly on missing repository secrets; it does not silently skip deployment or fall back to passwords.

## Target and permissions

| Setting | Current demo |
|---|---|
| Subscription | MCAPS-Hybrid-REQ-46931-2022-fabiopadua (`05205f08-8cae-45d2-bf60-65805d367aa7`) |
| Tenant | `16b3c013-d300-468d-ac64-7eda0820b6d3` |
| Application resource group | `rg-gh-maturity-demo-977a` |
| Container App | `ca-gh-maturity-demo-977a` |
| Registry | `crghmaturitydemo977a` (Basic, classic permissions, admin disabled) |
| Identity resource group | `rg-gh-maturity-demo-ci` |
| Pipeline identity | `id-gh-maturity-demo-ci` |
| Region | East US 2 |
| GitHub repository | `fabio-padua/github-maturity-assessment` |

The deployment identity is separate from the application's AcrPull identity. A user-assigned managed identity has a backing Microsoft Entra **Service Principal** (`servicePrincipalType: ManagedIdentity`). `AZURE_CLIENT_ID` is its client/application ID, not its principal/object ID and not a password. Its federated credential accepts only:

```text
Issuer:   https://token.actions.githubusercontent.com
Subject:  repo:fabio-padua/github-maturity-assessment:ref:refs/heads/main
Audience: api://AzureADTokenExchange
```

Contributor is granted **only on the existing application resource group**, enabling ACR remote builds and resource-group Bicep deployment. It is not Owner, cannot grant Azure RBAC, and has no role on its own separate identity resource group, so it cannot rewrite its federation. This remains a powerful deployment role: protect repository administration and changes to `main`.

GitHub reports this private personal repository is on **Free**, which lacks private-repository branch protection and deployment environments. Accordingly, this workflow uses a strict **main-ref OIDC subject and repository secrets**, rather than assuming paid environment/approval features or making the repository public. It gates deployment on successful CI but **does not enforce PRs or independent review**. After upgrading or moving to a licensed organization, enable required PR checks/reviews; environment approvals can then replace the main-ref federation and add a deployment gate.

Only the existing demo is configured. No staging/production Azure resources are invented. The identity and resource group have no base compute cost; normal image build, registry, traffic, and Container Apps charges still apply. Old SHA/run-tagged images accumulate until cleaned up.

## Configure repository secrets

The Azure identity and its role assignment already exist for this demo. In **Settings -> Secrets and variables -> Actions -> Secrets -> New repository secret**, add the following values:

| Secret | Source |
|---|---|
| `AZURE_CLIENT_ID` | `az identity show -g rg-gh-maturity-demo-ci -n id-gh-maturity-demo-ci --subscription 05205f08-8cae-45d2-bf60-65805d367aa7 --query clientId -o tsv` |
| `AZURE_TENANT_ID` | `16b3c013-d300-468d-ac64-7eda0820b6d3` |
| `AZURE_SUBSCRIPTION_ID` | `05205f08-8cae-45d2-bf60-65805d367aa7` |
| `AZURE_RESOURCE_GROUP` | `rg-gh-maturity-demo-977a` |
| `AZURE_CONTAINER_APP` | `ca-gh-maturity-demo-977a` |
| `AZURE_CONTAINER_REGISTRY` | `crghmaturitydemo977a` |
| `AZURE_IMAGE_REPOSITORY` | `github-maturity-assessment` |
| `AZURE_APP_URL` | `https://ca-gh-maturity-demo-977a.graybay-0e1df60d.eastus2.azurecontainerapps.io/` |

These are configuration identifiers and a public endpoint, not client credentials, but they are stored as encrypted Actions Secrets as requested. Do not create `AZURE_CLIENT_SECRET`; authentication uses short-lived OIDC tokens.

The caller explicitly passes only these eight secrets to the reusable release workflow. The public endpoint is supplied directly as `AZURE_APP_URL` to both deployment verification and the low-privilege smoke job, and checked against the actual deployed app. It is deliberately **not a cross-job output**: the hostname contains `AZURE_CONTAINER_APP`, so GitHub's secret-output protection could otherwise suppress it. No encoded-secret outputs or credential-bearing artifacts are used.

Merge the Secrets workflow change before retrying CD; older workflow revisions still read Actions Variables.

## Optional administrator setup/reconciliation script

Prerequisites: Azure CLI and `gh`, authenticated to the intended Azure tenant/subscription and GitHub account. The operator must be able to create the separate identity resource group and assign Contributor (for example, Owner on this subscription), and be a GitHub repository administrator. No client secret, registry password, or PAT is created by the script.

From a checkout containing the reviewed PR changes:

```powershell
# Inspect the script and Bicep before running them.
.\scripts\setup-azure-auth-for-pipeline.ps1 -WhatIf

# Optional: prompts before reconciling Azure permissions and configuring repository secrets.
.\scripts\setup-azure-auth-for-pipeline.ps1
```

The script validates the existing app and registry, shows the scope, runs Bicep what-if, reconciles the deployment identity/RBAC, and configures these **repository Actions Secrets**:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
AZURE_RESOURCE_GROUP
AZURE_CONTAINER_APP
AZURE_CONTAINER_REGISTRY
AZURE_IMAGE_REPOSITORY
AZURE_APP_URL
```

All values are read by the workflow, not hardcoded into it. Allow Azure role assignments to propagate before the first run. If secret configuration fails after Azure setup, the script exits with an error; rerun it with the same names to reconcile the idempotent Bicep and secrets. Running the script is not required when the existing identity is used and the administrator enters the secrets manually.

## Merge, deploy, verify

1. Merge this PR. **Quality checks** runs for the new `main` commit.
2. **Deploy Azure demo** receives the successful `push` CI event. PR runs, failed CI, fork runs and superseded main commits cannot deploy.
3. OIDC signs in as the dedicated pipeline identity. ACR builds the actual tested commit using `infra/Dockerfile` and `VITE_DEMO_MODE=true`. A unique SHA/run/attempt tag avoids overwriting earlier builds; Bicep deploys its immutable digest.
4. Only an eligible run enters the serialized `release` job, which calls `deploy-azure.yml`. Its concurrency lock is held through both deployment and the separate live smoke job; failed or stale CI completions cannot displace a queued release. There is no workflow-level lock before eligibility, or duplicate lock inside the called workflow. Main is rechecked immediately before updating Azure, and an in-flight release is not cancelled midway.
5. `infra/deploy.bicep` updates only the Container App using the existing environment, registry and app identity, preserving tags. Its fixed public-demo template is allowed only when live ingress matches the existing unrestricted HTTPS/8080 defaults. Internal ingress, IP allow/deny lists, client certificate requirements, custom domains, extra ports, or other incompatible ingress settings **stop CD**, rather than being cleared. The app is re-read and this guard reruns immediately before applying Bicep. Extend the IaC to preserve those settings through a reviewed change; do not remove access restrictions to make CD pass. It does not reprovision the registry/environment or grant roles. Infrastructure-wide changes still use the original separately approved deployment process.
6. A separate low-privilege smoke job verifies the ready image, live HTTPS and `/build-info.json` commit, then exercises the actual endpoint on desktop/mobile in all three languages, including report precision and refresh-to-reset behavior. It never starts a local fallback server.

The browser smoke job has no Azure OIDC permission. No deployment consumes artifacts or scripts supplied by a pull-request run. A deployment is not reported successful until the live checks pass. Failure leaves a failed Actions run and browser artifacts; it does **not** silently revert, delete resources, change regions/SKUs, or disable HTTPS.

For a retry after setup/RBAC propagation or a failed run, use **Actions -> Deploy Azure demo -> Run workflow**, selecting `main`. Manual runs still require successful CI for the latest main commit. Older commits are intentionally rejected; rollback is a reviewed change on `main` or an explicitly authorized operator operation, not an arbitrary-SHA dispatch.

## Cleanup

Deleting the application resource group removes the app and its scoped role assignment, but not the separate deployment identity group. When CD is no longer needed, an administrator can remove that dedicated group:

```powershell
az group delete --subscription 05205f08-8cae-45d2-bf60-65805d367aa7 --name rg-gh-maturity-demo-ci --yes --no-wait
```

This is destructive and is never executed by CI or CD.
