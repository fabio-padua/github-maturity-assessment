import { pillars, ratingNames } from './model'
import type { Assessment } from './model'
import { assess, businessCase, level, methodologyVersion, roadmap } from './scoring'

export function reportMarkdown(a: Assessment) {
  const r = assess(a)
  const b = businessCase(a)
  const safe = (text: string) => text.replace(/[\r\n|]/g, ' ').replace(/[<>]/g, '')
  return [
    `# GitHub maturity assessment: ${safe(a.customer || 'Unnamed customer')}`,
    a.sample ? '**SYNTHETIC SAMPLE - not customer evidence.**' : '',
    `Date: ${a.date} | Facilitator: ${safe(a.facilitator || 'Not specified')}`,
    `Status: ${r.complete ? 'Complete, self-reported' : 'PROVISIONAL - incomplete assessment'}`,
    `Methodology: ${methodologyVersion} | Responses: ${r.answered}/${r.total} | Evidence notes: ${r.evidence}/${r.rated}`,
    '', '## Executive summary', '',
    `Maturity: ${r.score === null ? 'Not assessed' : `${Math.round(r.score)}/100 - ${level(r.score)}`}.`,
    `Readiness: ${r.readinessScore === null ? 'Not assessed' : `${Math.round(r.readinessScore)}/100`}.`,
    `Recommended path: **${r.path}**. ${r.rationale}`,
    '', '## Current state', '',
    `Primary platform: ${a.platform}. Hosting target: ${a.hosting}. Developers: ${a.developers || 'Not specified'}. Copilot plan: ${a.copilotPlan}.`,
    `Dependencies: ${safe(a.dependencies || 'Not documented')}`,
    `Constraints: ${safe(a.constraints || 'Not documented')}`,
    '', '## Maturity by dimension', '',
    '| Dimension | Weight | Score | Level | Rated / applicable |',
    '| --- | --- | --- | --- | --- |',
    ...r.results.map(p => `| ${p.pillar.name} | ${p.pillar.weight}% | ${p.score === null ? 'Not assessed' : Math.round(p.score)} | ${level(p.score)} | ${p.answered}/${p.total} |`),
    '', '## Findings & recommendations', '',
    ...r.findings.map(f => `- **${f.priority} - ${f.question.title}** (${f.rating}/4). ${f.question.action}`),
    ...(r.findings.length ? [] : ['No scored gaps below Managed. Validate reported controls with evidence; missing answers are not evidence of maturity.']),
    ...(r.criticalUnknown.length ? [`- Unanswered critical controls: ${r.criticalUnknown.map(q => q.title).join('; ')}`] : []),
    '', '## Architecture: as-is to to-be', '',
    `As-is: ${a.platform} development platform; ${a.hosting} hosting target; ${a.copilotPlan} Copilot plan.`,
    'Proposed target (requires validation): centrally governed identity and organizations -> reviewed repositories -> reusable CI/CD -> protected environments; governed Copilot supports developers across the workflow.',
    r.path === 'Hybrid' ? 'Retain necessary boards, server workloads, and integrations behind documented ownership and integration boundaries.' : 'Validate integrations, hosting eligibility, and migration boundaries before changing production workloads.',
    '', '## 30/60/90-day roadmap', '',
    ...roadmap(a).flatMap(w => [`### First ${w.days} days: ${w.title}`, `Suggested owner: ${w.owner}`, ...w.actions.map(action => `- ${action}`), `Exit criteria: ${w.exit}`, '']),
    '## Pilot / POV deployment plan', '',
    'Select one representative team and non-critical workload. Baseline developer friction, delivery quality, and adoption. Agree on identity, data handling, rollback, support, and go/no-go criteria before enabling tools. Review evidence at day 60 before expanding.',
    '', '## Business case & licensing scenario', '',
    `Proposed Copilot seats: ${a.seats}. Plan: ${a.copilotPlan}.`,
    b.annual === null ? 'License cost not estimated: enter a customer-provided monthly seat price.'
      : `Customer-provided seat price: ${a.seatCost} USD/month. Annual license-only scenario: ${b.annual.toFixed(2)} USD.`,
    b.gross === null ? 'Productivity scenario not estimated: hours and loaded hourly rate have not both been supplied.'
      : `Illustrative gross capacity value: ${b.gross.toFixed(2)} USD/year, assuming ${a.hoursSaved} hours/seat/week, ${a.hourlyRate} USD/hour, ${a.seats} seats, and 46 working weeks.`,
    'These are user-supplied scenarios, not a quote, guaranteed savings, or ROI. They exclude implementation, support, taxes, and existing licensing overlap. Confirm plan capabilities and commercial terms with procurement.',
    '', '## Response and evidence register', '',
    ...pillars.flatMap(p => [`### ${p.name}`, ...p.questions.flatMap(q => {
      const answer = a.answers[q.id]
      return [`- **${q.title}**`, `  Response: ${!answer || answer.value === null ? 'Unanswered' : answer.value === 'na' ? 'Not applicable' : `${answer.value}/4 - ${ratingNames[answer.value]}: ${q.options[answer.value]}`}`,
        `  Evidence / rationale: ${safe(answer?.evidence || 'Not supplied')}`]
    }), '']),
    '## Methodology & limitations', '',
    'Each rating is 0-4. Dimension score = sum of rated answers / (4 x rated-answer count) x 100. Overall score = weighted mean of dimensions with rated answers; excluded dimension weights are renormalized. Missing answers are not zero and make the result provisional. Not-applicable answers are excluded, require a rationale, and are forbidden for critical controls.',
    'Levels: Initial [0,20), Developing [20,40), Defined [40,60), Managed [60,80), Optimizing [80,100]. Level thresholds use unrounded scores.',
    'Readiness is the equally weighted mean of assessed Governance, DevSecOps, and Change readiness dimensions. Evidence notes are self-reported, not independently verified. This is a custom advisory framework, not an official GitHub certification or benchmark.',
    'Route precedence: unanswered critical controls or critical ratings below 2 -> Secure DevOps; mixed platform or server target -> Hybrid; non-GitHub primary platform -> Migrate; otherwise -> Optimize + Copilot. Scores do not override critical risks.',
    '', 'References: https://docs.github.com/en/enterprise-cloud@latest/admin | https://docs.github.com/en/copilot | https://github.com/features/copilot/plans',
  ].join('\n')
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function fileStem(customer: string) {
  return customer.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'assessment'
}
