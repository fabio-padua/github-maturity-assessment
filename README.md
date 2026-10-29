# GitHub Maturity Assessment

A local-first, consultant-led assessment for **GitHub Enterprise and GitHub Copilot**. Customer answers produce an explainable maturity dashboard, prioritized findings, a modernization-path recommendation, and an exportable action plan.

This is a custom advisory framework, **not an official GitHub assessment, certification, or compliance audit**.

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

Multiple assessments are isolated by identifier. JSON imports are validated and create **new copies**, never silently replacing existing customers. Deletion requires explicit confirmation. Corrupt storage is preserved for recovery rather than overwritten.

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
- Answers live in **localStorage for this browser profile and origin**. They are not encrypted by the app or synchronized. Anyone with access to the profile can read them.
- Do not enter credentials, secrets, or regulated personal data. Treat exports as customer-confidential files.
- Export a JSON backup before clearing site data. A different browser, host, or port has different storage.
- Storage errors are visible; export current work if the browser reaches its quota.
- Editing pauses if another tab changes storage, preventing silent cross-tab overwrites.
- Maximum 200 assessments and 5 MB per imported file. Actual browser storage limits may be lower.
- This first version is intended for facilitated sessions, not a hosted multi-tenant customer portal.
- Interface and questionnaire are English. Portuguese localization and server-backed customer collaboration are future product decisions.

## Project layout

`src/model.ts` contains the typed question bank and synthetic example. `src/scoring.ts` owns scoring, route selection, and roadmap generation. `src/storage.ts` validates persisted/imported data. `src/report.ts` generates portable reports. `src/App.tsx` provides the assessment workspace.

React + TypeScript + Vite. Vitest covers scoring, validation, and reports. Playwright covers the actual customer workflow, export/import, persistence, corrupt-storage handling, and responsive layouts on desktop and mobile.

## Reference material

- [GitHub Enterprise administration](https://docs.github.com/en/enterprise-cloud@latest/admin)
- [GitHub Copilot documentation](https://docs.github.com/en/copilot)
- The supplied modernization-assessment image informed the current-state → readiness → deliverables → journey structure.
