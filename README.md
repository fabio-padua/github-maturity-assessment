# GitHub Maturity Assessment

A local-first, consultant-led assessment for **GitHub Enterprise and GitHub Copilot**. Customer answers produce an explainable maturity dashboard, prioritized findings, a modernization-path recommendation, and an exportable action plan.

This is a custom advisory framework, **not an official GitHub assessment, certification, or compliance audit**.

## Public demonstration mode

The Azure deployment configuration builds **memory-only assessments**, with no database, automatic browser persistence, or answer telemetry. Refreshing or closing the page discards demo answers. Use fictional data. Explicit report/JSON downloads still work.

```powershell
npm run dev:demo
npm run build:demo
npm run test:demo
```

`.env.demo` enables `VITE_DEMO_MODE=true` at build time. The ordinary local development/build mode below retains the original consultant-led browser-saving behavior.

**Live Azure demo:** [Open the GitHub maturity assessment](https://ca-gh-maturity-demo-977a.graybay-0e1df60d.eastus2.azurecontainerapps.io/).

## Run locally

Use Node.js 24 LTS or newer.

```powershell
npm ci
npm run dev -- --host 127.0.0.1
```

Open the localhost URL printed by Vite. Choose **Start an assessment** for real customer work or **Explore sample dashboard** for a conspicuously synthetic example.

```powershell
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

For a production-build preview, run `npm run preview -- --host 127.0.0.1`. Vite is a local development/preview server, not a production hosting service.

## Customer workflow

1. Capture the customer, facilitator, platform, hosting target, Copilot plan, dependencies, and constraints.
2. Answer 30 behavior-specific questions across six dimensions. Record evidence or notes; unknown answers remain unanswered. Not-applicable responses require a rationale and cannot exclude critical controls.
3. Review the dashboard, critical-control gaps, and recommended first workstream: **Optimize + Copilot**, **Hybrid**, **Migrate**, or **Secure DevOps**.
4. Review the report: current and proposed architecture, decision matrix, findings, 30/60/90-day roadmap, pilot plan, business-case scenario, and complete response/evidence register.
5. Export JSON backups and Markdown reports, or print the report / save it as PDF using the browser.

Multiple assessments are isolated by identifier. JSON imports are validated and create **new copies**, never silently replacing existing customers. Deletion requires explicit confirmation. In local consultant mode, corrupt storage is preserved for recovery rather than overwritten.

## Scoring

| Dimension | Weight |
| --- | ---: |
| Enterprise & governance | 20% |
| Security & DevSecOps | 20% |
| Delivery & automation | 15% |
| Developer experience | 15% |
| Copilot & responsible AI | 20% |
| Strategy & change readiness | 10% |

Each answer is rated 0–4 using question-specific descriptions.

- **Dimension:** `sum(ratings) / (4 × rated-question count) × 100`.
- **Overall:** weighted mean of dimensions with numeric answers. Excluded dimensions' weights are renormalized.
- **Readiness:** equally weighted mean of assessed Governance, DevSecOps, and Change readiness dimensions.
- **Missing responses are not zero.** Scores remain provisional until every question is answered or justifiably excluded.
- Evidence-only notes are saved without being counted as an answer. Evidence notes are self-reported, not independently verified.
- The radar plots missing dimensions at the center for visualization only; the table and scoring logic preserve their unassessed state.

Levels use unrounded scores: Initial `[0,20)`, Developing `[20,40)`, Defined `[40,60)`, Managed `[60,80)`, and Optimizing `[80,100]`.

### Recommendation precedence

1. Unanswered critical controls or critical ratings below 2 → **Secure DevOps**. Missing controls are explicitly precautionary, not confirmed vulnerabilities.
2. Mixed GitHub/Azure DevOps estate or an Enterprise Server target → **Hybrid**.
3. Primary platform outside GitHub → **Migrate**.
4. Otherwise → **Optimize + Copilot**.

These are transparent advisory heuristics, not an automated architecture approval. Validate regulatory requirements, integration compatibility, hosting and feature eligibility, contracts, implementation capacity, and stakeholder priorities before committing to a target.

### Licensing and business case

Optional inputs use customer-provided USD amounts; no current product price is hardcoded.

- Annual license-only scenario: `proposed seats × monthly seat price × 12`.
- Illustrative gross capacity value: `seats × assumed hours saved per week × loaded hourly rate × 46 working weeks`.

These are scenarios, **not quotes, guaranteed savings, or ROI**. They exclude implementation, support, taxes, and existing licensing overlap. Unspecified inputs produce no estimate. Refer to [current Copilot plans](https://github.com/features/copilot/plans) and confirm commercial terms with procurement.

## Privacy and limitations

- No backend, sign-in, API tokens, analytics, external fonts, or automatic GitHub data collection.
- **Local consultant mode:** answers live in localStorage for this browser profile and origin. They are not encrypted by the app or synchronized. Anyone with access to the profile can read them.
- **Public demo mode:** answers live in memory only, not localStorage or sessionStorage. Refreshing discards them. Existing local-mode saved data is neither read nor overwritten by the demo.
- Do not enter credentials, secrets, or regulated personal data. Treat exports as customer-confidential files.
- In local mode, export a JSON backup before clearing site data. A different browser, host, or port has different storage.
- In local mode, storage errors are visible; export current work if the browser reaches its quota.
- In local mode, editing pauses if another tab changes storage, preventing silent cross-tab overwrites.
- Maximum 200 assessments and 5 MB per imported file in both modes. Actual browser storage limits may be lower in local mode.
- This first version is intended for facilitated sessions, not a hosted multi-tenant customer portal.
- Interface, questionnaire, recommendations, methodology, errors, and reports are available in English, Brazilian Portuguese, and Spanish. Server-backed customer collaboration remains outside scope.

## Languages and translation maintenance

Open the **user preferences menu** beside the avatar in the top bar and select **English**, **Português (Brasil)**, or **Español**. Language changes apply immediately without resetting answers, notes, or scores. Markdown exports and printed/PDF reports use the current language; JSON exports preserve the language-independent assessment schema and the customer's original input.

The locale is kept in the URL (`?lang=en`, `?lang=pt-BR`, `?lang=es`), not browser storage. Reloading preserves the language choice while **demo answers still disappear**. English is the default; dates and currency presentation use `Intl`, with prices remaining in USD (no currency conversion).

- `src/i18n/en.ts` is the canonical copy catalog and defines the stable `MessageKey` union. Change wording there without renaming its key.
- `src/i18n/pt-BR.ts` and `src/i18n/es.ts` must implement every key with `satisfies Record<MessageKey, string>`; missing or misspelled keys fail the build.
- Use `useI18n().t(key, values)` for React copy and `translator(locale)` outside React. Keep whole messages with `{namedPlaceholders}` where ordering or counts matter; never concatenate translated fragments for new copy. Supply separate singular/plural messages.
- Format entered prices, hours, and hourly rates with `formatAssumption` (or `useI18n().assumption`) to preserve every supplied fractional digit, including trailing zeros. Use `formatNumber`/`formatMoney` with explicit rounding only for calculated totals; do not convert decimal assumption strings to `Number` for display.
- Question IDs, option indices, platform values, scoring rules, and JSON field names must never be translated. The model references canonical catalog copy; the display adapter localizes that copy without mutating customer records.
- Never send customer names, notes, or free text to a translation service. Only built-in synthetic sample text is localized; customer-authored content stays untouched.
- When adding a language, extend `locales`, `languageNames`, `catalogs`, and `resolveLocale` in `src/i18n/core.ts`, add its complete catalog, and extend the browser scenarios.
- `npm test` checks catalog parity, placeholders/whitespace, all question/answer/roadmap copy, and localized exports. `npm run test:e2e` and `npm run test:demo` exercise language switching and preservation on desktop/mobile.

## Project layout

`src/model.ts` contains the typed question bank and synthetic example. `src/scoring.ts` owns scoring, route selection, and roadmap generation. `src/storage.ts` validates persisted/imported data. `src/report.ts` generates portable reports. `src/App.tsx` provides the assessment workspace.

React + TypeScript + Vite. Vitest covers scoring, validation, and reports. Playwright covers the actual customer workflow, export/import, persistence, corrupt-storage handling, and responsive layouts on desktop and mobile.

`infra/` packages the demo using Node 24 and non-root Nginx on port 8080. Bicep defines a Consumption Container App (0.25 vCPU, 0.5 GiB, zero to one replica), a Basic private registry, and a user-assigned managed identity with registry-scoped AcrPull. No database or application telemetry is provisioned. The image build sets `VITE_DEMO_MODE=true`; normal local builds do not.

## Azure deployment

The public demo runs in the **MCAPS-Hybrid-REQ-46931-2022-fabiopadua** subscription, resource group `rg-gh-maturity-demo-977a`, in **East US 2**. Images are built remotely in ACR; local Docker is not required. Registry admin credentials are disabled, and the app pulls images with managed identity.

Estimated cost is **US$5-6/month at low demo traffic**, not a spending cap. The Basic registry remains billable while compute scales to zero. Build compute, excess storage, egress, taxes, and unexpected traffic are excluded. Initial requests after idling may have a cold start.

### Continuous deployment

`.github/workflows/deploy.yml` deploys the **latest successful `main` CI commit**, never a PR build. It uses OIDC, a separate managed identity, uniquely tagged ACR builds and immutable image digests, then checks the live build commit and all three language workflows on desktop/mobile. Deployments are serialized; main is rechecked before updating the Container App.

**One-time administrator configuration is required before the first deployment.** Follow [.azure/pipeline-setup.md](.azure/pipeline-setup.md) and review `scripts/setup-azure-auth-for-pipeline.ps1`. The script creates only the dedicated deployment identity and scoped permissions, and sets repository Actions variables. It is not run by opening this PR, CI, or CD. No passwords are required. Missing configuration fails explicitly.

The current private personal repository is on GitHub Free: this enables automated deployment after CI but does **not** enforce PR/review or paid deployment-environment approvals. The setup documentation explains the main-ref federation and upgrade path.

To retry after setup or a failed deployment, dispatch **Deploy Azure demo** from `main`; successful CI for the latest main commit is still required. `npm run test:deployment` validates deployment gates and metadata handling. Set `$env:ASSESSMENT_URL = 'https://...'` in PowerShell, then run `npm run test:deployed` to exercise an already deployed site; it never starts a local fallback server.

### Manual operator deployment

After committing code changes, an authorized operator can still redeploy from the repository root in PowerShell:

```powershell
$sub = '05205f08-8cae-45d2-bf60-65805d367aa7'
$registry = 'crghmaturitydemo977a'
$tag = git rev-parse HEAD
$deployedBy = az account show --subscription $sub --query user.name -o tsv
az acr build --subscription $sub --registry $registry --image "github-maturity-assessment:$tag" --image github-maturity-assessment:demo --file infra\Dockerfile --build-arg "SOURCE_SHA=$tag" . --no-logs
if ($LASTEXITCODE -ne 0) { throw 'Image build failed; deployment not started.' }
az deployment sub create --subscription $sub --location eastus2 --template-file infra\main.bicep --parameters '@infra\main.parameters.json' "containerImage=${registry}.azurecr.io/github-maturity-assessment:$tag" "deployedBy=$deployedBy" 'createdAt=2026-10-29T16:18:33.2653722Z' --name gh-maturity-demo-code --query properties.provisioningState -o tsv
```

Keep the real image parameter on every deployment. `infra/main.parameters.json` is pinned to the initially deployed SHA image; the command above overrides it with the new commit. The generic Bicep default placeholder is only for first-time infrastructure bootstrapping.

The image publishes `build-info.json` with its source commit for live verification. Automated CD uses only `infra/deploy.bicep`, updating the existing Container App without reprovisioning the environment/registry or assigning roles. The operator command above reapplies the whole infrastructure and needs broader permissions; it is not the CD identity's deployment path. If Docker is built locally without `SOURCE_SHA`, the metadata is marked `unknown`, which automated smoke checks reject.

Delete the dedicated demo resource group when no longer needed; this permanently removes the app, environment, registry images, and managed identity:

```powershell
az group delete --subscription 05205f08-8cae-45d2-bf60-65805d367aa7 --name rg-gh-maturity-demo-977a --yes --no-wait
```

## Reference material

- [GitHub Enterprise administration](https://docs.github.com/en/enterprise-cloud@latest/admin)
- [GitHub Copilot documentation](https://docs.github.com/en/copilot)
- The supplied modernization-assessment image informed the current-state → readiness → deliverables → journey structure.
