import { pillars, ratingNames } from './model'
import type { Assessment } from './model'
import { assess, businessCase, level, methodologyVersion, roadmap } from './scoring'
import { contentTranslator, formatDate, formatNumber, formatAssumption, hostingName, planName, platformName, sampleText, translator } from './i18n/core'
import type { Locale } from './i18n/core'

export function reportMarkdown(a: Assessment, locale: Locale = 'en') {
  const r = assess(a)
  const b = businessCase(a)
  const t = translator(locale)
  const c = contentTranslator(locale)
  const safe = (text: string) => text.replace(/[\r\n|]/g, ' ').replace(/[<>]/g, '')
  const userText = (value: string) => safe(sampleText(a.sample, value, locale))
  const score = (value: number | null) => value === null ? t('ui.not_assessed') : `${formatNumber(Math.round(value), locale)}/100`
  const context = {
    platform: platformName(a.platform, locale), hosting: hostingName(a.hosting, locale), plan: planName(a.copilotPlan, locale),
  }
  const heading = (text: string) => `## ${text}`
  return [
    `# ${t('report.title', { customer: safe(a.customer || t('ui.customer')) })}`,
    a.sample ? t('report.synthetic_sample_not_customer_evidence') : '',
    t('report.date', { date: formatDate(a.date, locale), facilitator: userText(a.facilitator || t('ui.not_specified')) }),
    t('report.status', { status: t(r.complete ? 'report.complete_self_reported' : 'report.provisional_incomplete_assessment') }),
    t('report.coverage', { version: methodologyVersion, answered: r.answered, total: r.total, evidence: r.evidence, rated: r.rated }),
    '', heading(t('ui.executive_summary')), '',
    t('report.maturity', { score: r.score === null ? score(null) : `${score(r.score)} - ${c(level(r.score))}` }),
    t('report.readiness', { score: score(r.readinessScore) }),
    t('report.path', { path: c(r.path), rationale: c(r.rationale) }),
    '', heading(t('ui.current_state_maturity')), '',
    t('report.context', { ...context, developers: a.developers ? formatNumber(a.developers, locale) : t('ui.not_specified') }),
    t('report.dependencies', { text: userText(a.dependencies || t('ui.not_yet_documented')) }),
    t('report.constraints', { text: userText(a.constraints || t('ui.not_yet_documented')) }),
    '', heading(t('ui.maturity_by_dimension')), '',
    t('report.dimension_weight_score_level_rated_applicable'),
    '| --- | --- | --- | --- | --- |',
    ...r.results.map(p => `| ${c(p.pillar.name)} | ${p.pillar.weight}% | ${p.score === null ? score(null) : formatNumber(Math.round(p.score), locale)} | ${c(level(p.score))} | ${p.answered}/${p.total} |`),
    '', heading(t('ui.findings_recommendations')), '',
    ...r.findings.map(f => `- **${c(f.priority)} - ${c(f.question.title)}** (${f.rating}/4). ${c(f.question.action)}`),
    ...(r.findings.length ? [] : [t('report.no_scored_gaps_below_managed_validate_reported_controls_with')]),
    ...(r.criticalUnknown.length ? [`- ${t('report.critical_unknown', { text: r.criticalUnknown.map(q => c(q.title)).join('; ') })}`] : []),
    '', heading(t('report.architecture')), '',
    t('report.as_is', context),
    t('report.proposed_target_requires_validation_centrally_governed_identity_and_organizations'),
    t(r.path === 'Hybrid' ? 'report.retain_necessary_boards_server_workloads_and_integrations_behind_documented' : 'report.validate_integrations_hosting_eligibility_and_migration_boundaries_before_changing'),
    '', heading(t('report.roadmap')), '',
    ...roadmap(a).flatMap(w => [
      `### ${t('report.days', { days: w.days, title: c(w.title) })}`, t('report.owner', { owner: c(w.owner) }),
      ...w.actions.map(action => `- ${c(action)}`), t('report.exit', { text: c(w.exit) }), '',
    ]),
    heading(t('ui.pilot_pov_deployment_plan')), '',
    t('report.select_one_representative_team_and_non_critical_workload_baseline'),
    '', heading(t('ui.business_case_licensing_scenario')), '',
    t('report.seats', { seats: a.seats, plan: context.plan }),
    b.annual === null ? t('report.license_cost_not_estimated_enter_a_customer_provided_monthly')
      : t('report.annual', { price: formatAssumption(a.seatCost, locale), annual: formatNumber(b.annual, locale, 2) }),
    b.gross === null ? t('report.productivity_scenario_not_estimated_hours_and_loaded_hourly_rate')
      : t('report.capacity', { gross: formatNumber(b.gross, locale, 2), hours: formatAssumption(a.hoursSaved, locale), rate: formatAssumption(a.hourlyRate, locale), seats: a.seats }),
    t('report.these_are_user_supplied_scenarios_not_a_quote_guaranteed'),
    '', heading(t('report.register')), '',
    ...pillars.flatMap(p => [`### ${c(p.name)}`, ...p.questions.flatMap(q => {
      const answer = a.answers[q.id]
      return [`- **${c(q.title)}**`, t('report.response', { text: !answer || answer.value === null ? t('ui.unanswered') : answer.value === 'na' ? t('ui.not_applicable') : `${answer.value}/4 - ${c(ratingNames[answer.value])}: ${c(q.options[answer.value])}` }),
        t('report.evidence', { text: userText(answer?.evidence || t('ui.not_supplied')) })]
    }), '']),
    heading(t('report.limitations')), '',
    t('report.each_rating_is_0_4_dimension_score_sum_of'),
    t('report.levels_initial_0_20_developing_20_40_defined_40'),
    t('report.readiness_is_the_equally_weighted_mean_of_assessed_governance'),
    t('report.route_precedence_unanswered_critical_controls_or_critical_ratings_below'),
    '', t('report.references_https_docs_github_com_en_enterprise_cloud_latest'),
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
  return customer.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'assessment'
}
