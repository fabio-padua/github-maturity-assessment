export type Rating = 0 | 1 | 2 | 3 | 4
export type Answer = { value: Rating | 'na' | null; evidence: string }
export type Platform = 'github' | 'azure-devops' | 'mixed' | 'other'
export type Assessment = {
  id: string
  customer: string
  facilitator: string
  date: string
  platform: Platform
  hosting: 'cloud' | 'server' | 'undecided'
  copilotPlan: 'none' | 'business' | 'enterprise' | 'undecided'
  developers: number
  dependencies: string
  constraints: string
  seats: number
  seatCost: string
  hoursSaved: string
  hourlyRate: string
  answers: Record<string, Answer>
  sample: boolean
  updatedAt: string
}

export type Question = {
  id: string
  title: string
  why: string
  options: [string, string, string, string, string]
  action: string
  evidence: string
  critical?: boolean
}
export type Pillar = {
  id: string
  name: string
  short: string
  weight: number
  description: string
  color: string
  questions: Question[]
}

export const pillars: Pillar[] = [
  {
    id: 'governance', name: 'Enterprise & governance', short: 'Governance', weight: 20,
    description: 'A controlled foundation for your organizations, identities, and repositories.', color: '#58a6ff',
    questions: [
      { id: 'identity', title: 'How is access to your development platform managed?', why: 'Central identity and joiner/mover/leaver controls reduce unauthorized access.',
        options: ['Individual accounts; no consistent access policy', 'Documented access guidelines, applied manually', 'SSO and MFA enforced for most users', 'SSO, MFA, and automated provisioning enforced', 'Lifecycle controls continuously reviewed and audited'], critical: true,
        action: 'Enforce SSO and MFA, define a joiner/mover/leaver process, and validate account deprovisioning.', evidence: 'Identity policy, SSO configuration, recent access review' },
      { id: 'ownership', title: 'How clearly are organizations and repositories owned?', why: 'Ownership connects platform decisions to accountable people.',
        options: ['No reliable inventory or ownership', 'Partial inventory; ownership is informal', 'Most repositories have owners and a purpose', 'Complete inventory, ownership, and lifecycle policies', 'Ownership and lifecycle compliance monitored automatically'],
        action: 'Create a repository inventory with owners, purpose, sensitivity, and lifecycle status.', evidence: 'Repository inventory, ownership matrix' },
      { id: 'policies', title: 'How are repository standards enforced?', why: 'Consistent guardrails make safe delivery repeatable.',
        options: ['No common standards', 'Standards documented but optional', 'Branch rules and reviews on important repositories', 'Organization-wide rulesets and reusable templates', 'Policy-as-code with exceptions, monitoring, and review'],
        action: 'Pilot shared rulesets for reviews, protected branches, and controlled exceptions.', evidence: 'Rulesets, repository templates, exception register' },
      { id: 'audit', title: 'How are platform activity and permissions reviewed?', why: 'Auditability is needed to investigate incidents and demonstrate control.',
        options: ['Logs and permissions are not reviewed', 'Ad hoc investigation when issues occur', 'Scheduled access reviews and retained audit logs', 'Audit logs integrated with monitoring and named owners', 'Automated detection, response, and control evidence'],
        action: 'Assign an audit owner, set retention requirements, and schedule access reviews.', evidence: 'Audit retention policy, SIEM integration, access reviews' },
      { id: 'licensing', title: 'How are GitHub and Copilot licenses governed?', why: 'License ownership and utilization make commercial planning credible.',
        options: ['Seat counts and owners are unknown', 'Seats tracked manually without utilization reviews', 'Owners and periodic seat reconciliation established', 'Utilization and allocation reviewed with procurement', 'Forecasting and ongoing optimization tied to adoption'],
        action: 'Reconcile assigned seats, active use, plan eligibility, and procurement ownership.', evidence: 'Seat inventory, utilization report, purchasing agreement' },
    ],
  },
  {
    id: 'security', name: 'Security & DevSecOps', short: 'DevSecOps', weight: 20,
    description: 'Security controls that protect code, credentials, and the software supply chain.', color: '#3dd6c6',
    questions: [
      { id: 'secrets', title: 'How are exposed secrets prevented and remediated?', why: 'Leaked credentials can bypass otherwise strong platform controls.',
        options: ['No scanning or response process', 'Manual checks and ad hoc credential rotation', 'Secret scanning and an owned response process', 'Push protection and rotation workflows broadly applied', 'Coverage and response times continuously monitored'], critical: true,
        action: 'Enable supported secret scanning and push protection, then rehearse revocation and rotation.', evidence: 'Scanning coverage, push-protection settings, response runbook' },
      { id: 'code-security', title: 'How is code analyzed for vulnerabilities?', why: 'Analysis only creates value when findings reach remediation.',
        options: ['No systematic code analysis', 'Occasional manual or tool-based reviews', 'Automated analysis for critical repositories', 'Analysis in pull requests with owned remediation SLAs', 'Risk-based coverage and remediation performance tracked'],
        action: 'Pilot code scanning on critical repositories and assign risk-based remediation owners.', evidence: 'Code-scanning configuration, triage workflow, SLA' },
      { id: 'dependencies', title: 'How are vulnerable dependencies managed?', why: 'Third-party components are part of your production risk.',
        options: ['Dependencies not inventoried or monitored', 'Manual checks during releases', 'Automated alerts and an assigned triage owner', 'Automated update PRs with tested remediation workflows', 'Supply-chain policy, provenance, and measurable SLAs'],
        action: 'Inventory dependencies, enable alerts and update automation, and prioritize exploitable findings.', evidence: 'Dependency alerts, update configuration, remediation backlog' },
      { id: 'pipeline-security', title: 'How are CI/CD credentials and execution protected?', why: 'Build systems often have privileged paths to production.',
        options: ['Shared long-lived credentials and unrestricted runners', 'Some credentials scoped; runner controls inconsistent', 'Scoped permissions, protected environments, managed secrets', 'Short-lived federation and hardened runner boundaries', 'Trust boundaries and provenance continuously verified'], critical: true,
        action: 'Reduce workflow permissions, protect deployment environments, and adopt short-lived federation where supported.', evidence: 'Workflow permissions, runner topology, environment rules' },
      { id: 'incident', title: 'How ready is the team to respond to a code-platform incident?', why: 'A clear response plan reduces the impact of a security event.',
        options: ['No response ownership or runbook', 'Owners identified; response is improvised', 'Documented runbooks and escalation paths', 'Regular exercises with recovery and communication plans', 'Exercises and incidents feed measured improvements'],
        action: 'Write and exercise a platform incident runbook covering credential exposure and compromised automation.', evidence: 'Runbook, exercise notes, recovery objectives' },
    ],
  },
  {
    id: 'delivery', name: 'Delivery & automation', short: 'Delivery', weight: 15,
    description: 'Repeatable pipelines and safe, observable paths from a change to production.', color: '#a58aff',
    questions: [
      { id: 'ci', title: 'How consistently are builds and tests automated?', why: 'Repeatable validation is the baseline for reliable delivery.',
        options: ['Builds and tests mostly manual', 'Automation exists for a few teams', 'Most active repositories run CI for pull requests', 'Reusable, maintained CI workflows used broadly', 'CI quality, speed, and coverage measured and improved'],
        action: 'Create a reusable pull-request build and test workflow and pilot it with representative teams.', evidence: 'Pipeline inventory, test runs, reusable workflows' },
      { id: 'deployment', title: 'How safe and repeatable are production deployments?', why: 'Controlled deployments reduce release risk without adding manual bottlenecks.',
        options: ['Manual, undocumented deployments', 'Scripts exist but differ by team', 'Automated deployments with approval and rollback steps', 'Standard environments and tested rollback strategies', 'Progressive delivery with measured recovery and reliability'],
        action: 'Document deployment environments, approvals, and rollback; automate a representative service.', evidence: 'Deployment workflow, environment gates, rollback drill' },
      { id: 'artifacts', title: 'How are build artifacts and environments managed?', why: 'Traceable artifacts help teams reproduce and trust releases.',
        options: ['Artifacts and environments managed ad hoc', 'Shared storage and manually tracked versions', 'Versioned artifacts and documented environment setup', 'Infrastructure-as-code and controlled artifact promotion', 'Provenance, reproducibility, and lifecycle policy enforced'],
        action: 'Standardize versioned artifacts and reproducible environment definitions.', evidence: 'Registry, infrastructure definitions, promotion policy' },
      { id: 'delivery-metrics', title: 'How is delivery performance understood?', why: 'Baseline metrics are needed to demonstrate modernization outcomes.',
        options: ['No delivery baseline', 'Anecdotal feedback and manual reporting', 'Lead time, frequency, failure, and recovery baselined', 'Metrics reviewed regularly with team-level actions', 'Trends guide experiments with business outcome checks'],
        action: 'Baseline delivery flow and reliability measures without using them to rank individuals.', evidence: 'Delivery metrics, baseline period, improvement review' },
      { id: 'integrations', title: 'How well are platform integrations and migration dependencies understood?', why: 'Hidden dependencies can make a straightforward migration complex.',
        options: ['Integrations and dependencies unknown', 'Some dependencies known by individual teams', 'Inventory includes boards, pipelines, packages, and identity', 'Criticality, owners, and migration tests documented', 'Dependencies validated with rehearsals and rollback plans'],
        action: 'Map boards, pipelines, packages, identity, and external integrations before choosing a migration wave.', evidence: 'Integration map, compatibility findings, migration rehearsal' },
    ],
  },
  {
    id: 'experience', name: 'Developer experience', short: 'Developer experience', weight: 15,
    description: 'A productive, collaborative development workflow that teams can actually adopt.', color: '#ffb86b',
    questions: [
      { id: 'onboarding', title: 'How predictable is developer onboarding?', why: 'Onboarding friction reveals gaps in access, environments, and documentation.',
        options: ['Setup depends on individual help', 'Team-specific setup notes exist', 'Maintained onboarding checklist and environment guide', 'Self-service access and reproducible development setup', 'Time-to-first-change measured and systematically reduced'],
        action: 'Create a maintained onboarding path and measure time to the first successful change.', evidence: 'Onboarding guide, setup scripts, developer feedback' },
      { id: 'collaboration', title: 'How consistently do teams collaborate through pull requests?', why: 'Review quality depends on shared expectations, not just enabling a feature.',
        options: ['Changes often bypass peer review', 'Reviews used inconsistently', 'Pull requests, owners, and review expectations established', 'Small changes and review turnaround actively supported', 'Review quality and flow continuously improved'],
        action: 'Agree on code ownership, pull-request templates, review expectations, and small-change practices.', evidence: 'Pull requests, CODEOWNERS, review working agreement' },
      { id: 'planning', title: 'How traceable is work from planning to delivery?', why: 'Teams need a coherent view across issues, boards, code, and releases.',
        options: ['Work tracked in disconnected places', 'Team boards exist without consistent links to code', 'Issues and changes linked with clear acceptance criteria', 'Cross-team dependencies and release views maintained', 'Outcome feedback shapes prioritization and work in progress'],
        action: 'Connect work items to changes and releases, including any retained Azure Boards workflow.', evidence: 'Project boards, linked issues and PRs, release notes' },
      { id: 'templates', title: 'How easily can teams reuse proven engineering patterns?', why: 'Supported paved roads reduce duplication without removing team autonomy.',
        options: ['Each team starts from scratch', 'Informal snippets shared between developers', 'Maintained repository templates and guidance', 'Supported self-service templates and inner-source reuse', 'Adoption and feedback inform a maintained platform offering'],
        action: 'Publish supported starter repositories with tests, ownership, and contribution guidance.', evidence: 'Templates, shared components, contribution model' },
      { id: 'feedback', title: 'How is developer friction identified and addressed?', why: 'Developer feedback is necessary to distinguish tool adoption from actual improvement.',
        options: ['No structured developer feedback', 'Occasional informal feedback', 'Regular surveys and a visible improvement backlog', 'Feedback combined with workflow and adoption signals', 'Closed-loop improvements measured with affected teams'],
        action: 'Establish a lightweight developer-feedback baseline and prioritize the top friction points.', evidence: 'Survey, friction backlog, completed improvements' },
    ],
  },
  {
    id: 'copilot', name: 'Copilot & responsible AI', short: 'Copilot', weight: 20,
    description: 'Governed AI adoption, practical enablement, and evidence of developer value.', color: '#d399ff',
    questions: [
      { id: 'ai-policy', title: 'How is AI-assisted development governed?', why: 'A rollout needs approved usage boundaries and human accountability.',
        options: ['No approved AI policy', 'Informal guidance or isolated approvals', 'Documented acceptable use, privacy, and review requirements', 'Centrally managed policies and approved tool configuration', 'Policy effectiveness reviewed with security and legal'], critical: true,
        action: 'Agree on AI acceptable use, data handling, approved tools, and mandatory human review.', evidence: 'AI policy, security/legal approval, organization settings' },
      { id: 'ai-rollout', title: 'How far has the Copilot rollout progressed?', why: 'A deliberate pilot builds evidence before expanding access.',
        options: ['Not deployed', 'Small informal trial', 'Sponsored pilot with cohorts and success criteria', 'Phased rollout with license and usage governance', 'Sustained adoption with ongoing cohort improvements'],
        action: 'Launch a sponsored Copilot pilot with named cohorts, baseline measures, and expansion criteria.', evidence: 'Pilot charter, seat assignments, rollout plan' },
      { id: 'ai-skills', title: 'How prepared are developers to use Copilot effectively?', why: 'Value depends on task selection, context, verification, and new working habits.',
        options: ['No enablement', 'Introductory demos only', 'Hands-on training on relevant tasks and verification', 'Role-specific learning, champions, and office hours', 'Ongoing enablement informed by usage and feedback'],
        action: 'Run hands-on Copilot workshops using real workflows, testing, and output verification.', evidence: 'Training material, attendance, champion network' },
      { id: 'ai-workflows', title: 'How is AI assistance integrated into engineering workflows?', why: 'Workflow adoption is more meaningful than access to a tool.',
        options: ['No defined use cases', 'Occasional completion or chat usage', 'Documented use cases for code, tests, and explanation', 'Approved IDE and repository workflows with review gates', 'Workflow experiments evaluated for quality and usefulness'],
        action: 'Prioritize repeatable AI use cases and retain tests, reviews, and security gates.', evidence: 'Use-case catalog, working examples, review guidance' },
      { id: 'ai-value', title: 'How is Copilot value evaluated?', why: 'Usage alone does not demonstrate productivity, quality, or business impact.',
        options: ['No baseline or success measures', 'Anecdotes or assigned-seat counts only', 'Usage, satisfaction, and workflow baselines collected', 'Cohorts reviewed against quality and delivery outcomes', 'Evidence guides expansion without individual surveillance'],
        action: 'Baseline adoption, satisfaction, quality, and delivery outcomes; review pilot cohorts regularly.', evidence: 'Baseline, cohort report, adoption and quality measures' },
    ],
  },
  {
    id: 'change', name: 'Strategy & change readiness', short: 'Change readiness', weight: 10,
    description: 'The sponsorship, capacity, and operating model to make modernization stick.', color: '#76c893',
    questions: [
      { id: 'sponsor', title: 'How strong is sponsorship for modernization?', why: 'Platform change needs a decision maker and a measurable reason to act.',
        options: ['No sponsor or shared goal', 'Interest exists but no accountable sponsor', 'Named sponsor and agreed business objectives', 'Funded program with decision cadence and owners', 'Outcomes reviewed and investment adapted'],
        action: 'Name a sponsor and agree on measurable modernization outcomes and decision owners.', evidence: 'Sponsor, charter, agreed outcomes' },
      { id: 'capacity', title: 'Is there capacity to implement and operate the changes?', why: 'Readiness includes people and time, not only technical compatibility.',
        options: ['No identified capacity', 'Work expected to happen alongside existing duties', 'Named implementation and operational owners', 'Allocated capacity, skills plan, and support model', 'Capacity and support effectiveness reviewed continuously'],
        action: 'Allocate implementation capacity and define the platform support and operating model.', evidence: 'Team allocation, responsibilities, support model' },
      { id: 'constraints', title: 'How well are regulatory, residency, and hosting constraints understood?', why: 'Some requirements determine which target platforms are viable.',
        options: ['Constraints unknown', 'Assumptions exist but are not validated', 'Documented requirements reviewed by relevant stakeholders', 'Requirements mapped to target architecture and controls', 'Controls and exceptions validated with recurring evidence'],
        action: 'Validate regulatory, residency, network, and hosting constraints before committing to a target.', evidence: 'Requirements register, architecture review, approvals' },
      { id: 'adoption', title: 'How will teams be supported through the change?', why: 'Migration completion is not the same as adoption.',
        options: ['No communication or adoption plan', 'Launch communication only', 'Team engagement, training, and support plan', 'Champions and phased adoption with feedback channels', 'Adoption barriers measured and addressed continuously'],
        action: 'Create a stakeholder communication plan, champion network, and feedback-driven rollout.', evidence: 'Communication plan, training schedule, support channels' },
      { id: 'roadmap', title: 'How actionable is the modernization roadmap?', why: 'An achievable sequence connects dependencies, value, and readiness.',
        options: ['No roadmap', 'Unprioritized list of ideas', 'Prioritized milestones with owners and dependencies', 'Pilot, migration waves, rollback, and success criteria agreed', 'Roadmap evolves from measured outcomes and risks'],
        action: 'Agree on a 30/60/90-day plan with a pilot, owners, dependencies, and exit criteria.', evidence: 'Roadmap, pilot plan, decision log' },
    ],
  },
]

export const allQuestions = pillars.flatMap(p => p.questions)
export const maturityLevels = ['Initial', 'Developing', 'Defined', 'Managed', 'Optimizing'] as const
export const ratingNames = ['Not established', 'Ad hoc', 'Defined', 'Managed', 'Optimizing']

export function isAnswered(a: Assessment, id: string) {
  const answer = a.answers[id]
  return answer !== undefined && answer.value !== null
}

export function newAssessment(): Assessment {
  return {
    id: crypto.randomUUID(), customer: '', facilitator: '', date: new Date().toISOString().slice(0, 10),
    platform: 'github', hosting: 'undecided', copilotPlan: 'undecided', developers: 0,
    dependencies: '', constraints: '', seats: 0, seatCost: '', hoursSaved: '', hourlyRate: '',
    answers: {}, sample: false, updatedAt: new Date().toISOString(),
  }
}

export function exampleAssessment(): Assessment {
  const assessment = newAssessment()
  const ratings: Rating[] = [3, 3, 2, 2, 2, 2, 2, 3, 1, 2, 3, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 2, 1, 2, 1, 3, 2, 3, 2, 2]
  return {
    ...assessment, customer: 'Northstar Engineering', facilitator: 'Sample facilitator', platform: 'mixed',
    hosting: 'cloud', copilotPlan: 'business', developers: 240, seats: 80, sample: true,
    dependencies: 'Azure Boards retained for portfolio planning. Eight production pipelines require migration rehearsal.',
    constraints: 'Security approval required before expanding AI use. Identity remains managed centrally.',
    answers: Object.fromEntries(allQuestions.map((q, i) => [q.id, {
      value: ratings[i], evidence: 'Illustrative response only. Replace with evidence gathered during a customer session.',
    }])),
  }
}
