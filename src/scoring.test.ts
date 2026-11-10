import { describe, expect, it } from 'vitest'
import { allQuestions, exampleAssessment, isProfileComplete, newAssessment, pillars } from './model'
import type { Rating } from './model'
import { assess, level, pillarResult, roadmap } from './scoring'
import { reportMarkdown } from './report'
import { parseSnapshot, validateAssessment } from './storage'

function filled(value: Rating = 2) {
  const a = newAssessment()
  a.customer = 'Test customer'
  a.platform = 'github'
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

describe('customer details', () => {
  it('requires an explicit platform and a non-blank name for Other', () => {
    const a = newAssessment()
    a.customer = 'Test customer'
    expect(a.platform).toBe('')
    expect(isProfileComplete(a)).toBe(false)
    a.platform = 'gitlab'
    expect(isProfileComplete(a)).toBe(true)
    a.platform = 'other'
    for (const name of ['', '   ', '\t']) {
      a.otherPlatform = name
      expect(isProfileComplete(a)).toBe(false)
    }
    a.otherPlatform = 'Custom SCM'
    expect(isProfileComplete(a)).toBe(true)
    a.customer = ' '
    expect(isProfileComplete(a)).toBe(false)
  })
  it.each(['gitlab', 'bitbucket', 'other'] as const)('routes %s to Migrate unless critical controls take precedence', platform => {
    const a = filled()
    Object.assign(a, { platform, otherPlatform: platform === 'other' ? 'Custom SCM' : '' })
    expect(assess(a).path).toBe('Migrate')
    a.answers.identity.value = 0
    expect(assess(a).path).toBe('Secure DevOps')
  })
})

describe('import validation', () => {
  const wrap = (a: unknown) => JSON.stringify({ schemaVersion: 2, assessments: [a], activeId: (a as { id: string }).id })
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
  it('rejects invalid enums, negative counts, and malformed Other names', () => {
    expect(() => validateAssessment({ ...filled(), platform: 'typo' })).toThrow()
    expect(() => validateAssessment({ ...filled(), developers: 1.5 })).toThrow()
    expect(() => validateAssessment({ ...filled(), developers: -1 })).toThrow()
    expect(() => validateAssessment({ ...filled(), githubPlan: 'copilot' })).toThrow()
    expect(() => validateAssessment({ ...filled(), platform: 'other', otherPlatform: null })).toThrow()
    expect(() => validateAssessment({ ...filled(), platform: 'other', otherPlatform: 'x'.repeat(201) })).toThrow()
  })
  it('rejects a future schema, duplicate IDs, and missing active IDs', () => {
    const a = filled()
    expect(() => parseSnapshot(JSON.stringify({ schemaVersion: 3, assessments: [], activeId: null }))).toThrow()
    expect(() => parseSnapshot(JSON.stringify({ schemaVersion: 1, assessments: [a, a], activeId: a.id }))).toThrow('Duplicate')
    expect(() => parseSnapshot(JSON.stringify({ schemaVersion: 1, assessments: [a], activeId: 'missing' }))).toThrow('active')
  })
  it('rejects a malformed value in a correctly shaped answer', () => {
    expect(() => validateAssessment({ ...filled(), answers: { identity: { value: 7, evidence: '' } } })).toThrow()
  })
  it('migrates v1 exports without misrepresenting Copilot as a GitHub subscription', () => {
    const a = filled()
    const legacy = { ...a, copilotPlan: 'enterprise', dependencies: 'Removed integrations', constraints: 'Removed restrictions',
      seats: 1000, seatCost: '0.004', hoursSaved: '0.004', hourlyRate: '50' }
    const before = structuredClone(legacy)
    const migrated = parseSnapshot(JSON.stringify({ schemaVersion: 1, assessments: [legacy], activeId: a.id }))
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.assessments[0].githubPlan).toBe('undecided')
    expect(migrated.assessments[0].answers).toEqual(a.answers)
    expect(migrated.assessments[0].otherPlatform).toBe('')
    for (const field of ['copilotPlan', 'dependencies', 'constraints', 'seats', 'seatCost', 'hoursSaved', 'hourlyRate']) {
      expect(migrated.assessments[0]).not.toHaveProperty(field)
    }
    expect(legacy).toEqual(before)
  })
  it('retains v1 Other records as editable drafts instead of inventing their platform name', () => {
    const a = { ...filled(), platform: 'other' }
    const migrated = parseSnapshot(JSON.stringify({ schemaVersion: 1, assessments: [a], activeId: a.id })).assessments[0]
    expect(migrated.platform).toBe('other')
    expect(migrated.otherPlatform).toBe('')
    expect(isProfileComplete(migrated)).toBe(false)
  })
  it('strips removed fields from v2 imports and clears hidden Other data', () => {
    const a = { ...filled(), otherPlatform: 'Not selected', dependencies: 'Removed', copilotPlan: 'business', seatCost: '123' }
    const cleaned = parseSnapshot(wrap(a)).assessments[0]
    expect(cleaned.otherPlatform).toBe('')
    expect(cleaned).not.toHaveProperty('dependencies')
    expect(cleaned).not.toHaveProperty('copilotPlan')
    expect(cleaned).not.toHaveProperty('seatCost')
  })
  it.each(['business', 'enterprise', 'undecided', 'none'] as const)('round-trips the GitHub %s plan without modifying answers', githubPlan => {
    const a = { ...filled(), platform: 'other' as const, otherPlatform: 'São Paulo SCM / Bogotá', githubPlan }
    expect(parseSnapshot(wrap(a)).assessments[0]).toEqual(a)
  })
})

describe('reports', () => {
  it('includes the required deliverables and transparent limitations', () => {
    const report = reportMarkdown(exampleAssessment())
    for (const section of ['SYNTHETIC SAMPLE', 'Executive summary', 'Current state', 'Maturity by dimension', 'Findings & recommendations',
      'Architecture', '30/60/90-day roadmap', 'Pilot / POV', 'Response and evidence register', 'Methodology & limitations']) {
      expect(report).toContain(section)
    }
    expect(report).toContain('not an official GitHub')
    expect(report).toContain('GitHub Enterprise')
    for (const removed of ['Business case', 'License cost', 'Dependencies:', 'Constraints:', 'Copilot plan:']) expect(report).not.toContain(removed)
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
