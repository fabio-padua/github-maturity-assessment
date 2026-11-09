import { en } from './i18n/en'
import { allQuestions, isAnswered, maturityLevels, pillars } from './model'
import type { Assessment, Pillar, Question } from './model'
export const methodologyVersion = '1.0'
export function level(score: number | null) {
  if (score === null)
    return en["ui.not_assessed"]
  if (score < 20)
    return maturityLevels[0]
  if (score < 40)
    return maturityLevels[1]
  if (score < 60)
    return maturityLevels[2]
  if (score < 80)
    return maturityLevels[3]
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
export type Finding = {
  question: Question
  pillar: Pillar
  rating: number
  priority: 'Critical' | 'High' | 'Medium'
}
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
    if (!answer || answer.value === null || answer.value === 'na' || answer.value >= 3)
      return []
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
  const path = criticalGaps.length || criticalUnknown.length ? 'Secure DevOps' : a.platform === 'mixed' || a.hosting === 'server' ? 'Hybrid' : a.platform !== 'github' ? 'Migrate' : 'Optimize + Copilot'
  const rationale = criticalGaps.length
    ? en["scoring.establish_critical_identity_credential_pipeline_or_ai_controls_before"] : criticalUnknown.length
    ? en["scoring.critical_control_answers_are_missing_confirm_them_before_selecting"] : path === 'Hybrid'
    ? en["scoring.a_mixed_toolchain_or_server_hosting_requirement_calls_for"] : path === 'Migrate'
    ? en["scoring.your_primary_development_platform_is_outside_github_validate_dependencies"] : en["scoring.build_on_the_github_foundation_strengthen_the_lowest_scoring"]
  return {
    results, score, answered, total: allQuestions.length, rated: rated.length, evidence, complete,
    coverage: Math.round(answered / allQuestions.length * 100), findings, criticalGaps, criticalUnknown,
    readinessScore, path, rationale,
  }
}
export const pathDescriptions = {
  'Optimize + Copilot': en["scoring.improve_the_existing_github_foundation_and_scale_responsible_ai"],
  Hybrid: en["scoring.retain_necessary_systems_integrate_deliberately_and_modernize_in_phases"],
  Migrate: en["scoring.move_validated_workloads_to_github_through_a_pilot_and"],
  'Secure DevOps': en["scoring.establish_critical_controls_before_extending_the_platform_or_ai"],
}
export function roadmap(a: Assessment) {
  const result = assess(a)
  const first = result.findings.slice(0, 3).map(f => f.question.action)
  return [
    { days: '30', title: en["scoring.establish_the_foundation"], owner: en["scoring.platform_lead_security"],
      actions: first.length ? first : [en["scoring.validate_the_reported_controls_with_repository_and_policy_evidence"], en["scoring.confirm_a_sponsor_baseline_and_pilot_team"]],
      exit: en["scoring.critical_gaps_have_owners_current_state_inventory_and_pilot"] },
    { days: '60', title: en["scoring.prove_the_approach"], owner: en["scoring.pilot_team_developer_champions"],
      actions: [
        result.path === 'Migrate' || result.path === 'Hybrid'
          ? en["scoring.rehearse_a_representative_repository_and_pipeline_migration_including_integrations"] : en["scoring.pilot_reusable_delivery_workflows_and_governed_copilot_use_cases"],
        en["scoring.validate_the_target_architecture_against_identity_network_residency_and"],
        en["scoring.compare_adoption_developer_feedback_quality_and_delivery_measures_with"],
      ], exit: en["scoring.pilot_evidence_supports_a_go_no_go_decision_rollback"] },
    { days: '90', title: en["scoring.scale_what_works"], owner: en["scoring.sponsor_platform_owner"],
      actions: [en["scoring.expand_in_readiness_based_waves_with_named_owners_and"], en["scoring.reconcile_licensing_with_active_adoption_and_confirm_commercial_terms"], en["scoring.reassess_maturity_and_prioritize_the_next_improvement_cycle"]],
      exit: en["scoring.expansion_is_approved_against_outcomes_unresolved_risks_and_sustainable"] },
  ]
}
