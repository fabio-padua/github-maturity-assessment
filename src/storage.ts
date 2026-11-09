import { allQuestions, platforms } from './model'
import type { Answer, Assessment, Platform } from './model'
import { AssessmentError, message } from './i18n/core'
import type { Message } from './i18n/core'

// Keep the original key so existing local work is migrated on load.
export const storageKey = 'github-maturity-assessment:v1'
export const demoMode = import.meta.env?.VITE_DEMO_MODE === 'true'
export const schemaVersion = 2
export type Snapshot = { schemaVersion: 2; assessments: Assessment[]; activeId: string | null }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown, max = 20000): value is string => typeof value === 'string' && value.length <= max

function text(value: unknown, field: string, max = 20000): string {
  if (!isText(value, max)) throw new AssessmentError('error.field', { field })
  return value
}

function platform(value: unknown): Platform {
  if (value === '') return ''
  for (const option of platforms) if (value === option) return option
  throw new AssessmentError('storage.the_assessment_platform_or_plan_is_invalid')
}

function hosting(value: unknown): Assessment['hosting'] {
  if (value === 'cloud' || value === 'server' || value === 'undecided') return value
  throw new AssessmentError('storage.the_assessment_platform_or_plan_is_invalid')
}

function plan(value: unknown): Assessment['githubPlan'] {
  if (value === 'none' || value === 'business' || value === 'enterprise' || value === 'undecided') return value
  throw new AssessmentError('storage.the_assessment_platform_or_plan_is_invalid')
}

export function validateAssessment(value: unknown, version: 1 | 2 = 2): Assessment {
  if (!isRecord(value)) throw new AssessmentError('storage.an_assessment_must_be_a_json_object')
  const id = text(value.id, 'id', 100)
  const date = text(value.date, 'date')
  const updatedAt = text(value.updatedAt, 'updatedAt')
  const parsedDate = new Date(`${date}T00:00:00Z`)
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== date || !Number.isFinite(Date.parse(updatedAt))) {
    throw new AssessmentError('storage.the_assessment_identifier_or_dates_are_invalid')
  }
  if (typeof value.developers !== 'number' || !Number.isInteger(value.developers) || value.developers < 0 || value.developers > 10000000) {
    throw new AssessmentError('error.count', { field: 'developers' })
  }
  if (typeof value.sample !== 'boolean') throw new AssessmentError('storage.the_assessment_platform_or_plan_is_invalid')
  if (!isRecord(value.answers)) throw new AssessmentError('storage.the_assessment_answers_must_be_an_object')
  const answers: Record<string, Answer> = {}
  for (const [id, answer] of Object.entries(value.answers)) {
    const question = allQuestions.find(q => q.id === id)
    if (!question || !isRecord(answer) || !isText(answer.evidence)
      || !(answer.value === null || answer.value === 'na' || answer.value === 0 || answer.value === 1
        || answer.value === 2 || answer.value === 3 || answer.value === 4)) {
      throw new AssessmentError('error.answer', { id })
    }
    if (answer.value === 'na' && (question.critical || !answer.evidence.trim())) {
      throw new AssessmentError('error.na', { id })
    }
    answers[id] = { value: answer.value, evidence: answer.evidence }
  }
  const selectedPlatform = platform(value.platform)
  return {
    id, date, updatedAt,
    customer: text(value.customer, 'customer'),
    facilitator: text(value.facilitator, 'facilitator'),
    platform: selectedPlatform,
    otherPlatform: version === 1 ? '' : selectedPlatform === 'other'
      ? text(value.otherPlatform, 'otherPlatform', 200) : '',
    hosting: hosting(value.hosting),
    // A former Copilot subscription does not imply a GitHub subscription.
    githubPlan: version === 1 ? 'undecided' : plan(value.githubPlan),
    developers: value.developers, sample: value.sample, answers,
  }
}

export function parseSnapshot(source: string): Snapshot {
  let value: unknown
  try { value = JSON.parse(source) }
  catch { throw new AssessmentError('error.json') }
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2)
    || !Array.isArray(value.assessments) || value.assessments.length > 200) {
    throw new AssessmentError('storage.unsupported_file_expected_a_version_1_assessment_export_with')
  }
  const version = value.schemaVersion
  const assessments = value.assessments.map(a => validateAssessment(a, version))
  if (new Set(assessments.map(a => a.id)).size !== assessments.length) throw new AssessmentError('storage.duplicate_assessment_identifiers_found')
  if (value.activeId !== null && (typeof value.activeId !== 'string' || !assessments.some(a => a.id === value.activeId))) {
    throw new AssessmentError('storage.the_active_assessment_does_not_exist_in_this_file')
  }
  return { schemaVersion, assessments, activeId: value.activeId }
}

export function loadSnapshot(): { snapshot: Snapshot; error: Message | null } {
  const empty: Snapshot = { schemaVersion, assessments: [], activeId: null }
  if (demoMode) return { snapshot: empty, error: null }
  try {
    const source = localStorage.getItem(storageKey)
    return { snapshot: source ? parseSnapshot(source) : empty, error: null }
  } catch {
    return { snapshot: empty, error: message('error.load') }
  }
}
