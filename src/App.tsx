import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { allQuestions, exampleAssessment, isAnswered, newAssessment, pillars, ratingNames } from './model'
import type { Assessment, Rating } from './model'
import { assess, businessCase, level, methodologyVersion, pathDescriptions, roadmap } from './scoring'
import { loadSnapshot, parseSnapshot, storageKey } from './storage'
import type { Snapshot } from './storage'
import { download, fileStem, reportMarkdown } from './report'
import './App.css'

type View = 'overview' | 'assessment' | 'report' | 'library' | 'methodology'
type IconName = 'grid' | 'list' | 'report' | 'folder' | 'info' | 'arrow' | 'check' | 'download' | 'plus' | 'github' | 'shield' | 'spark' | 'upload' | 'trash'
const iconPaths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  list: <><path d="M9 5h12M9 12h12M9 19h12" /><path d="m3 5 1 1 2-2m-3 8 1 1 2-2m-3 8 1 1 2-2" /></>,
  report: <><path d="M14 2H5v20h14V7Z" /><path d="M14 2v6h6M8 12h8M8 16h6" /></>,
  folder: <path d="M3 7V4h7l3 3h8v13H3Z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v1" /></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  github: <><path d="M9 19c-4 1-4-2-6-2m12 4v-3c0-1 .1-1.6-.5-2 3.5-.4 6.5-1.7 6.5-6a5 5 0 0 0-1.5-3.5c.2-1 .2-2-.5-3.5-2 0-3 1-3.5 1.5a12 12 0 0 0-7 0C8 4 7 3 5 3c-.7 1.5-.7 2.5-.5 3.5A5 5 0 0 0 3 10c0 4.3 3 5.6 6.5 6-.6.4-.5 1-.5 2v3" /></>,
  shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" /><path d="m8 12 3 3 5-6" /></>,
  spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>,
}
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>
}
function Button({ children, onClick, secondary = false, disabled = false, icon, className = '' }: {
  children: ReactNode; onClick: () => void; secondary?: boolean; disabled?: boolean; icon?: IconName; className?: string
}) {
  return <button type="button" className={`button ${secondary ? 'secondary' : ''} ${className}`} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} size={17} />}{children}</button>
}
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}
function NumberField({ label, value, onChange, integer = false, hint }: {
  label: string; value: string | number; onChange: (value: string) => void; integer?: boolean; hint?: string
}) {
  return <Field label={label} hint={hint}><input type="number" min="0" max="10000000" step={integer ? '1' : 'any'} value={value}
    onChange={e => {
      const v = e.target.value
      if (v === '' || (integer ? /^\d+$/.test(v) : /^\d+(\.\d+)?$/.test(v)) && Number(v) <= 10000000) onChange(v)
    }} /></Field>
}
const platformLabels = { github: 'GitHub', 'azure-devops': 'Azure DevOps', mixed: 'GitHub + Azure DevOps', other: 'Other platform' }
const titles: Record<View, string> = { overview: 'Maturity overview', assessment: 'Customer assessment', report: 'Assessment report', library: 'Your assessments', methodology: 'Scoring methodology' }
const formatMoney = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

function Radar({ assessment }: { assessment: Assessment }) {
  const { results } = assess(assessment)
  const point = (index: number, radius: number) => {
    const angle = Math.PI / 3 * index - Math.PI / 2
    return [210 + Math.cos(angle) * radius, 165 + Math.sin(angle) * radius]
  }
  const points = (radius: number) => results.map((_, i) => point(i, radius).join(',')).join(' ')
  const labels = ['Governance', 'DevSecOps', 'Delivery', 'Change', 'Experience', 'Copilot']
  const ordered = [results[0], results[1], results[2], results[5], results[3], results[4]]
  return <figure className="radar"><svg viewBox="0 0 420 340" role="img" aria-label="Maturity radar: see the dimension table for exact scores. Missing dimensions are shown at zero on this chart only.">
    {[.25, .5, .75, 1].map(scale => <polygon key={scale} points={points(112 * scale)} className="radar-grid" />)}
    {results.map((_, i) => <line key={i} x1="210" y1="165" x2={point(i, 112)[0]} y2={point(i, 112)[1]} className="radar-grid" />)}
    <polygon points={ordered.map((r, i) => point(i, (r.score ?? 0) / 100 * 112).join(',')).join(' ')} className="radar-area" />
    {ordered.map((r, i) => <circle key={i} cx={point(i, (r.score ?? 0) / 100 * 112)[0]} cy={point(i, (r.score ?? 0) / 100 * 112)[1]} r="4" fill="var(--blue)" />)}
    {labels.map((label, i) => <text key={label} x={point(i, 145)[0]} y={point(i, 145)[1]} dy="4" textAnchor={i === 0 || i === 3 ? 'middle' : i < 3 ? 'start' : 'end'}>{label}</text>)}
  </svg><figcaption>Six dimensions. One connected picture.</figcaption></figure>
}

function Profile({ a, update, begin }: { a: Assessment; update: (patch: Partial<Assessment>) => void; begin: () => void }) {
  return <section className="panel profile">
    <div className="section-heading"><div><h2>Start with the current state.</h2><p>A little context makes the recommendations more useful.</p></div><span className="tag">Customer profile</span></div>
    <div className="form-grid">
      <Field label="Customer / organization *"><input value={a.customer} maxLength={200} onChange={e => update({ customer: e.target.value })} placeholder="e.g. Contoso Engineering" autoComplete="organization" /></Field>
      <Field label="Facilitator"><input value={a.facilitator} maxLength={200} onChange={e => update({ facilitator: e.target.value })} placeholder="Your name" autoComplete="name" /></Field>
      <Field label="Assessment date"><input type="date" value={a.date} onChange={e => { if (e.target.value) update({ date: e.target.value }) }} /></Field>
      <NumberField label="Number of developers" value={a.developers || ''} integer onChange={v => update({ developers: Number(v) })} hint="Leave blank if not yet known." />
      <Field label="Current development platform"><select value={a.platform} onChange={e => update({ platform: e.target.value as Assessment['platform'] })}>
        {Object.entries(platformLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></Field>
      <Field label="Target GitHub hosting"><select value={a.hosting} onChange={e => update({ hosting: e.target.value as Assessment['hosting'] })}>
        <option value="undecided">Not yet decided</option><option value="cloud">GitHub Enterprise Cloud</option><option value="server">GitHub Enterprise Server</option></select></Field>
      <Field label="Current Copilot plan"><select value={a.copilotPlan} onChange={e => update({ copilotPlan: e.target.value as Assessment['copilotPlan'] })}>
        <option value="undecided">Not yet confirmed</option><option value="none">Not deployed</option><option value="business">Copilot Business</option><option value="enterprise">Copilot Enterprise</option></select></Field>
      <NumberField label="Proposed Copilot seats" value={a.seats || ''} integer onChange={v => update({ seats: Number(v) })} />
      <Field label="Integrations & dependencies" hint="Boards, pipelines, packages, identity providers, and external systems."><textarea rows={3} maxLength={20000} value={a.dependencies} onChange={e => update({ dependencies: e.target.value })} placeholder="What needs to stay connected?" /></Field>
      <Field label="Constraints & decision criteria" hint="Residency, compliance, networking, budgets, or important deadlines."><textarea rows={3} maxLength={20000} value={a.constraints} onChange={e => update({ constraints: e.target.value })} placeholder="What must the target architecture respect?" /></Field>
    </div>
    <div className="form-footer"><p>30 questions · six dimensions · no external data collection</p><Button onClick={begin} disabled={!a.customer.trim()} icon="arrow">Continue to questions</Button></div>
  </section>
}

function Questionnaire({ a, update, questionIndex, setQuestionIndex, onFinish }: {
  a: Assessment; update: (patch: Partial<Assessment>) => void; questionIndex: number; setQuestionIndex: (i: number) => void; onFinish: () => void
}) {
  const q = allQuestions[questionIndex]
  const pillar = pillars.find(p => p.questions.some(item => item.id === q.id))!
  const answer = a.answers[q.id]
  const [notice, setNotice] = useState('')
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
  const note = answer?.evidence ?? ''
  const setAnswer = (value: Rating | 'na') => {
    if (value === 'na' && !note.trim()) { setNotice('Add a rationale in the evidence field before marking this question not applicable.'); return }
    update({ answers: { ...a.answers, [q.id]: { value, evidence: note } } })
    setNotice('')
  }
  const changeNote = (value: string) => {
    update({ answers: { ...a.answers, [q.id]: {
      value: answer?.value === 'na' && !value.trim() ? null : answer?.value ?? null,
      evidence: value,
    } } })
  }
  return <div className="question-layout">
    <aside ref={dimensionNav} className="dimension-nav" aria-label="Assessment dimensions">
      <button className="profile-link" onClick={() => setQuestionIndex(-1)}>Edit customer profile <Icon name="arrow" size={15} /></button>
      {pillars.map(p => {
        const count = p.questions.filter(item => isAnswered(a, item.id)).length
        return <button key={p.id} ref={p.id === pillar.id ? activeDimension : undefined} aria-current={p.id === pillar.id ? 'step' : undefined} className={`dimension-button ${p.id === pillar.id ? 'selected' : ''}`} onClick={() => setQuestionIndex(allQuestions.indexOf(p.questions[0]))}>
          <span className="dimension-dot" style={{ background: p.color }} /><span>{p.short}<small>{count} of {p.questions.length} answered</small></span>{count === p.questions.length && <Icon name="check" size={16} />}
        </button>
      })}
      <div className="privacy-note"><Icon name="shield" /><p>Saved in this browser.<br />Export a backup before clearing site data.</p></div>
    </aside>
    <section className="panel question-panel">
      <div className="question-meta"><span style={{ color: pillar.color }}>{pillar.name}</span><span>Question {questionIndex + 1} of {allQuestions.length}</span></div>
      <div className="question-steps" aria-label="Questions in this dimension">{pillar.questions.map(item => {
        const index = allQuestions.indexOf(item)
        return <button key={item.id} className={`${item.id === q.id ? 'current' : ''} ${isAnswered(a, item.id) ? 'answered' : ''}`} aria-label={`Question ${index + 1}${isAnswered(a, item.id) ? ', answered' : ''}`} aria-current={item.id === q.id ? 'step' : undefined} onClick={() => setQuestionIndex(index)}>{isAnswered(a, item.id) ? <Icon name="check" size={14} /> : index + 1}</button>
      })}</div>
      <h2 tabIndex={-1} ref={heading}>{q.title}</h2><p className="question-why">{q.why}</p>
      {q.critical && <span className="tag critical-tag"><Icon name="shield" size={13} /> Critical control · cannot be excluded</span>}
      <fieldset className="answer-options"><legend className="sr-only">Choose the statement closest to your current state</legend>
        {q.options.map((option, i) => <label key={option} className={`answer-option ${answer?.value === i ? 'chosen' : ''}`}>
          <input type="radio" name={q.id} checked={answer?.value === i} onChange={() => setAnswer(i as Rating)} />
          <span className="rating-number">{i}</span><span><strong>{ratingNames[i]}</strong><span>{option}</span></span>
          <span className="radio-mark" />
        </label>)}
      </fieldset>
      <Field label={answer?.value === 'na' ? 'Not-applicable rationale *' : 'Evidence & session notes'} hint={`Suggested evidence: ${q.evidence}. Notes are self-reported, not independently verified.`}>
        <textarea maxLength={20000} rows={3} value={note} onChange={e => changeNote(e.target.value)} placeholder="Record what you observed, who confirmed it, or why this is not applicable. Do not paste credentials or secrets." />
      </Field>
      <div className="question-tools">
        {!q.critical && <button className={`text-button ${answer?.value === 'na' ? 'active-text' : ''}`} onClick={() => setAnswer('na')}>{answer?.value === 'na' ? 'Marked not applicable' : 'Mark not applicable (requires rationale)'}</button>}
        {answer && <button className="text-button muted" onClick={() => { const answers = { ...a.answers }; delete answers[q.id]; update({ answers }) }}>Clear response & notes</button>}
      </div>
      {notice && <p className="inline-error" role="alert">{notice}</p>}
      <div className="form-footer"><Button secondary onClick={() => setQuestionIndex(questionIndex - 1)}>Back</Button>
        <span className="muted small">{isAnswered(a, q.id) ? 'Response recorded' : 'Unanswered · you can return later'}</span>
        {questionIndex < allQuestions.length - 1 ? <Button onClick={() => setQuestionIndex(questionIndex + 1)} icon="arrow">Next question</Button> : <Button onClick={onFinish} icon="arrow">View results</Button>}
      </div>
    </section>
  </div>
}

function DimensionTable({ a }: { a: Assessment }) {
  const { results } = assess(a)
  return <div className="dimension-table" role="table" aria-label="Maturity by dimension">
    <div className="dimension-row table-labels" role="row"><span role="columnheader">Dimension</span><span role="columnheader">Maturity</span><span role="columnheader">Score</span></div>
    {results.map(r => <div key={r.pillar.id} className="dimension-row" role="row">
      <div role="cell"><span className="dimension-name"><i style={{ background: r.pillar.color }} />{r.pillar.short}</span><small>{r.answered}/{r.total} rated · {r.pillar.weight}% weight{r.excluded ? ` · ${r.excluded} N/A` : ''}</small></div>
      <div role="cell"><div className="score-track"><span style={{ width: `${r.score ?? 0}%`, background: r.pillar.color }} /></div><small>{level(r.score)}</small></div>
      <strong role="cell">{r.score === null ? '—' : Math.round(r.score)}<small>/100</small></strong>
    </div>)}
  </div>
}

function Findings({ a, limit }: { a: Assessment; limit?: number }) {
  const r = assess(a)
  const findings = limit ? r.findings.slice(0, limit) : r.findings
  return <div className="findings">
    {r.criticalUnknown.length > 0 && <div className="finding"><Icon name="info" /><div><h3>Confirm {r.criticalUnknown.length} critical controls</h3><p>Unanswered critical questions keep the recommended path precautionary. They are not confirmed security findings.</p></div><span className="tag">Unknown</span></div>}
    {findings.map(f => <div className="finding" key={f.question.id}>
      <span className={`finding-marker ${f.priority.toLowerCase()}`}>{f.rating}/4</span>
      <div><h3>{f.question.title}</h3><p>{f.question.action}</p><small>{f.pillar.short} · Evidence to collect: {f.question.evidence}</small></div><span className={`tag priority-${f.priority.toLowerCase()}`}>{f.priority}</span>
    </div>)}
    {!r.findings.length && !r.criticalUnknown.length && <p className="empty-note">No responses below Managed. Validate reported controls with evidence before treating this as assurance.</p>}
  </div>
}

function Roadmap({ a }: { a: Assessment }) {
  return <div className="roadmap">{roadmap(a).map(w => <section key={w.days}>
    <div className="day-marker"><strong>{w.days}</strong><span>days</span></div><h3>{w.title}</h3><p className="roadmap-owner">{w.owner}</p>
    <ul>{w.actions.map(action => <li key={action}>{action}</li>)}</ul><p className="exit-criteria"><strong>Exit criteria</strong>{w.exit}</p>
  </section>)}</div>
}

function Overview({ a, go, resume }: { a: Assessment; go: (view: View) => void; resume: () => void }) {
  const r = assess(a)
  return <>
    <div className="page-intro"><div><h1>Your modernization,<br /><span>with a clear direction.</span></h1><p>A connected view of GitHub maturity, AI readiness, and what to do next.</p></div><Button onClick={resume} icon={r.complete ? 'list' : 'arrow'}>{r.complete ? 'Review responses' : 'Continue assessment'}</Button></div>
    <div className="overview-primary">
      <section className="panel maturity-panel"><div className="section-heading"><h2>Implementation maturity</h2><span className={`tag ${r.complete ? 'success-tag' : ''}`}>{r.complete ? 'Complete · self-reported' : 'Provisional'}</span></div>
        <div className="maturity-body"><div className="overall-score"><div><strong>{r.score === null ? '—' : Math.round(r.score)}</strong><span>/ 100</span></div><span className="level-label">{level(r.score)}</span><p>{r.score === null ? 'Answer the questions to establish your baseline.' : 'Weighted across assessed dimensions. Built from your customer responses.'}</p><div className="maturity-scale">{['Initial', 'Developing', 'Defined', 'Managed', 'Optimizing'].map((l, i) => <span className={level(r.score) === l ? 'current-level' : ''} key={l}><i />{i + 1}</span>)}</div></div><Radar assessment={a} /></div>
        <div className="metric-strip"><div><strong>{r.answered}<small> / {r.total}</small></strong><span>Questions answered</span></div><div><strong>{r.readinessScore === null ? '—' : Math.round(r.readinessScore)}<small> / 100</small></strong><span>Change readiness index</span></div><div><strong>{r.evidence}<small> / {r.rated}</small></strong><span>Responses with notes</span></div></div>
      </section>
      <section className="path-panel"><div className="path-icon"><Icon name={r.path === 'Secure DevOps' ? 'shield' : 'spark'} size={29} /></div><h2>Recommended journey</h2><h3>{r.path}</h3><p>{r.rationale}</p><div className="path-footnote">{r.complete ? 'Based on critical controls, platform, and hosting context.' : 'Preliminary direction. Complete all questions to confirm.'}</div><button onClick={() => go('report')}>Explore the recommendation <Icon name="arrow" size={18} /></button></section>
    </div>
    <div className="overview-secondary"><section className="panel"><div className="section-heading"><h2>Maturity by dimension</h2><button className="text-button" onClick={() => go('methodology')}>How scoring works <Icon name="arrow" size={14} /></button></div><DimensionTable a={a} /></section>
      <section className="panel priorities-panel"><div className="section-heading"><h2>Focus next</h2><span className="tag">{r.findings.length} opportunities</span></div><Findings a={a} limit={3} /><button className="text-button all-findings" onClick={() => go('report')}>View all findings <Icon name="arrow" size={15} /></button></section>
    </div>
    <section className="panel roadmap-panel"><div className="section-heading"><div><h2>From assessment to action.</h2><p>A proposed roadmap. Confirm owners, capacity, and milestones with the customer.</p></div><span className="tag">30 / 60 / 90 days</span></div><Roadmap a={a} /></section>
  </>
}

function Report({ a, exportReport, go }: { a: Assessment; exportReport: () => void; go: (view: View) => void }) {
  const r = assess(a)
  const b = businessCase(a)
  useEffect(() => {
    let collapsed: HTMLDetailsElement[] = []
    const beforePrint = () => {
      collapsed = Array.from(document.querySelectorAll<HTMLDetailsElement>('.evidence-register details:not([open])'))
      collapsed.forEach(detail => { detail.open = true })
    }
    const afterPrint = () => { collapsed.forEach(detail => { detail.open = false }); collapsed = [] }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [])
  return <div className="report-view">
    <div className="page-intro"><div><h1>{a.customer || 'Customer'}<br /><span>Assessment & action plan.</span></h1><p>{a.date} · {a.facilitator || 'Facilitator not specified'} · Methodology {methodologyVersion}</p></div><div className="actions no-print"><Button secondary icon="download" onClick={exportReport}>Export Markdown</Button><Button icon="report" onClick={() => window.print()}>Print / save PDF</Button></div></div>
    {!r.complete && <div className="notice no-print"><Icon name="info" /><p><strong>Provisional report.</strong> {r.total - r.answered} questions remain unanswered. Missing answers are not scored as zero.</p><button className="text-button" onClick={() => go('assessment')}>Complete assessment</button></div>}
    <section className="panel report-summary"><h2>Executive summary</h2><p><strong>{r.score === null ? 'Not assessed' : `${Math.round(r.score)}/100 · ${level(r.score)}`}</strong> implementation maturity, with {r.coverage}% response coverage. {r.evidence} of {r.rated} rated responses include evidence notes.</p><p><strong>Recommended path: {r.path}.</strong> {r.rationale}</p><p className="muted">This is a custom advisory framework based on self-reported responses, not an official GitHub certification or independently verified audit.</p></section>
    <section className="panel"><h2>Current state & maturity</h2><div className="context-summary"><div><span>Platform</span><strong>{platformLabels[a.platform]}</strong></div><div><span>Hosting target</span><strong>{a.hosting === 'undecided' ? 'To be confirmed' : a.hosting === 'cloud' ? 'Enterprise Cloud' : 'Enterprise Server'}</strong></div><div><span>Developers</span><strong>{a.developers || 'Not specified'}</strong></div><div><span>Copilot</span><strong>{a.copilotPlan}</strong></div></div><DimensionTable a={a} />
      <div className="context-notes"><div><h3>Dependencies</h3><p>{a.dependencies || 'Not yet documented.'}</p></div><div><h3>Constraints</h3><p>{a.constraints || 'Not yet documented.'}</p></div></div>
    </section>
    <section className="panel"><div className="section-heading"><h2>Decision matrix</h2><span className="tag">Rule-based recommendation</span></div>
      <div className="decision-matrix">{Object.entries(pathDescriptions).map(([path, description]) => <div key={path} className={r.path === path ? 'recommended' : ''}><h3>{path}{r.path === path && <Icon name="check" size={17} />}</h3><p>{description}</p><span>{r.path === path ? 'Recommended first' : 'Alternative / subsequent workstream'}</span></div>)}</div>
    </section>
    <section className="panel"><h2>Findings & recommendations</h2><Findings a={a} /></section>
    <section className="panel"><div className="section-heading"><div><h2>Architecture: from as-is to to-be</h2><p>Conceptual target for validation, not an approved solution design.</p></div></div>
      <div className="architecture"><div><span className="tag">As-is</span><h3>{platformLabels[a.platform]}</h3><p>{a.hosting} hosting target · {a.copilotPlan} Copilot plan</p><p>{a.dependencies || 'Inventory integrations and platform boundaries.'}</p></div><Icon name="arrow" size={28} /><div><span className="tag success-tag">Proposed to-be</span><h3>Governed GitHub + responsible AI</h3><p>Central identity → reviewed repositories → reusable CI/CD → protected environments.</p><p>{r.path === 'Hybrid' ? 'Retain required systems behind documented integration boundaries.' : 'Validate migration boundaries, hosting eligibility, and integration compatibility.'} Governed Copilot supports the engineering workflow.</p></div></div>
    </section>
    <section className="panel roadmap-panel"><div className="section-heading"><h2>Your 30/60/90-day roadmap</h2><span className="tag">Suggested owners & exit criteria</span></div><Roadmap a={a} /></section>
    <section className="panel"><h2>Pilot / POV deployment plan</h2><div className="pilot-plan"><div><h3>Scope</h3><p>One representative team and a non-critical workload, with a named sponsor and technical owner.</p></div><div><h3>Guardrails</h3><p>Confirm identity, data handling, approved AI policy, support, and a tested rollback before enabling the pilot.</p></div><div><h3>Success criteria</h3><p>Baseline developer friction, adoption, delivery, and quality. Agree on measurable go/no-go targets before launch.</p></div></div><p className="muted">Review at day 60. Expand only when customer-approved criteria are met and unresolved risks have owners.</p></section>
    <section className="panel"><div className="section-heading"><div><h2>Business case & licensing scenario</h2><p>Customer-provided assumptions only. Edit these in the questionnaire profile.</p></div><button className="text-button no-print" onClick={() => go('assessment')}>Edit assumptions <Icon name="arrow" size={15} /></button></div>
      <div className="business-results"><div><span>Proposed seats</span><strong>{a.seats}</strong></div><div><span>Annual license-only scenario</span><strong>{b.annual === null ? 'Not estimated' : formatMoney(b.annual)}</strong></div><div><span>Illustrative gross capacity value / year</span><strong>{b.gross === null ? 'Not estimated' : formatMoney(b.gross)}</strong></div></div>
      <p className="muted small">{b.annual !== null && `${a.seats} seats × ${a.seatCost} USD/month × 12. `}{b.gross !== null && `${a.seats} seats × ${a.hoursSaved} hours/week × ${a.hourlyRate} USD/hour × 46 weeks. `}Not a quote, guaranteed savings, or ROI. Excludes implementation, taxes, support, and existing licensing overlap. Confirm plan capabilities and commercial terms with procurement.</p>
    </section>
    <section className="panel evidence-register"><h2>Response & evidence register</h2>{pillars.map(p => <details key={p.id}><summary>{p.name}<span>{p.questions.filter(q => isAnswered(a, q.id)).length}/5 answered</span></summary>{p.questions.map(q => {
      const answer = a.answers[q.id]
      return <div className="evidence-item" key={q.id}><h3>{q.title}</h3><p>{!answer || answer.value === null ? 'Unanswered' : answer.value === 'na' ? 'Not applicable' : `${answer.value}/4 · ${q.options[answer.value]}`}</p><p className="muted">Evidence / rationale: {answer?.evidence || 'Not supplied.'}</p></div>
    })}</details>)}</section>
  </div>
}

function Methodology() {
  return <div className="methodology"><div className="page-intro"><div><h1>Transparent by design.</h1><p>Every score has a traceable answer. Every recommendation has a rule.</p></div><span className="tag">Methodology v{methodologyVersion}</span></div>
    <section className="panel"><h2>A custom advisory framework</h2><p>This assessment is a conversation aid for GitHub Enterprise and Copilot modernization. It is not an official GitHub benchmark, certification, compliance attestation, or independently verified audit. Evidence notes record what participants report; their presence does not prove a control is effective.</p></section>
    <section className="panel"><h2>How scores are calculated</h2><p>Each of the 30 questions has five specific statements, rated 0–4. Select the statement closest to the customer's actual current state, not the desired state.</p><div className="formula">Dimension = sum of ratings ÷ (4 × rated questions) × 100</div><p>The overall score is the weighted mean of dimensions with at least one numeric answer. If a dimension has no numeric answers, its weight is excluded and remaining weights are renormalized.</p><div className="weight-list">{pillars.map(p => <div key={p.id}><span>{p.name}</span><strong>{p.weight}%</strong></div>)}</div><p><strong>Missing ≠ zero.</strong> Unknown answers remain unanswered. A zero is an explicit statement that a practice is not established. Partial scores are always provisional and may rise or fall as answers are added.</p><p><strong>Not applicable.</strong> Requires a written rationale, is excluded from numeric scoring, and cannot be selected for critical controls. Answer coverage includes justified N/A responses; the dimension table separately shows rated and applicable questions.</p><p><strong>Readiness index.</strong> The equally weighted mean of assessed Governance, DevSecOps, and Change readiness dimension scores. This is separate from the six-dimension implementation maturity score. Missing dimensions make it provisional.</p><p><strong>Radar chart.</strong> Missing dimension scores are plotted at the center for visualization only, not treated as zeros in calculations. The accompanying table is authoritative.</p></section>
    <section className="panel"><h2>Five maturity levels</h2><div className="level-definitions">{[['Initial', '0 to <20', 'Practices are absent or largely reactive.'], ['Developing', '20 to <40', 'Some practices exist, but consistency is limited.'], ['Defined', '40 to <60', 'Practices are documented and repeatable.'], ['Managed', '60 to <80', 'Controls and adoption are actively governed.'], ['Optimizing', '80 to 100', 'Evidence supports continuous improvement.']].map(([name, range, description]) => <div key={name}><strong>{name}</strong><span>{range}</span><p>{description}</p></div>)}</div><p className="muted">Scores are displayed rounded; level thresholds use the unrounded score.</p></section>
    <section className="panel"><h2>Route selection & prioritization</h2><ol className="method-rules"><li>Missing critical controls or any critical rating below 2: <strong>Secure DevOps</strong> first. Unknown controls are precautionary, not confirmed vulnerabilities.</li><li>Mixed GitHub / Azure DevOps estate or an Enterprise Server target: <strong>Hybrid</strong>.</li><li>Primary platform outside GitHub: <strong>Migrate</strong>.</li><li>Otherwise: <strong>Optimize + Copilot</strong>.</li></ol><p>Critical gaps are critical-control ratings below 2. Other ratings below 2 are High; ratings of 2 are Medium. Findings are sorted by priority, then lowest rating, then dimension weight. Ratings of 3 or 4 do not create gap findings.</p><p>Hosting, regulatory constraints, dependencies, and commercial eligibility still need human review. Route selection is a first workstream, not a complete architecture decision.</p></section>
    <section className="panel"><h2>Data handling & references</h2><p>Assessments are stored in localStorage on this browser and origin. They are not encrypted by the app, synchronized, or sent to a server. Anyone with access to this browser profile can read them. Do not store secrets or regulated personal data. Export backups and handle report files as customer-confidential.</p><p>Changing browser, device, port, or hostname uses a different storage location. Clearing browser data deletes assessments. Imported files are validated before use.</p><div className="reference-links"><a href="https://docs.github.com/en/enterprise-cloud@latest/admin" target="_blank" rel="noreferrer">GitHub Enterprise documentation ↗</a><a href="https://docs.github.com/en/copilot" target="_blank" rel="noreferrer">GitHub Copilot documentation ↗</a><a href="https://github.com/features/copilot/plans" target="_blank" rel="noreferrer">Current Copilot plans ↗</a></div></section>
  </div>
}

export default function App() {
  const [loaded] = useState(loadSnapshot)
  const [snapshot, replaceSnapshot] = useState<Snapshot>(loaded.snapshot)
  const [blocked, setBlocked] = useState(Boolean(loaded.error))
  const [storageError, setStorageError] = useState(loaded.error)
  const [view, setView] = useState<View>('overview')
  const [questionIndex, setQuestionIndex] = useState(-1)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(!loaded.error)
  const fileInput = useRef<HTMLInputElement>(null)
  const mainHeading = useRef<HTMLElement>(null)
  const active = snapshot.assessments.find(a => a.id === snapshot.activeId)
  const result = active ? assess(active) : null
  const setSnapshot = (updater: (s: Snapshot) => Snapshot) => {
    if (blocked) return
    const next = updater(snapshot)
    replaceSnapshot(next)
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaved(true); setStorageError(null) }
    catch (error) { setSaved(false); setStorageError(`Could not save your latest changes. Export a backup now. ${error instanceof Error ? error.message : 'Storage is unavailable.'}`) }
  }
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) {
        setBlocked(true); setSaved(false)
        setStorageError('Assessment storage changed in another tab. Editing is paused to prevent overwriting it. Export your current work, then reload this tab.')
      }
    }
    window.addEventListener('storage', changed)
    return () => window.removeEventListener('storage', changed)
  }, [])
  useEffect(() => { mainHeading.current?.focus() }, [view])

  const update = (patch: Partial<Assessment>) => {
    if (!active || blocked) return
    setSnapshot(s => ({ ...s, assessments: s.assessments.map(a => a.id === active.id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a) }))
  }
  const add = (sample: boolean) => {
    if (blocked) return
    if (snapshot.assessments.length >= 200) { setMessage('This browser supports up to 200 assessments. Export and delete an older assessment before creating another.'); return }
    const a = sample ? exampleAssessment() : newAssessment()
    setSnapshot(s => ({ ...s, activeId: a.id, assessments: [...s.assessments, a] }))
    setQuestionIndex(-1); setView(sample ? 'overview' : 'assessment')
    setMessage('')
  }
  const go = (next: View) => { setView(next); if (next === 'assessment') setQuestionIndex(-1) }
  const resume = () => {
    if (!active) return
    const next = allQuestions.findIndex(q => !isAnswered(active, q.id))
    setQuestionIndex(active.customer.trim() ? next < 0 ? 0 : next : -1); setView('assessment')
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
    if (!file || blocked) return
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('The file is larger than 5 MB.')
      const imported = parseSnapshot(await file.text())
      if (!imported.assessments.length) throw new Error('The file contains no assessments.')
      if (snapshot.assessments.length + imported.assessments.length > 200) throw new Error('Import would exceed the 200-assessment limit.')
      const copies = imported.assessments.map(a => ({ ...a, id: crypto.randomUUID() }))
      const index = imported.assessments.findIndex(a => a.id === imported.activeId)
      setSnapshot(s => ({ schemaVersion: 1, assessments: [...s.assessments, ...copies], activeId: copies[Math.max(index, 0)].id }))
      setView('overview'); setMessage(`Imported ${copies.length} assessment${copies.length === 1 ? '' : 's'} as new copies. Existing assessments were not overwritten.`)
    } catch (error) { setMessage(`Import failed. ${error instanceof Error ? error.message : 'The file could not be read.'}`) }
  }
  const remove = (a: Assessment) => {
    if (blocked || !window.confirm(`Delete "${a.customer || 'Untitled assessment'}" from this browser? Export a backup first. This cannot be undone.`)) return
    setSnapshot(s => {
      const assessments = s.assessments.filter(item => item.id !== a.id)
      return { ...s, assessments, activeId: s.activeId === a.id ? assessments[0]?.id ?? null : s.activeId }
    })
    setMessage('Assessment deleted from this browser.')
  }
  const exportReport = () => { if (active) download(`${fileStem(active.customer)}-report.md`, reportMarkdown(active), 'text/markdown;charset=utf-8') }
  const nav: { view: View; icon: IconName; label: string }[] = [
    { view: 'overview', icon: 'grid', label: 'Overview' }, { view: 'assessment', icon: 'list', label: 'Questionnaire' },
    { view: 'report', icon: 'report', label: 'Report & roadmap' }, { view: 'library', icon: 'folder', label: 'Assessments' },
    { view: 'methodology', icon: 'info', label: 'Methodology' },
  ]
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="app-shell">
    <aside className="sidebar no-print">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); go('overview') }}><span className="brand-mark"><Icon name="github" size={27} /></span><span>GitHub<span>Maturity Assessment</span></span></a>
      <div className="workspace-label">ASSESSMENT WORKSPACE</div>
      <nav aria-label="Main navigation">{nav.map(item => <button key={item.view} aria-label={item.label} aria-current={view === item.view ? 'page' : undefined} className={view === item.view ? 'nav-active' : ''} onClick={() => go(item.view)}><Icon name={item.icon} /><span>{item.label}</span>{item.view === 'assessment' && result && <small>{result.coverage}%</small>}</button>)}</nav>
      <div className="sidebar-session"><span>Current assessment</span><strong>{active?.customer || (active ? 'Untitled assessment' : 'No assessment yet')}</strong>{active && <><div className="mini-track"><i style={{ width: `${result?.coverage ?? 0}%` }} /></div><small>{result?.answered} of {allQuestions.length} questions answered</small></>}<button className="text-button" onClick={() => add(false)} disabled={blocked}><Icon name="plus" size={15} /> New assessment</button></div>
      <div className="sidebar-bottom"><Icon name="shield" size={18} /><div>Local-first. Customer-owned.<small>No answers sent to a server.</small></div></div>
    </aside>
    <div className="main-shell"><header className="topbar no-print"><div className="breadcrumb">Workspace <span>/</span><strong>{titles[view]}</strong></div><div className="topbar-actions"><span className={`save-status ${storageError ? 'save-error' : ''}`}><i />{storageError ? 'Storage needs attention' : saved ? 'Saved on this device' : 'Saving…'}</span><button className="icon-button" onClick={() => exportJson()} aria-label="Export assessment JSON"><Icon name="download" size={18} /></button><span className="avatar" aria-label="Local workspace">LM</span></div></header>
      <main id="main-content" ref={mainHeading} tabIndex={-1}>
        {storageError && <div className="notice error-notice no-print" role="alert"><Icon name="info" /><div><strong>Protect your assessment data.</strong><p>{storageError}</p><div className="actions"><button className="text-button" onClick={() => exportJson(true)}>Export current work</button>{blocked && <button className="text-button" onClick={() => {
          try { download('assessment-storage-recovery.txt', localStorage.getItem(storageKey) ?? '', 'text/plain') }
          catch (error) { setMessage(`Recovery export failed: ${error instanceof Error ? error.message : 'Storage unavailable'}`) }
        }}>Download stored recovery data</button>}<button className="text-button" onClick={() => window.location.reload()}>Reload</button>{loaded.error && <button className="text-button danger-text" onClick={() => {
          if (!window.confirm('Reset only this app’s stored assessments? Download the recovery data first. This permanently deletes saved assessment data.')) return
          try { localStorage.removeItem(storageKey); window.location.reload() }
          catch (error) { setMessage(`Reset failed: ${error instanceof Error ? error.message : 'Storage unavailable'}`) }
        }}>Reset app storage</button>}</div></div></div>}
        {message && <div className="notice no-print" role="status"><Icon name="info" /><p>{message}</p><button className="text-button" onClick={() => setMessage('')} aria-label="Dismiss notification">Dismiss</button></div>}
        {active?.sample && view !== 'library' && <div className="sample-banner"><span className="tag">Sample data</span><p>Northstar is a fictional organization. All responses are illustrative.</p><button className="text-button no-print" onClick={() => add(false)} disabled={blocked}>Start a real assessment <Icon name="arrow" size={15} /></button></div>}
        {view === 'methodology' ? <Methodology /> : view === 'library' ? <>
          <div className="page-intro"><div><h1>Your assessments.</h1><p>Keep customer sessions separate. Export a backup to take your work with you.</p></div><Button icon="plus" onClick={() => add(false)} disabled={blocked}>New assessment</Button></div>
          <div className="library-toolbar"><span>{snapshot.assessments.length} saved on this browser</span><div className="actions"><Button secondary icon="upload" onClick={() => fileInput.current?.click()} disabled={blocked}>Import JSON</Button><Button secondary icon="download" onClick={() => exportJson(true)} disabled={!snapshot.assessments.length}>Export all</Button></div></div>
          {!snapshot.assessments.length ? <div className="panel empty-library"><Icon name="folder" size={36} /><h2>A clean slate.</h2><p>Create your first assessment or import an exported JSON file.</p></div> : <div className="assessment-list">{snapshot.assessments.map(a => {
            const r = assess(a)
            return <article className="assessment-list-item" key={a.id}><div className="customer-avatar">{(a.customer || 'U').slice(0, 2).toUpperCase()}</div><div><h2>{a.customer || 'Untitled assessment'}{a.sample && <span className="tag">Sample</span>}</h2><p>{a.date} · {platformLabels[a.platform]} · {r.answered}/{r.total} answered</p></div><div className="library-score"><strong>{r.score === null ? '—' : Math.round(r.score)}</strong><small>{r.complete ? level(r.score) : 'Provisional'}</small></div><Button secondary onClick={() => { setSnapshot(s => ({ ...s, activeId: a.id })); setView('overview') }} disabled={blocked}>Open</Button><button className="icon-button danger-text" onClick={() => remove(a)} disabled={blocked} aria-label={`Delete ${a.customer || 'untitled assessment'}`}><Icon name="trash" size={18} /></button></article>
          })}</div>}
        </> : !active ? <div className="welcome">
          <div className="welcome-symbol"><Icon name="github" size={48} /></div><h1>A clearer path to<br /><span>GitHub maturity.</span></h1><p>Turn a customer conversation into a practical modernization plan for GitHub Enterprise and Copilot.</p><div className="actions"><Button icon="plus" onClick={() => add(false)} disabled={blocked}>Start an assessment</Button><Button secondary icon="grid" onClick={() => add(true)} disabled={blocked}>Explore sample dashboard</Button></div><div className="welcome-flow"><span><strong>Understand</strong>30 guided questions</span><Icon name="arrow" /><span><strong>Assess</strong>Six maturity dimensions</span><Icon name="arrow" /><span><strong>Act</strong>A 30/60/90-day roadmap</span></div><div className="welcome-note"><Icon name="shield" size={18} /><span>Answers stay in this browser. No sign-in or GitHub token required.<br />A custom advisory framework, not an official GitHub certification.</span></div><button className="text-button" onClick={() => fileInput.current?.click()} disabled={blocked}>Already have an assessment? Import JSON <Icon name="upload" size={15} /></button>
        </div> : view === 'overview' ? <Overview a={active} go={go} resume={resume} />
          : view === 'assessment' ? <>
            <div className="page-intro compact"><div><h1>{questionIndex < 0 ? 'Set the scene.' : 'Understand the current state.'}</h1><p>{active.customer || 'New customer'} · Honest answers make useful recommendations.</p></div><span className="tag">{result?.answered}/{allQuestions.length} answered</span></div>
            <fieldset className="editing-boundary" disabled={blocked}>{questionIndex < 0 ? <>
              <Profile a={active} update={update} begin={() => setQuestionIndex(Math.max(0, allQuestions.findIndex(q => !isAnswered(active, q.id))))} />
              <section className="panel assumptions"><h2>Optional business-case assumptions</h2><p>Use your customer's contracted or proposed price, not a list price assumption. Values are in USD. Leave blank to omit estimates.</p><div className="form-grid three-columns"><NumberField label="Monthly price per Copilot seat (USD)" value={active.seatCost} onChange={v => update({ seatCost: v })} /><NumberField label="Assumed hours saved / seat / week" value={active.hoursSaved} onChange={v => update({ hoursSaved: v })} /><NumberField label="Loaded hourly rate (USD)" value={active.hourlyRate} onChange={v => update({ hourlyRate: v })} /></div><p className="small muted">Illustrative capacity value uses 46 working weeks. It is not guaranteed savings or ROI, and excludes implementation and support costs.</p></section>
            </> : <Questionnaire key={questionIndex} a={active} update={update} questionIndex={questionIndex} setQuestionIndex={setQuestionIndex} onFinish={() => go('overview')} />}</fieldset>
          </> : <Report a={active} exportReport={exportReport} go={go} />}
        <footer className="page-footer"><span>GitHub Maturity Assessment <span>·</span> Advisory framework v{methodologyVersion}</span><span>Clarity before change.</span></footer>
      </main>
      <input className="sr-only" type="file" accept=".json,application/json" ref={fileInput} onChange={importJson} aria-label="Import assessment JSON file" tabIndex={-1} />
    </div>
    </div>
  </>
}
