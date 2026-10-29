import { describe, expect, it } from 'vitest'
import { allQuestions, exampleAssessment, newAssessment, pillars } from './model'
import type { Rating } from './model'
import { assess, businessCase, level, pillarResult, roadmap } from './scoring'
import { reportMarkdown } from './report'
import { parseSnapshot, validateAssessment } from './storage'

function filled(value: Rating = 2) {
  const a = newAssessment()
  a.customer = 'Test customer'
  a.answers = Object.fromEntries(allQuestions.map(q => [q.id, { value, evidence: '' }]))
  return a
}

describe('questionnaire integrity', () => {
  it('has 30 unique questions and dimension weights totaling 100', () => {
    expect(allQuestions).toHaveLength(30)
    expect(new Set(allQuestions.map(q => q.id)).size).toBe(30)
    expect(pillars.reduce((sum, p) => sum + p.weight, 0)).toBe(100)
    expect(allQuestions.every(q => q.options.length === 5 && q.action && q.evidence)).toBe(true)
  })
})

describe('scoring', () => {
  it('does not turn unanswered questions into zero scores', () => {
    const r = assess(newAssessment())
    expect(r.score).toBeNull()
    expect(r.coverage).toBe(0)
    expect(r.complete).toBe(false)
    expect(r.findings).toEqual([])
    expect(r.path).toBe('Secure DevOps')
    expect(r.criticalUnknown).toHaveLength(4)
  })
  it('retains evidence-only responses without counting them as answered', () => {
    const a = newAssessment()
    a.answers.identity = { value: null, evidence: 'Need to ask the identity owner.' }
    const r = assess(a)
    expect(r.answered).toBe(0)
    expect(r.score).toBeNull()
    expect(r.criticalUnknown).toHaveLength(4)
    expect(validateAssessment(a).answers.identity.evidence).toContain('identity owner')
  })
  it.each([0, 1, 2, 3, 4] as Rating[])('maps uniform rating %i to the expected percentage', value => {
    const r = assess(filled(value))
    expect(r.score).toBe(value * 25)
    expect(r.coverage).toBe(100)
    expect(r.complete).toBe(true)
  })
  it('renormalizes weights only across dimensions with numeric answers', () => {
    const a = newAssessment()
    a.answers.identity = { value: 4, evidence: '' }
    a.answers.secrets = { value: 0, evidence: '' }
    a.answers.onboarding = { value: 2, evidence: '' }
    expect(assess(a).score).toBeCloseTo((100 * 20 + 50 * 15) / 55)
    expect(assess(a).complete).toBe(false)
  })
  it('excludes not-applicable questions and counts their rationale separately from evidence', () => {
    const a = newAssessment()
    a.answers.ownership = { value: 4, evidence: 'Verified owner.' }
    a.answers.licensing = { value: 'na', evidence: 'Procurement out of scope.' }
    const r = pillarResult(pillars[0], a)
    expect(r.score).toBe(100)
    expect(r.answered).toBe(1)
    expect(r.total).toBe(4)
    expect(r.excluded).toBe(1)
    expect(assess(a).answered).toBe(2)
    expect(assess(a).evidence).toBe(1)
  })
  it('can exclude an entire noncritical dimension without a fake zero', () => {
    const a = filled(4)
    pillars[3].questions.forEach(q => { a.answers[q.id] = { value: 'na', evidence: 'Out of scope.' } })
    expect(assess(a).score).toBe(100)
    expect(assess(a).results[3].score).toBeNull()
    expect(assess(a).complete).toBe(true)
  })
  it.each([
    [0, 'Initial'], [19.999, 'Initial'], [20, 'Developing'], [39.999, 'Developing'],
    [40, 'Defined'], [59.999, 'Defined'], [60, 'Managed'], [79.999, 'Managed'],
    [80, 'Optimizing'], [100, 'Optimizing'],
  ])('uses the exact, unrounded boundary %s', (score, expected) => expect(level(Number(score))).toBe(expected))
  it('calculates readiness from governance, security, and change only', () => {
    const a = filled(0)
    pillars[0].questions.forEach(q => { a.answers[q.id].value = 4 })
    pillars[1].questions.forEach(q => { a.answers[q.id].value = 2 })
    expect(assess(a).readinessScore).toBe(50)
  })
})

describe('recommendations', () => {
  it('critical gaps take precedence over a high overall score', () => {
    const a = filled(4)
    a.platform = 'mixed'
    a.answers.identity.value = 1
    const r = assess(a)
    expect(r.score).toBeGreaterThan(90)
    expect(r.path).toBe('Secure DevOps')
    expect(r.findings[0].priority).toBe('Critical')
  })
  it('does not describe unanswered critical controls as confirmed gaps', () => {
    const a = filled()
    delete a.answers.identity
    expect(assess(a).criticalGaps).toHaveLength(0)
    expect(assess(a).rationale).toContain('not a confirmed security finding')
  })
  it('routes a mixed estate or server target to Hybrid', () => {
    const a = filled()
    a.platform = 'mixed'
    expect(assess(a).path).toBe('Hybrid')
    a.platform = 'github'
    a.hosting = 'server'
    expect(assess(a).path).toBe('Hybrid')
  })
  it('routes an external platform to Migrate and GitHub to Optimize + Copilot', () => {
    const a = filled()
    a.platform = 'azure-devops'
    expect(assess(a).path).toBe('Migrate')
    a.platform = 'github'
    expect(assess(a).path).toBe('Optimize + Copilot')
  })
  it('orders findings by priority, then lowest rating', () => {
    const a = filled(3)
    a.answers.identity.value = 1
    a.answers.feedback.value = 0
    a.answers.ownership.value = 1
    a.answers.licensing.value = 2
    expect(assess(a).findings.map(f => f.question.id)).toEqual(['identity', 'feedback', 'ownership', 'licensing'])
  })
  it('generates all three roadmap horizons with owners and exit criteria', () => {
    const plan = roadmap(filled())
    expect(plan.map(p => p.days)).toEqual(['30', '60', '90'])
    expect(plan.every(p => p.owner && p.exit && p.actions.length)).toBe(true)
  })
})

describe('business scenarios', () => {
  it('does not invent missing costs or productivity values', () => {
    expect(businessCase(newAssessment())).toEqual({ monthly: null, annual: null, gross: null })
  })
  it('calculates only explicit assumptions and preserves legitimate zeros', () => {
    const a = filled()
    Object.assign(a, { seats: 10, seatCost: '20', hoursSaved: '2', hourlyRate: '50' })
    expect(businessCase(a)).toEqual({ monthly: 200, annual: 2400, gross: 46000 })
    a.seatCost = '0'
    expect(businessCase(a).annual).toBe(0)
  })
})

describe('import validation', () => {
  const wrap = (a: unknown) => JSON.stringify({ schemaVersion: 1, assessments: [a], activeId: (a as { id: string }).id })
  it('round-trips an exported assessment without losing evidence', () => {
    const a = exampleAssessment()
    expect(parseSnapshot(wrap(a)).assessments[0]).toEqual(a)
  })
  it.each([5, -1, 1.5, '4', null, false])('rejects invalid input when the answer object is %s', value => {
    const a = filled()
    const invalid = { ...a, answers: { identity: value } }
    expect(() => parseSnapshot(wrap(invalid))).toThrow()
  })
  it('rejects unknown question identifiers', () => {
    const a = filled()
    a.answers.typo = { value: 4, evidence: '' }
    expect(() => parseSnapshot(wrap(a))).toThrow('Invalid question')
  })
  it('rejects N/A for critical controls and missing rationales for other controls', () => {
    const a = filled()
    a.answers.identity = { value: 'na', evidence: 'Exclusion' }
    expect(() => validateAssessment(a)).toThrow('critical controls')
    a.answers.identity.value = 2
    a.answers.ownership = { value: 'na', evidence: ' ' }
    expect(() => validateAssessment(a)).toThrow('rationale')
  })
  it('rejects invalid enums, negative counts, and nonnumeric scenario amounts', () => {
    expect(() => validateAssessment({ ...filled(), platform: 'typo' })).toThrow()
    expect(() => validateAssessment({ ...filled(), seats: -1 })).toThrow()
    expect(() => validateAssessment({ ...filled(), developers: 1.5 })).toThrow()
    expect(() => validateAssessment({ ...filled(), seatCost: 'Infinity' })).toThrow()
    expect(() => validateAssessment({ ...filled(), hoursSaved: '-2' })).toThrow()
  })
  it('rejects a future schema, duplicate IDs, and missing active IDs', () => {
    const a = filled()
    expect(() => parseSnapshot(JSON.stringify({ schemaVersion: 2, assessments: [], activeId: null }))).toThrow()
    expect(() => parseSnapshot(JSON.stringify({ schemaVersion: 1, assessments: [a, a], activeId: a.id }))).toThrow('Duplicate')
    expect(() => parseSnapshot(JSON.stringify({ schemaVersion: 1, assessments: [a], activeId: 'missing' }))).toThrow('active')
  })
  it('rejects a malformed value in a correctly shaped answer', () => {
    expect(() => validateAssessment({ ...filled(), answers: { identity: { value: 7, evidence: '' } } })).toThrow()
  })
})

describe('reports', () => {
  it('includes the required deliverables and transparent limitations', () => {
    const report = reportMarkdown(exampleAssessment())
    for (const section of ['SYNTHETIC SAMPLE', 'Executive summary', 'Current state', 'Maturity by dimension', 'Findings & recommendations',
      'Architecture', '30/60/90-day roadmap', 'Pilot / POV', 'Business case', 'Response and evidence register', 'Methodology & limitations']) {
      expect(report).toContain(section)
    }
    expect(report).toContain('not an official GitHub')
    expect(report).toContain('License cost not estimated')
  })
  it('labels incomplete exports and includes unscored notes', () => {
    const a = newAssessment()
    a.answers.identity = { value: null, evidence: 'Awaiting confirmation' }
    const report = reportMarkdown(a)
    expect(report).toContain('PROVISIONAL')
    expect(report).toContain('Awaiting confirmation')
    expect(report).toContain('Response: Unanswered')
  })
})
