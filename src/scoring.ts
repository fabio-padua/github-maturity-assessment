import { allQuestions, isAnswered, maturityLevels, pillars } from './model'
import type { Assessment, Pillar, Question } from './model'

export const methodologyVersion = '1.0'
export function level(score: number | null) {
  if (score === null) return 'Not assessed'
  if (score < 20) return maturityLevels[0]
  if (score < 40) return maturityLevels[1]
  if (score < 60) return maturityLevels[2]
  if (score < 80) return maturityLevels[3]
  return maturityLevels[4]
}

export function pillarResult(pillar: Pillar, a: Assessment) {
  const applicable = pillar.questions.filter(q => a.answers[q.id]?.value !== 'na')
  const answered = applicable.filter(q => typeof a.answers[q.id]?.value === 'number')
  const sum = answered.reduce((total, q) => {
    const value = a.answers[q.id].value
    return total + (typeof value === 'number' ? value : 0)
  }, 0)
  const score = answered.length ? sum / (answered.length * 4) * 100 : null
  return { pillar, score, answered: answered.length, total: applicable.length,
    excluded: pillar.questions.length - applicable.length }
}

export type Finding = { question: Question; pillar: Pillar; rating: number; priority: 'Critical' | 'High' | 'Medium' }
export function assess(a: Assessment) {
  const results = pillars.map(p => pillarResult(p, a))
  const scored = results.filter(r => r.score !== null)
  const weight = scored.reduce((sum, r) => sum + r.pillar.weight, 0)
  const score = weight ? scored.reduce((sum, r) => sum + (r.score ?? 0) * r.pillar.weight, 0) / weight : null
  const answered = allQuestions.filter(q => isAnswered(a, q.id)).length
  const applicable = allQuestions.filter(q => a.answers[q.id]?.value !== 'na')
  const rated = applicable.filter(q => typeof a.answers[q.id]?.value === 'number')
  const evidence = rated.filter(q => a.answers[q.id].evidence.trim().length > 0).length
  const findings: Finding[] = allQuestions.flatMap(q => {
    const answer = a.answers[q.id]
    if (!answer || answer.value === null || answer.value === 'na' || answer.value >= 3) return []
    return [{
      question: q, pillar: pillars.find(p => p.questions.some(item => item.id === q.id))!,
      rating: answer.value, priority: q.critical && answer.value < 2 ? 'Critical' : answer.value < 2 ? 'High' : 'Medium',
    } satisfies Finding]
  }).sort((a, b) => {
    const order = { Critical: 0, High: 1, Medium: 2 }
    return order[a.priority] - order[b.priority] || a.rating - b.rating || b.pillar.weight - a.pillar.weight
  })
  const complete = answered === allQuestions.length
  const criticalUnknown = allQuestions.filter(q => q.critical && !isAnswered(a, q.id))
  const criticalGaps = findings.filter(f => f.priority === 'Critical')
  const readiness = results.filter(r => ['governance', 'security', 'change'].includes(r.pillar.id))
  const readinessScored = readiness.filter(r => r.score !== null)
  const readinessScore = readinessScored.length ? readinessScored.reduce((sum, r) => sum + (r.score ?? 0), 0) / readinessScored.length : null
  const path = criticalGaps.length || criticalUnknown.length ? 'Secure DevOps'
    : a.platform === 'mixed' || a.hosting === 'server' ? 'Hybrid'
    : a.platform !== 'github' ? 'Migrate' : 'Optimize + Copilot'
  const rationale = criticalGaps.length
    ? 'Establish critical identity, credential, pipeline, or AI controls before expanding adoption or migrating.'
    : criticalUnknown.length
      ? 'Critical control answers are missing. Confirm them before selecting a modernization path; this is a precautionary recommendation, not a confirmed security finding.'
      : path === 'Hybrid'
        ? 'A mixed toolchain or server-hosting requirement calls for coexistence, validated integrations, and deliberate migration boundaries.'
        : path === 'Migrate'
          ? 'Your primary development platform is outside GitHub. Validate dependencies and constraints, then prove a migration wave before scaling.'
          : 'Build on the GitHub foundation: strengthen the lowest-scoring areas and expand governed Copilot adoption with measurable outcomes.'
  return {
    results, score, answered, total: allQuestions.length, rated: rated.length, evidence, complete,
    coverage: Math.round(answered / allQuestions.length * 100), findings, criticalGaps, criticalUnknown,
    readinessScore, path, rationale,
  }
}

export function businessCase(a: Assessment) {
  const monthly = a.seatCost !== '' ? Number(a.seatCost) * a.seats : null
  const gross = a.hoursSaved !== '' && a.hourlyRate !== ''
    ? Number(a.hoursSaved) * Number(a.hourlyRate) * a.seats * 46 : null
  return { monthly, annual: monthly === null ? null : monthly * 12, gross }
}

export const pathDescriptions = {
  'Optimize + Copilot': 'Improve the existing GitHub foundation and scale responsible AI adoption.',
  Hybrid: 'Retain necessary systems, integrate deliberately, and modernize in phases.',
  Migrate: 'Move validated workloads to GitHub through a pilot and controlled waves.',
  'Secure DevOps': 'Establish critical controls before extending the platform or AI footprint.',
}

export function roadmap(a: Assessment) {
  const result = assess(a)
  const first = result.findings.slice(0, 3).map(f => f.question.action)
  return [
    { days: '30', title: 'Establish the foundation', owner: 'Platform lead + security',
      actions: first.length ? first : ['Validate the reported controls with repository and policy evidence.', 'Confirm a sponsor, baseline, and pilot team.'],
      exit: 'Critical gaps have owners; current-state inventory and pilot success criteria are agreed.' },
    { days: '60', title: 'Prove the approach', owner: 'Pilot team + developer champions',
      actions: [
        result.path === 'Migrate' || result.path === 'Hybrid'
          ? 'Rehearse a representative repository and pipeline migration, including integrations and rollback.'
          : 'Pilot reusable delivery workflows and governed Copilot use cases with a representative cohort.',
        'Validate the target architecture against identity, network, residency, and support requirements.',
        'Compare adoption, developer feedback, quality, and delivery measures with the baseline.',
      ], exit: 'Pilot evidence supports a go/no-go decision; rollback and support ownership are validated.' },
    { days: '90', title: 'Scale what works', owner: 'Sponsor + platform owner',
      actions: ['Expand in readiness-based waves with named owners and support.',
        'Reconcile licensing with active adoption and confirm commercial terms with procurement.',
        'Reassess maturity and prioritize the next improvement cycle.'],
      exit: 'Expansion is approved against outcomes, unresolved risks, and sustainable operational capacity.' },
  ]
}
