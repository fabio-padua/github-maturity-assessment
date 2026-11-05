import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { exampleAssessment, isAnswered, newAssessment } from './model'
import type { Assessment, Rating } from './model'
import { businessCase, methodologyVersion } from './scoring'
import { demoMode, loadSnapshot, parseSnapshot, storageKey } from './storage'
import type { Snapshot } from './storage'
import { download, fileStem, reportMarkdown } from './report'
import './App.css'
import { useI18n } from './i18n/I18n'
import { UserMenu } from './UserMenu'
import { AssessmentError, errorMessage, formatMessage, message as m } from './i18n/core'
import type { Message } from './i18n/core'
type View = 'overview' | 'assessment' | 'report' | 'library' | 'methodology'
type IconName = 'grid' | 'list' | 'report' | 'folder' | 'info' | 'arrow' | 'check' | 'download' | 'plus' | 'github' | 'shield' | 'spark' | 'upload' | 'trash'
const iconPaths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  list: <><path d="M9 5h12M9 12h12M9 19h12"/><path d="m3 5 1 1 2-2m-3 8 1 1 2-2m-3 8 1 1 2-2"/></>,
  report: <><path d="M14 2H5v20h14V7Z"/><path d="M14 2v6h6M8 12h8M8 16h6"/></>,
  folder: <path d="M3 7V4h7l3 3h8v13H3Z"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
  plus: <path d="M12 4v16M4 12h16"/>,
  github: <><path d="M9 19c-4 1-4-2-6-2m12 4v-3c0-1 .1-1.6-.5-2 3.5-.4 6.5-1.7 6.5-6a5 5 0 0 0-1.5-3.5c.2-1 .2-2-.5-3.5-2 0-3 1-3.5 1.5a12 12 0 0 0-7 0C8 4 7 3 5 3c-.7 1.5-.7 2.5-.5 3.5A5 5 0 0 0 3 10c0 4.3 3 5.6 6.5 6-.6.4-.5 1-.5 2v3"/></>,
  shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
}
function Icon({ name, size = 20 }: {
  name: IconName
  size?: number
}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>
}
function Button({ children, onClick, secondary = false, disabled = false, icon, className = '' }: {
  children: ReactNode
  onClick: () => void
  secondary?: boolean
  disabled?: boolean
  icon?: IconName
  className?: string
}) {
  return <button type="button" className={`button ${secondary ? 'secondary' : ''} ${className}`} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} size={17}/>}{children}</button>
}
function Field({ label, children, hint }: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}
function NumberField({ label, value, onChange, integer = false, hint }: {
  label: string
  value: string | number
  onChange: (value: string) => void
  integer?: boolean
  hint?: string
}) {
  return <Field label={label} hint={hint}><input type="number" min="0" max="10000000" step={integer ? '1' : 'any'} value={value} onChange={e => {
      const v = e.target.value
      if (v === '' || (integer ? /^\d+$/.test(v) : /^\d+(\.\d+)?$/.test(v)) && Number(v) <= 10000000)
        onChange(v)
    }}/></Field>
}
function Radar({ assessment }: {
  assessment: Assessment
}) {
  const { t, assess } = useI18n()
  const { results } = assess(assessment)
  const point = (index: number, radius: number) => {
    const angle = Math.PI / 3 * index - Math.PI / 2
    return [210 + Math.cos(angle) * radius, 165 + Math.sin(angle) * radius]
  }
  const points = (radius: number) => results.map((_, i) => point(i, radius).join(',')).join(' ')
  const labels = [t("ui.governance"), t("ui.devsecops"), t("ui.delivery"), t("ui.change"), t("ui.experience"), t("ui.copilot")]
  const ordered = [results[0], results[1], results[2], results[5], results[3], results[4]]
  return <figure className="radar"><svg viewBox="0 0 420 340" role="img" aria-label={t("ui.maturity_radar_see_the_dimension_table_for_exact_scores")}>
  {[.25, .5, .75, 1].map(scale => <polygon key={scale} points={points(112 * scale)} className="radar-grid"/>)}
  {results.map((_, i) => <line key={i} x1="210" y1="165" x2={point(i, 112)[0]} y2={point(i, 112)[1]} className="radar-grid"/>)}
  <polygon points={ordered.map((r, i) => point(i, (r.score ?? 0) / 100 * 112).join(',')).join(' ')} className="radar-area"/>
  {ordered.map((r, i) => <circle key={i} cx={point(i, (r.score ?? 0) / 100 * 112)[0]} cy={point(i, (r.score ?? 0) / 100 * 112)[1]} r="4" fill="var(--blue)"/>)}
  {labels.map((label, i) => <text key={label} x={point(i, 145)[0]} y={point(i, 145)[1]} dy="4" textAnchor={i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end'}>{label}</text>)}
  </svg><figcaption>{t("ui.six_dimensions_one_connected_picture")}</figcaption></figure>
}
function Profile({ a, update, begin }: {
  a: Assessment
  update: (patch: Partial<Assessment>) => void
  begin: () => void
}) {
  const { t, platformLabels, sampleText } = useI18n()
  return <section className="panel profile">
  <div className="section-heading"><div><h2>{t("ui.start_with_the_current_state")}</h2><p>{t("ui.a_little_context_makes_the_recommendations_more_useful")}</p></div><span className="tag">{t("ui.customer_profile")}</span></div>
  <div className="form-grid">
    <Field label={t("ui.customer_organization")}><input value={a.customer} maxLength={200} onChange={e => update({ customer: e.target.value })} placeholder={t("ui.e_g_contoso_engineering")} autoComplete={demoMode ? 'off' : 'organization'}/></Field>
    <Field label={t("ui.facilitator")}><input value={sampleText(a, a.facilitator)} maxLength={200} onChange={e => update({ facilitator: e.target.value })} placeholder={t("ui.your_name")} autoComplete={demoMode ? 'off' : 'name'}/></Field>
    <Field label={t("ui.assessment_date")}><input type="date" value={a.date} onChange={e => {
      if (e.target.value)
        update({ date: e.target.value })
    }}/></Field>
    <NumberField label={t("ui.number_of_developers")} value={a.developers || ''} integer onChange={v => update({ developers: Number(v) })} hint={t("ui.leave_blank_if_not_yet_known")}/>
    <Field label={t("ui.current_development_platform")}><select value={a.platform} onChange={e => update({ platform: e.target.value as Assessment['platform'] })}>
    {Object.entries(platformLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></Field>
    <Field label={t("ui.target_github_hosting")}><select value={a.hosting} onChange={e => update({ hosting: e.target.value as Assessment['hosting'] })}>
    <option value="undecided">{t("ui.not_yet_decided")}</option><option value="cloud">{t("ui.github_enterprise_cloud")}</option><option value="server">{t("ui.github_enterprise_server")}</option></select></Field>
    <Field label={t("ui.current_copilot_plan")}><select value={a.copilotPlan} onChange={e => update({ copilotPlan: e.target.value as Assessment['copilotPlan'] })}>
    <option value="undecided">{t("ui.not_yet_confirmed")}</option><option value="none">{t("ui.not_deployed")}</option><option value="business">{t("ui.copilot_business")}</option><option value="enterprise">{t("ui.copilot_enterprise")}</option></select></Field>
    <NumberField label={t("ui.proposed_copilot_seats")} value={a.seats || ''} integer onChange={v => update({ seats: Number(v) })}/>
    <Field label={t("ui.integrations_dependencies")} hint={t("ui.boards_pipelines_packages_identity_providers_and_external_systems")}><textarea rows={3} maxLength={20000} value={sampleText(a, a.dependencies)} onChange={e => update({ dependencies: e.target.value })} placeholder={t("ui.what_needs_to_stay_connected")}/></Field>
    <Field label={t("ui.constraints_decision_criteria")} hint={t("ui.residency_compliance_networking_budgets_or_important_deadlines")}><textarea rows={3} maxLength={20000} value={sampleText(a, a.constraints)} onChange={e => update({ constraints: e.target.value })} placeholder={t("ui.what_must_the_target_architecture_respect")}/></Field>
  </div>
  <div className="form-footer"><p>{t("ui.30_questions_six_dimensions_no_external_data_collection")}</p><Button onClick={begin} disabled={!a.customer.trim()} icon="arrow">{t("ui.continue_to_questions")}</Button></div>
  </section>
}
function Questionnaire({ a, update, questionIndex, setQuestionIndex, onFinish }: {
  a: Assessment
  update: (patch: Partial<Assessment>) => void
  questionIndex: number
  setQuestionIndex: (i: number) => void
  onFinish: () => void
}) {
  const { t, allQuestions, pillars, ratingNames, sampleText, locale } = useI18n()
  const q = allQuestions[questionIndex]
  const pillar = pillars.find(p => p.questions.some(item => item.id === q.id))!
  const answer = a.answers[q.id]
  const [notice, setNotice] = useState<Message | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const dimensionNav = useRef<HTMLElement>(null)
  const activeDimension = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    const nav = dimensionNav.current
    const button = activeDimension.current
    if (nav && button && nav.scrollWidth > nav.clientWidth) {
      nav.scrollLeft += button.getBoundingClientRect().left - nav.getBoundingClientRect().left
        - (nav.clientWidth - button.clientWidth) / 2
    }
  }, [])
  const note = sampleText(a, answer?.evidence ?? '')
  const setAnswer = (value: Rating | 'na') => {
    if (value === 'na' && !note.trim()) {
      setNotice(m("ui.add_a_rationale_in_the_evidence_field_before_marking"))
      return
    }
    update({ answers: { ...a.answers, [q.id]: { value, evidence: answer?.evidence ?? '' } } })
    setNotice(null)
  }
  const changeNote = (value: string) => {
    update({ answers: { ...a.answers, [q.id]: {
          value: answer?.value === 'na' && !value.trim() ? null : answer?.value ?? null,
          evidence: value,
        } } })
  }
  return <div className="question-layout">
  <aside ref={dimensionNav} className="dimension-nav" aria-label={t("ui.assessment_dimensions")}>
    <button className="profile-link" onClick={() => setQuestionIndex(-1)}>{t("ui.edit_customer_profile")}<Icon name="arrow" size={15}/></button>
    {pillars.map(p => {
      const count = p.questions.filter(item => isAnswered(a, item.id)).length
      return <button key={p.id} ref={p.id === pillar.id ? activeDimension : undefined} aria-current={p.id === pillar.id ? 'step' : undefined} className={`dimension-button ${p.id === pillar.id ? 'selected' : ''}`} onClick={() => setQuestionIndex(allQuestions.indexOf(p.questions[0]))}>
      <span className="dimension-dot" style={{ background: p.color }}/><span>{p.short}<small>{t("counts.dimension", { count, total: p.questions.length })}</small></span>{count === p.questions.length && <Icon name="check" size={16}/>}
    </button>
    })}
    <div className="privacy-note"><Icon name="shield"/><p>{demoMode ? <>{t("ui.session_only")}<br />{t("ui.refreshing_discards_demo_answers")}</> : <>{t("ui.saved_in_this_browser")}<br />{t("ui.export_a_backup_before_clearing_site_data")}</>}</p></div>
  </aside>
  <section className="panel question-panel">
    <div className="question-meta"><span style={{ color: pillar.color }}>{pillar.name}</span><span>{t("counts.question", { count: questionIndex + 1, total: allQuestions.length })}</span></div>
    <div className="question-steps" aria-label={t("ui.questions_in_this_dimension")}>{pillar.questions.map(item => {
      const index = allQuestions.indexOf(item)
      return <button key={item.id} className={`${item.id === q.id ? 'current' : ''} ${isAnswered(a, item.id) ? 'answered' : ''}`} aria-label={t("ui.question_2", { p1: index + 1, p2: isAnswered(a, item.id) ? t("ui.answered_2") : '' })} aria-current={item.id === q.id ? 'step' : undefined} onClick={() => setQuestionIndex(index)}>{isAnswered(a, item.id) ? <Icon name="check" size={14}/> : index + 1}</button>
    })}</div>
    <h2 tabIndex={-1} ref={heading}>{q.title}</h2><p className="question-why">{q.why}</p>
    {q.critical && <span className="tag critical-tag"><Icon name="shield" size={13}/>{t("ui.critical_control_cannot_be_excluded")}</span>}
    <fieldset className="answer-options"><legend className="sr-only">{t("ui.choose_the_statement_closest_to_your_current_state")}</legend>
    {q.options.map((option, i) => <label key={option} className={`answer-option ${answer?.value === i ? 'chosen' : ''}`}>
      <input type="radio" name={q.id} checked={answer?.value === i} onChange={() => setAnswer(i as Rating)}/>
      <span className="rating-number">{i}</span><span><strong>{ratingNames[i]}</strong><span>{option}</span></span>
      <span className="radio-mark"/>
    </label>)}
    </fieldset>
    <Field label={answer?.value === 'na' ? t("ui.not_applicable_rationale") : t("ui.evidence_session_notes")} hint={t("ui.suggested_evidence_notes_are_self_reported_not_independently_verified", { p1: q.evidence })}>
    <textarea maxLength={20000} rows={3} value={note} onChange={e => changeNote(e.target.value)} placeholder={t("ui.record_what_you_observed_who_confirmed_it_or_why")}/>
    </Field>
    <div className="question-tools">
    {!q.critical && <button className={`text-button ${answer?.value === 'na' ? 'active-text' : ''}`} onClick={() => setAnswer('na')}>{answer?.value === 'na' ? t("ui.marked_not_applicable") : t("ui.mark_not_applicable_requires_rationale")}</button>}
    {answer && <button className="text-button muted" onClick={() => { const answers = { ...a.answers }; delete answers[q.id]; update({ answers }); }}>{t("ui.clear_response_notes")}</button>}
    </div>
    {notice && <p className="inline-error" role="alert">{formatMessage(notice, locale)}</p>}
    <div className="form-footer"><Button secondary onClick={() => setQuestionIndex(questionIndex - 1)}>{t("ui.back")}</Button>
    <span className="muted small">{isAnswered(a, q.id) ? t("ui.response_recorded") : t("ui.unanswered_you_can_return_later")}</span>
    {questionIndex < allQuestions.length - 1 ? <Button onClick={() => setQuestionIndex(questionIndex + 1)} icon="arrow">{t("ui.next_question")}</Button> : <Button onClick={onFinish} icon="arrow">{t("ui.view_results")}</Button>}
    </div>
  </section>
  </div>
}
function DimensionTable({ a }: {
  a: Assessment
}) {
  const { t, assess, level } = useI18n()
  const { results } = assess(a)
  return <div className="dimension-table" role="table" aria-label={t("ui.maturity_by_dimension")}>
  <div className="dimension-row table-labels" role="row"><span role="columnheader">{t("ui.dimension")}</span><span role="columnheader">{t("ui.maturity")}</span><span role="columnheader">{t("ui.score")}</span></div>
  {results.map(r => <div key={r.pillar.id} className="dimension-row" role="row">
    <div role="cell"><span className="dimension-name"><i style={{ background: r.pillar.color }}/>{r.pillar.short}</span><small>{r.answered}/{r.total}{t("ui.rated")}{r.pillar.weight}{t("ui.weight")}{r.excluded ? t("ui.n_a", { p1: r.excluded }) : ''}</small></div>
    <div role="cell"><div className="score-track"><span style={{ width: `${r.score ?? 0}%`, background: r.pillar.color }}/></div><small>{level(r.score)}</small></div>
    <strong role="cell">{r.score === null ? '—' : Math.round(r.score)}<small>/100</small></strong>
  </div>)}
  </div>
}
function Findings({ a, limit }: {
  a: Assessment
  limit?: number
}) {
  const { t, assess, content } = useI18n()
  const r = assess(a)
  const findings = limit ? r.findings.slice(0, limit) : r.findings
  return <div className="findings">
  {r.criticalUnknown.length > 0 && <div className="finding"><Icon name="info"/><div><h3>{t(r.criticalUnknown.length === 1 ? "counts.critical_one" : "counts.critical_other", { count: r.criticalUnknown.length })}</h3><p>{t("ui.unanswered_critical_questions_keep_the_recommended_path_precautionary_they")}</p></div><span className="tag">{t("ui.unknown")}</span></div>}
  {findings.map(f => <div className="finding" key={f.question.id}>
    <span className={`finding-marker ${f.priority.toLowerCase()}`}>{f.rating}/4</span>
    <div><h3>{f.question.title}</h3><p>{f.question.action}</p><small>{f.pillar.short}{t("ui.evidence_to_collect")}{f.question.evidence}</small></div><span className={`tag priority-${f.priority.toLowerCase()}`}>{content(f.priority)}</span>
  </div>)}
  {!r.findings.length && !r.criticalUnknown.length && <p className="empty-note">{t("ui.no_responses_below_managed_validate_reported_controls_with_evidence")}</p>}
  </div>
}
function Roadmap({ a }: {
  a: Assessment
}) {
  const { t, roadmap } = useI18n()
  return <div className="roadmap">{roadmap(a).map(w => <section key={w.days}>
  <div className="day-marker"><strong>{w.days}</strong><span>{t("ui.days")}</span></div><h3>{w.title}</h3><p className="roadmap-owner">{w.owner}</p>
  <ul>{w.actions.map(action => <li key={action}>{action}</li>)}</ul><p className="exit-criteria"><strong>{t("ui.exit_criteria")}</strong>{w.exit}</p>
  </section>)}</div>
}
function Overview({ a, go, resume }: {
  a: Assessment
  go: (view: View) => void
  resume: () => void
}) {
  const { t, assess, level, content } = useI18n()
  const r = assess(a)
  return <>
  <div className="page-intro"><div><h1>{t("ui.your_modernization")}<br /><span>{t("ui.with_a_clear_direction")}</span></h1><p>{t("ui.a_connected_view_of_github_maturity_ai_readiness_and")}</p></div><Button onClick={resume} icon={r.complete ? 'list' : 'arrow'}>{r.complete ? t("ui.review_responses") : t("ui.continue_assessment")}</Button></div>
  <div className="overview-primary">
    <section className="panel maturity-panel"><div className="section-heading"><h2>{t("ui.implementation_maturity")}</h2><span className={`tag ${r.complete ? 'success-tag' : ''}`}>{r.complete ? t("ui.complete_self_reported") : t("ui.provisional")}</span></div>
    <div className="maturity-body"><div className="overall-score"><div><strong>{r.score === null ? '—' : Math.round(r.score)}</strong><span>/ 100</span></div><span className="level-label">{level(r.score)}</span><p>{r.score === null ? t("ui.answer_the_questions_to_establish_your_baseline") : t("ui.weighted_across_assessed_dimensions_built_from_your_customer_responses")}</p><div className="maturity-scale">{[t("ui.initial"), t("ui.developing"), t("ui.defined"), t("ui.managed"), t("ui.optimizing")].map((l, i) => <span className={level(r.score) === l ? 'current-level' : ''} key={l}><i />{i + 1}</span>)}</div></div><Radar assessment={a}/></div>
    <div className="metric-strip"><div><strong>{r.answered}<small> / {r.total}</small></strong><span>{t("ui.questions_answered")}</span></div><div><strong>{r.readinessScore === null ? '—' : Math.round(r.readinessScore)}<small> / 100</small></strong><span>{t("ui.change_readiness_index")}</span></div><div><strong>{r.evidence}<small> / {r.rated}</small></strong><span>{t("ui.responses_with_notes")}</span></div></div>
    </section>
    <section className="path-panel"><div className="path-icon"><Icon name={r.path === 'Secure DevOps' ? 'shield' : 'spark'} size={29}/></div><h2>{t("ui.recommended_journey")}</h2><h3>{content(r.path)}</h3><p>{r.rationale}</p><div className="path-footnote">{r.complete ? t("ui.based_on_critical_controls_platform_and_hosting_context") : t("ui.preliminary_direction_complete_all_questions_to_confirm")}</div><button onClick={() => go('report')}>{t("ui.explore_the_recommendation")}<Icon name="arrow" size={18}/></button></section>
  </div>
  <div className="overview-secondary"><section className="panel"><div className="section-heading"><h2>{t("ui.maturity_by_dimension")}</h2><button className="text-button" onClick={() => go('methodology')}>{t("ui.how_scoring_works")}<Icon name="arrow" size={14}/></button></div><DimensionTable a={a}/></section>
    <section className="panel priorities-panel"><div className="section-heading"><h2>{t("ui.focus_next")}</h2><span className="tag">{t(r.findings.length === 1 ? "counts.opportunities_one" : "counts.opportunities_other", { count: r.findings.length })}</span></div><Findings a={a} limit={3}/><button className="text-button all-findings" onClick={() => go('report')}>{t("ui.view_all_findings")}<Icon name="arrow" size={15}/></button></section>
  </div>
  <section className="panel roadmap-panel"><div className="section-heading"><div><h2>{t("ui.from_assessment_to_action")}</h2><p>{t("ui.a_proposed_roadmap_confirm_owners_capacity_and_milestones_with")}</p></div><span className="tag">{t("ui.30_60_90_days")}</span></div><Roadmap a={a}/></section>
  </>
}
function Report({ a, exportReport, go }: {
  a: Assessment
  exportReport: () => void
  go: (view: View) => void
}) {
  const { t, assess, level, formatMoney, platformLabels, pathDescriptions, content, pillars, sampleText, date, planLabel, hostingLabel, number } = useI18n()
  const r = assess(a)
  const b = businessCase(a)
  useEffect(() => {
    let collapsed: HTMLDetailsElement[] = []
    const beforePrint = () => {
      collapsed = Array.from(document.querySelectorAll<HTMLDetailsElement>('.evidence-register details:not([open])'))
      collapsed.forEach(detail => { detail.open = true; })
    }
    const afterPrint = () => { collapsed.forEach(detail => { detail.open = false; }); collapsed = []; }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [])
  return <div className="report-view">
  <div className="page-intro"><div><h1>{a.customer || t("ui.customer")}<br /><span>{t("ui.assessment_action_plan")}</span></h1><p>{date(a.date)} · {sampleText(a, a.facilitator) || t("ui.facilitator_not_specified")}{t("ui.methodology")}{methodologyVersion}</p></div><div className="actions no-print"><Button secondary icon="download" onClick={exportReport}>{t("ui.export_markdown")}</Button><Button icon="report" onClick={() => window.print()}>{t("ui.print_save_pdf")}</Button></div></div>
  {!r.complete && <div className="notice no-print"><Icon name="info"/><p><strong>{t("ui.provisional_report")}</strong> {t("report.remaining", { count: r.total - r.answered })}</p><button className="text-button" onClick={() => go('assessment')}>{t("ui.complete_assessment")}</button></div>}
  <section className="panel report-summary"><h2>{t("ui.executive_summary")}</h2><p>{t("report.summary", { score: r.score === null ? t("ui.not_assessed") : `${Math.round(r.score)}/100 · ${level(r.score)}`, coverage: r.coverage, evidence: r.evidence, rated: r.rated })}</p><p><strong>{t("ui.recommended_path")}{content(r.path)}.</strong> {r.rationale}</p><p className="muted">{t("ui.this_is_a_custom_advisory_framework_based_on_self")}</p></section>
  <section className="panel"><h2>{t("ui.current_state_maturity")}</h2><div className="context-summary"><div><span>{t("ui.platform")}</span><strong>{platformLabels[a.platform]}</strong></div><div><span>{t("ui.hosting_target")}</span><strong>{a.hosting === 'undecided' ? t("ui.to_be_confirmed") : a.hosting === 'cloud' ? t("ui.enterprise_cloud") : t("ui.enterprise_server")}</strong></div><div><span>{t("ui.developers")}</span><strong>{a.developers || t("ui.not_specified")}</strong></div><div><span>{t("ui.copilot")}</span><strong>{planLabel(a.copilotPlan)}</strong></div></div><DimensionTable a={a}/>
    <div className="context-notes"><div><h3>{t("ui.dependencies")}</h3><p>{sampleText(a, a.dependencies) || t("ui.not_yet_documented")}</p></div><div><h3>{t("ui.constraints")}</h3><p>{sampleText(a, a.constraints) || t("ui.not_yet_documented")}</p></div></div>
  </section>
  <section className="panel"><div className="section-heading"><h2>{t("ui.decision_matrix")}</h2><span className="tag">{t("ui.rule_based_recommendation")}</span></div>
    <div className="decision-matrix">{Object.entries(pathDescriptions).map(([path, description]) => <div key={path} className={r.path === path ? 'recommended' : ''}><h3>{content(path)}{r.path === path && <Icon name="check" size={17}/>}</h3><p>{description}</p><span>{r.path === path ? t("ui.recommended_first") : t("ui.alternative_subsequent_workstream")}</span></div>)}</div>
  </section>
  <section className="panel"><h2>{t("ui.findings_recommendations")}</h2><Findings a={a}/></section>
  <section className="panel"><div className="section-heading"><div><h2>{t("ui.architecture_from_as_is_to_to_be")}</h2><p>{t("ui.conceptual_target_for_validation_not_an_approved_solution_design")}</p></div></div>
    <div className="architecture"><div><span className="tag">{t("ui.as_is")}</span><h3>{platformLabels[a.platform]}</h3><p>{t("report.hosting_plan", { hosting: hostingLabel(a.hosting), plan: planLabel(a.copilotPlan) })}</p><p>{sampleText(a, a.dependencies) || t("ui.inventory_integrations_and_platform_boundaries")}</p></div><Icon name="arrow" size={28}/><div><span className="tag success-tag">{t("ui.proposed_to_be")}</span><h3>{t("ui.governed_github_responsible_ai")}</h3><p>{t("ui.central_identity_reviewed_repositories_reusable_ci_cd_protected_environments")}</p><p>{r.path === 'Hybrid' ? t("ui.retain_required_systems_behind_documented_integration_boundaries") : t("ui.validate_migration_boundaries_hosting_eligibility_and_integration_compatibility")}{t("ui.governed_copilot_supports_the_engineering_workflow")}</p></div></div>
  </section>
  <section className="panel roadmap-panel"><div className="section-heading"><h2>{t("ui.your_30_60_90_day_roadmap")}</h2><span className="tag">{t("ui.suggested_owners_exit_criteria")}</span></div><Roadmap a={a}/></section>
  <section className="panel"><h2>{t("ui.pilot_pov_deployment_plan")}</h2><div className="pilot-plan"><div><h3>{t("ui.scope")}</h3><p>{t("ui.one_representative_team_and_a_non_critical_workload_with")}</p></div><div><h3>{t("ui.guardrails")}</h3><p>{t("ui.confirm_identity_data_handling_approved_ai_policy_support_and")}</p></div><div><h3>{t("ui.success_criteria")}</h3><p>{t("ui.baseline_developer_friction_adoption_delivery_and_quality_agree_on")}</p></div></div><p className="muted">{t("ui.review_at_day_60_expand_only_when_customer_approved")}</p></section>
  <section className="panel"><div className="section-heading"><div><h2>{t("ui.business_case_licensing_scenario")}</h2><p>{t("ui.customer_provided_assumptions_only_edit_these_in_the_questionnaire")}</p></div><button className="text-button no-print" onClick={() => go('assessment')}>{t("ui.edit_assumptions")}<Icon name="arrow" size={15}/></button></div>
    <div className="business-results"><div><span>{t("ui.proposed_seats")}</span><strong>{a.seats}</strong></div><div><span>{t("ui.annual_license_only_scenario")}</span><strong>{b.annual === null ? t("ui.not_estimated") : formatMoney(b.annual)}</strong></div><div><span>{t("ui.illustrative_gross_capacity_value_year")}</span><strong>{b.gross === null ? t("ui.not_estimated") : formatMoney(b.gross)}</strong></div></div>
    <p className="muted small">{b.annual !== null && t("ui.seats_usd_month_12", { p1: number(a.seats), p2: number(a.seatCost, 2) })}{b.gross !== null && t("ui.seats_hours_week_usd_hour_46_weeks", { p1: number(a.seats), p2: number(a.hoursSaved, 2), p3: number(a.hourlyRate, 2) })}{t("ui.not_a_quote_guaranteed_savings_or_roi_excludes_implementation")}</p>
  </section>
  <section className="panel evidence-register"><h2>{t("ui.response_evidence_register")}</h2>{pillars.map(p => <details key={p.id}><summary>{p.name}<span>{t("counts.answers", { count: p.questions.filter(q => isAnswered(a, q.id)).length, total: 5 })}</span></summary>{p.questions.map(q => {
        const answer = a.answers[q.id]
        return <div className="evidence-item" key={q.id}><h3>{q.title}</h3><p>{!answer || answer.value === null ? t("ui.unanswered") : answer.value === 'na' ? t("ui.not_applicable") : t("ui.4", { p1: answer.value, p2: q.options[answer.value] })}</p><p className="muted">{t("ui.evidence_rationale")}{sampleText(a, answer?.evidence ?? '') || t("ui.not_supplied")}</p></div>
      })}</details>)}</section>
  </div>
}
function Methodology() {
  const { t, pillars } = useI18n()
  return <div className="methodology"><div className="page-intro"><div><h1>{t("ui.transparent_by_design")}</h1><p>{t("ui.every_score_has_a_traceable_answer_every_recommendation_has")}</p></div><span className="tag">{t("ui.methodology_v")}{methodologyVersion}</span></div>
  <section className="panel"><h2>{t("ui.a_custom_advisory_framework")}</h2><p>{t("ui.this_assessment_is_a_conversation_aid_for_github_enterprise")}</p></section>
  <section className="panel"><h2>{t("ui.how_scores_are_calculated")}</h2><p>{t("ui.each_of_the_30_questions_has_five_specific_statements")}</p><div className="formula">{t("ui.dimension_sum_of_ratings_4_rated_questions_100")}</div><p>{t("ui.the_overall_score_is_the_weighted_mean_of_dimensions")}</p><div className="weight-list">{pillars.map(p => <div key={p.id}><span>{p.name}</span><strong>{p.weight}%</strong></div>)}</div><p><strong>{t("ui.missing_zero")}</strong>{t("ui.unknown_answers_remain_unanswered_a_zero_is_an_explicit")}</p><p><strong>{t("ui.not_applicable_2")}</strong>{t("ui.requires_a_written_rationale_is_excluded_from_numeric_scoring")}</p><p><strong>{t("ui.readiness_index")}</strong>{t("ui.the_equally_weighted_mean_of_assessed_governance_devsecops_and")}</p><p><strong>{t("ui.radar_chart")}</strong>{t("ui.missing_dimension_scores_are_plotted_at_the_center_for")}</p></section>
  <section className="panel"><h2>{t("ui.five_maturity_levels")}</h2><div className="level-definitions">{[[t("ui.initial"), t("ui.0_to_20"), t("ui.practices_are_absent_or_largely_reactive")], [t("ui.developing"), t("ui.20_to_40"), t("ui.some_practices_exist_but_consistency_is_limited")], [t("ui.defined"), t("ui.40_to_60"), t("ui.practices_are_documented_and_repeatable")], [t("ui.managed"), t("ui.60_to_80"), t("ui.controls_and_adoption_are_actively_governed")], [t("ui.optimizing"), t("ui.80_to_100"), t("ui.evidence_supports_continuous_improvement")]].map(([name, range, description]) => <div key={name}><strong>{name}</strong><span>{range}</span><p>{description}</p></div>)}</div><p className="muted">{t("ui.scores_are_displayed_rounded_level_thresholds_use_the_unrounded")}</p></section>
  <section className="panel"><h2>{t("ui.route_selection_prioritization")}</h2><ol className="method-rules"><li>{t("ui.missing_critical_controls_or_any_critical_rating_below_2")}<strong>{t("ui.secure_devops")}</strong>{t("ui.first_unknown_controls_are_precautionary_not_confirmed_vulnerabilities")}</li><li>{t("ui.mixed_github_azure_devops_estate_or_an_enterprise_server")}<strong>{t("ui.hybrid")}</strong>.</li><li>{t("ui.primary_platform_outside_github")}<strong>{t("ui.migrate")}</strong>.</li><li>{t("ui.otherwise")}<strong>{t("ui.optimize_copilot")}</strong>.</li></ol><p>{t("ui.critical_gaps_are_critical_control_ratings_below_2_other")}</p><p>{t("ui.hosting_regulatory_constraints_dependencies_and_commercial_eligibility_still_need")}</p></section>
  <section className="panel"><h2>{t("ui.data_handling_references")}</h2>{demoMode ? <><p>{t("ui.this_public_demonstration_keeps_assessment_answers_in_memory_only")}</p><p>{t("ui.use_fictional_data_not_confidential_customer_information_json_and")}</p></> : <><p>{t("ui.assessments_are_stored_in_localstorage_on_this_browser_and")}</p><p>{t("ui.changing_browser_device_port_or_hostname_uses_a_different")}</p></>}<div className="reference-links"><a href="https://docs.github.com/en/enterprise-cloud@latest/admin" target="_blank" rel="noreferrer">{t("ui.github_enterprise_documentation")}</a><a href="https://docs.github.com/en/copilot" target="_blank" rel="noreferrer">{t("ui.github_copilot_documentation")}</a><a href="https://github.com/features/copilot/plans" target="_blank" rel="noreferrer">{t("ui.current_copilot_plans")}</a></div></section>
  </div>
}
export default function App() {
  const { t, assess, level, allQuestions, platformLabels, locale, date } = useI18n()
  const [loaded] = useState(loadSnapshot)
  const [snapshot, replaceSnapshot] = useState<Snapshot>(loaded.snapshot)
  const [blocked, setBlocked] = useState(Boolean(loaded.error))
  const [storageError, setStorageError] = useState(loaded.error)
  const titles: Record<View, string> = { overview: t('ui.maturity_overview'), assessment: t('ui.customer_assessment'), report: t('ui.assessment_report'), library: t('ui.your_assessments'), methodology: t('ui.scoring_methodology') }
  const [view, setView] = useState<View>('overview')
  const [questionIndex, setQuestionIndex] = useState(-1)
  const [message, setMessage] = useState<Message | null>(null)
  const [saved, setSaved] = useState(!loaded.error)
  const fileInput = useRef<HTMLInputElement>(null)
  const mainHeading = useRef<HTMLElement>(null)
  const active = snapshot.assessments.find(a => a.id === snapshot.activeId)
  const result = active ? assess(active) : null
  const setSnapshot = (updater: (s: Snapshot) => Snapshot) => {
    if (blocked)
      return
    const next = updater(snapshot)
    replaceSnapshot(next)
    if (demoMode)
      return
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setSaved(true)
      setStorageError(null)
    }
    catch {
      setSaved(false)
      setStorageError(m("error.save"))
    }
  }
  useEffect(() => {
    if (demoMode)
      return
    const changed = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        setBlocked(true)
        setSaved(false)
        setStorageError(m("ui.assessment_storage_changed_in_another_tab_editing_is_paused"))
      }
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  useEffect(() => { mainHeading.current?.focus(); }, [view])
  const update = (patch: Partial<Assessment>) => {
    if (!active || blocked)
      return
    setSnapshot(s => ({ ...s, assessments: s.assessments.map(a => a.id === active.id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a) }))
  }
  const add = (sample: boolean) => {
    if (blocked)
      return
    if (snapshot.assessments.length >= 200) {
      setMessage(m("ui.this_browser_supports_up_to_200_assessments_export_and"))
      return
    }
    const a = sample ? exampleAssessment() : newAssessment()
    setSnapshot(s => ({ ...s, activeId: a.id, assessments: [...s.assessments, a] }))
    setQuestionIndex(-1)
    setView(sample ? 'overview' : 'assessment')
    setMessage(null)
  }
  const go = (next: View) => {
    setView(next)
    if (next === 'assessment')
      setQuestionIndex(-1)
  }
  const resume = () => {
    if (!active)
      return
    const next = allQuestions.findIndex(q => !isAnswered(active, q.id))
    setQuestionIndex(active.customer.trim() ? next < 0 ? 0 : next : -1)
    setView('assessment')
  }
  const exportJson = (all = false) => {
    const selected = all ? snapshot.assessments : active ? [active] : snapshot.assessments
    download(`${all ? 'all-assessments' : fileStem(active?.customer || '')}.json`, JSON.stringify({
      schemaVersion: 1, assessments: selected, activeId: selected.some(a => a.id === snapshot.activeId) ? snapshot.activeId : selected[0]?.id ?? null,
    }, null, 2), 'application/json')
  }
  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || blocked)
      return
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new AssessmentError("ui.the_file_is_larger_than_5_mb")
      const imported = parseSnapshot(await file.text())
      if (!imported.assessments.length)
        throw new AssessmentError("ui.the_file_contains_no_assessments")
      if (snapshot.assessments.length + imported.assessments.length > 200)
        throw new AssessmentError("ui.import_would_exceed_the_200_assessment_limit")
      const copies = imported.assessments.map(a => ({ ...a, id: crypto.randomUUID() }))
      const index = imported.assessments.findIndex(a => a.id === imported.activeId)
      setSnapshot(s => ({ schemaVersion: 1, assessments: [...s.assessments, ...copies], activeId: copies[Math.max(index, 0)].id }))
      setView('overview')
      setMessage(m(copies.length === 1 ? "counts.import_one" : "counts.import_other", { count: copies.length }))
    }
    catch (error) {
      setMessage({ ...errorMessage(error, "ui.the_file_could_not_be_read"), prefix: "ui.import_failed" })
    }
  }
  const remove = (a: Assessment) => {
    if (blocked || !window.confirm(t("ui.delete_from_export_a_backup_first_this_cannot_be", { p1: a.customer || t("ui.untitled_assessment"), p2: demoMode ? t("ui.this_demo_session") : t("ui.this_browser") })))
      return
    setSnapshot(s => {
      const assessments = s.assessments.filter(item => item.id !== a.id)
      return { ...s, assessments, activeId: s.activeId === a.id ? assessments[0]?.id ?? null : s.activeId }
    })
    setMessage(m(demoMode ? "ui.assessment_removed_from_this_demo_session" : "ui.assessment_deleted_from_this_browser"))
  }
  const exportReport = () => {
    if (active)
      download(`${fileStem(active.customer)}-report.md`, reportMarkdown(active, locale), 'text/markdown;charset=utf-8')
  }
  const nav: {
    view: View
    icon: IconName
    label: string
  }[] = [
    { view: 'overview', icon: 'grid', label: t("ui.overview") }, { view: 'assessment', icon: 'list', label: t("ui.questionnaire") },
    { view: 'report', icon: 'report', label: t("ui.report_roadmap") }, { view: 'library', icon: 'folder', label: t("ui.assessments") },
    { view: 'methodology', icon: 'info', label: t("ui.methodology_2") },
  ]
  return <>
  <a className="skip-link" href="#main-content">{t("ui.skip_to_content")}</a>
  <div className="app-shell">
  <aside className="sidebar no-print">
    <a className="brand" href="#" onClick={e => { e.preventDefault(); go('overview'); }}><span className="brand-mark"><Icon name="github" size={27}/></span><span>{t("ui.github")}<span>{t("ui.maturity_assessment")}</span></span></a>
    <div className="workspace-label">{t("ui.assessment_workspace")}</div>
    <nav aria-label={t("ui.main_navigation")}>{nav.map(item => <button key={item.view} aria-label={item.label} aria-current={view === item.view ? 'page' : undefined} className={view === item.view ? 'nav-active' : ''} onClick={() => go(item.view)}><Icon name={item.icon}/><span>{item.label}</span>{item.view === 'assessment' && result && <small>{result.coverage}%</small>}</button>)}</nav>
    <div className="sidebar-session"><span>{t("ui.current_assessment")}</span><strong>{active?.customer || (active ? t("ui.untitled_assessment") : t("ui.no_assessment_yet"))}</strong>{active && <><div className="mini-track"><i style={{ width: `${result?.coverage ?? 0}%` }}/></div><small>{t("counts.dimension", { count: result?.answered, total: allQuestions.length })}</small></>}<button className="text-button" onClick={() => add(false)} disabled={blocked}><Icon name="plus" size={15}/>{t("ui.new_assessment")}</button></div>
    <div className="sidebar-bottom"><Icon name="shield" size={18}/><div>{demoMode ? t("ui.demo_only_nothing_autosaved") : t("ui.local_first_customer_owned")}<small>{t("ui.no_answers_sent_to_a_server")}</small></div></div>
  </aside>
  <div className="main-shell"><header className="topbar no-print"><div className="breadcrumb">{t("ui.workspace")}<span>/</span><strong>{titles[view]}</strong></div><div className="topbar-actions"><span className={`save-status ${storageError ? 'save-error' : ''}`}><i />{demoMode ? t("ui.demo_session_only") : storageError ? t("ui.storage_needs_attention") : saved ? t("ui.saved_on_this_device") : t('ui.saving')}</span><button className="icon-button" onClick={() => exportJson()} aria-label={t("ui.export_assessment_json")}><Icon name="download" size={18}/></button><UserMenu /></div></header>
    <main id="main-content" ref={mainHeading} tabIndex={-1}>
    {demoMode && <div className="notice no-print"><Icon name="shield"/><p><strong>{t("ui.public_demonstration")}</strong>{t("ui.answers_stay_in_this_tab_s_memory_and_disappear")}</p></div>}
    {storageError && <div className="notice error-notice no-print" role="alert"><Icon name="info"/><div><strong>{t("ui.protect_your_assessment_data")}</strong><p>{formatMessage(storageError, locale)}</p><div className="actions"><button className="text-button" onClick={() => exportJson(true)}>{t("ui.export_current_work")}</button>{blocked && <button className="text-button" onClick={() => {
          try {
            download('assessment-storage-recovery.txt', localStorage.getItem(storageKey) ?? '', 'text/plain')
          }
          catch {
            setMessage(m("error.recovery"))
          }
        }}>{t("ui.download_stored_recovery_data")}</button>}<button className="text-button" onClick={() => window.location.reload()}>{t("ui.reload")}</button>{loaded.error && <button className="text-button danger-text" onClick={() => {
          if (!window.confirm(t("ui.reset_only_this_app_s_stored_assessments_download_the")))
            return
          try {
            localStorage.removeItem(storageKey)
            window.location.reload()
          }
          catch {
            setMessage(m("error.reset"))
          }
        }}>{t("ui.reset_app_storage")}</button>}</div></div></div>}
    {message && <div className="notice no-print" role="status"><Icon name="info"/><p>{formatMessage(message, locale)}</p><button className="text-button" onClick={() => setMessage(null)} aria-label={t("ui.dismiss_notification")}>{t("ui.dismiss")}</button></div>}
    {active?.sample && view !== 'library' && <div className="sample-banner"><span className="tag">{t("ui.sample_data")}</span><p>{t("ui.northstar_is_a_fictional_organization_all_responses_are_illustrative")}</p><button className="text-button no-print" onClick={() => add(false)} disabled={blocked}>{t("ui.start_a_real_assessment")}<Icon name="arrow" size={15}/></button></div>}
    {view === 'methodology' ? <Methodology /> : view === 'library' ? <>
      <div className="page-intro"><div><h1>{t("ui.your_assessments_2")}</h1><p>{demoMode ? t("ui.temporary_demo_assessments_in_this_tab_refreshing_the_page") : t("ui.keep_customer_sessions_separate_export_a_backup_to_take")}</p></div><Button icon="plus" onClick={() => add(false)} disabled={blocked}>{t("ui.new_assessment_2")}</Button></div>
      <div className="library-toolbar"><span>{snapshot.assessments.length} {demoMode ? t("ui.in_this_demo_session") : t("ui.saved_on_this_browser")}</span><div className="actions"><Button secondary icon="upload" onClick={() => fileInput.current?.click()} disabled={blocked}>{t("ui.import_json")}</Button><Button secondary icon="download" onClick={() => exportJson(true)} disabled={!snapshot.assessments.length}>{t("ui.export_all")}</Button></div></div>
      {!snapshot.assessments.length ? <div className="panel empty-library"><Icon name="folder" size={36}/><h2>{t("ui.a_clean_slate")}</h2><p>{t("ui.create_your_first_assessment_or_import_an_exported_json")}</p></div> : <div className="assessment-list">{snapshot.assessments.map(a => {
          const r = assess(a)
          return <article className="assessment-list-item" key={a.id}><div className="customer-avatar">{(a.customer || 'U').slice(0, 2).toUpperCase()}</div><div><h2>{a.customer || t("ui.untitled_assessment")}{a.sample && <span className="tag">{t("ui.sample")}</span>}</h2><p>{date(a.date)} · {platformLabels[a.platform]} · {t("counts.answers", { count: r.answered, total: r.total })}</p></div><div className="library-score"><strong>{r.score === null ? '—' : Math.round(r.score)}</strong><small>{r.complete ? level(r.score) : t("ui.provisional")}</small></div><Button secondary onClick={() => { setSnapshot(s => ({ ...s, activeId: a.id })); setView('overview'); }} disabled={blocked}>{t("ui.open")}</Button><button className="icon-button danger-text" onClick={() => remove(a)} disabled={blocked} aria-label={t("ui.delete", { p1: a.customer || t("ui.untitled_assessment_2") })}><Icon name="trash" size={18}/></button></article>
        })}</div>}
    </> : !active ? <div className="welcome">
      <div className="welcome-symbol"><Icon name="github" size={48}/></div><h1>{t("ui.a_clearer_path_to")}<br /><span>{t("ui.github_maturity")}</span></h1><p>{t("ui.turn_a_customer_conversation_into_a_practical_modernization_plan")}</p><div className="actions"><Button icon="plus" onClick={() => add(false)} disabled={blocked}>{t("ui.start_an_assessment")}</Button><Button secondary icon="grid" onClick={() => add(true)} disabled={blocked}>{t("ui.explore_sample_dashboard")}</Button></div><div className="welcome-flow"><span><strong>{t("ui.understand")}</strong>{t("ui.30_guided_questions")}</span><Icon name="arrow"/><span><strong>{t("ui.assess")}</strong>{t("ui.six_maturity_dimensions")}</span><Icon name="arrow"/><span><strong>{t("ui.act")}</strong>{t("ui.a_30_60_90_day_roadmap")}</span></div><div className="welcome-note"><Icon name="shield" size={18}/><span>{demoMode ? t("ui.demo_answers_are_not_saved_refreshing_starts_a_clean") : t("ui.answers_stay_in_this_browser_no_sign_in_or")}<br />{t("ui.a_custom_advisory_framework_not_an_official_github_certification")}</span></div><button className="text-button" onClick={() => fileInput.current?.click()} disabled={blocked}>{t("ui.already_have_an_assessment_import_json")}<Icon name="upload" size={15}/></button>
    </div> : view === 'overview' ? <Overview a={active} go={go} resume={resume}/>
      : view === 'assessment' ? <>
      <div className="page-intro compact"><div><h1>{questionIndex < 0 ? t("ui.set_the_scene") : t("ui.understand_the_current_state")}</h1><p>{active.customer || t("ui.new_customer")}{t("ui.honest_answers_make_useful_recommendations")}</p></div><span className="tag">{t("counts.answers", { count: result?.answered, total: allQuestions.length })}</span></div>
      <fieldset className="editing-boundary" disabled={blocked}>{questionIndex < 0 ? <>
        <Profile a={active} update={update} begin={() => setQuestionIndex(Math.max(0, allQuestions.findIndex(q => !isAnswered(active, q.id))))}/>
        <section className="panel assumptions"><h2>{t("ui.optional_business_case_assumptions")}</h2><p>{t("ui.use_your_customer_s_contracted_or_proposed_price_not")}</p><div className="form-grid three-columns"><NumberField label={t("ui.monthly_price_per_copilot_seat_usd")} value={active.seatCost} onChange={v => update({ seatCost: v })}/><NumberField label={t("ui.assumed_hours_saved_seat_week")} value={active.hoursSaved} onChange={v => update({ hoursSaved: v })}/><NumberField label={t("ui.loaded_hourly_rate_usd")} value={active.hourlyRate} onChange={v => update({ hourlyRate: v })}/></div><p className="small muted">{t("ui.illustrative_capacity_value_uses_46_working_weeks_it_is")}</p></section>
      </> : <Questionnaire key={questionIndex} a={active} update={update} questionIndex={questionIndex} setQuestionIndex={setQuestionIndex} onFinish={() => go('overview')}/>}</fieldset>
      </> : <Report a={active} exportReport={exportReport} go={go}/>}
    <footer className="page-footer"><span>{t("ui.github_maturity_assessment")}<span>·</span>{t("ui.advisory_framework_v")}{methodologyVersion}</span><span>{t("ui.clarity_before_change")}</span></footer>
    </main>
    <input className="sr-only" type="file" accept=".json,application/json" ref={fileInput} onChange={importJson} aria-label={t("ui.import_assessment_json_file")} tabIndex={-1}/>
  </div>
  </div>
  </>
}
