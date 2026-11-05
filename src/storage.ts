import { allQuestions } from './model'
import type { Assessment } from './model'
import { AssessmentError, message } from './i18n/core'
import type { Message } from './i18n/core'

export const storageKey = 'github-maturity-assessment:v1'
export const demoMode = import.meta.env?.VITE_DEMO_MODE === 'true'
export type Snapshot = { schemaVersion: 1; assessments: Assessment[]; activeId: string | null }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown, max = 20000): value is string => typeof value === 'string' && value.length <= max
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10000000
const isAmount = (value: unknown) => isText(value, 30) && (value === '' || /^\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && Number(value) <= 10000000)

export function validateAssessment(value: unknown): Assessment {
  if (!isRecord(value)) throw new AssessmentError('storage.an_assessment_must_be_a_json_object')
  for (const field of ['id', 'customer', 'facilitator', 'date', 'dependencies', 'constraints', 'updatedAt']) {
    if (!isText(value[field], field === 'id' ? 100 : 20000)) throw new AssessmentError('error.field', { field })
  }
  const date = String(value.date)
  const parsedDate = new Date(`${date}T00:00:00Z`)
  if (!value.id || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime())
    || parsedDate.toISOString().slice(0, 10) !== date || !Number.isFinite(Date.parse(String(value.updatedAt)))) {
    throw new AssessmentError('storage.the_assessment_identifier_or_dates_are_invalid')
  }
  if (!['github', 'azure-devops', 'mixed', 'other'].includes(String(value.platform))
    || !['cloud', 'server', 'undecided'].includes(String(value.hosting))
    || !['none', 'business', 'enterprise', 'undecided'].includes(String(value.copilotPlan))
    || typeof value.sample !== 'boolean') throw new AssessmentError('storage.the_assessment_platform_or_plan_is_invalid')
  for (const field of ['developers', 'seats']) {
    if (!isCount(value[field])) throw new AssessmentError('error.count', { field })
  }
  for (const field of ['seatCost', 'hoursSaved', 'hourlyRate']) {
    if (!isAmount(value[field])) throw new AssessmentError('error.amount', { field })
  }
  if (!isRecord(value.answers)) throw new AssessmentError('storage.the_assessment_answers_must_be_an_object')
  for (const [id, answer] of Object.entries(value.answers)) {
    const question = allQuestions.find(q => q.id === id)
    if (!question || !isRecord(answer) || !isText(answer.evidence)
      || !(answer.value === null || answer.value === 'na' || typeof answer.value === 'number' && Number.isInteger(answer.value) && answer.value >= 0 && answer.value <= 4)) {
      throw new AssessmentError('error.answer', { id })
    }
    if (answer.value === 'na' && (question.critical || !answer.evidence.trim())) {
      throw new AssessmentError('error.na', { id })
    }
  }
  return value as Assessment
}

export function parseSnapshot(text: string): Snapshot {
  let value: unknown
  try { value = JSON.parse(text) }
  catch { throw new AssessmentError('error.json') }
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.assessments) || value.assessments.length > 200) {
    throw new AssessmentError('storage.unsupported_file_expected_a_version_1_assessment_export_with')
  }
  const assessments = value.assessments.map(validateAssessment)
  if (new Set(assessments.map(a => a.id)).size !== assessments.length) throw new AssessmentError('storage.duplicate_assessment_identifiers_found')
  if (value.activeId !== null && (typeof value.activeId !== 'string' || !assessments.some(a => a.id === value.activeId))) {
    throw new AssessmentError('storage.the_active_assessment_does_not_exist_in_this_file')
  }
  return { schemaVersion: 1, assessments, activeId: value.activeId }
}

export function loadSnapshot(): { snapshot: Snapshot; error: Message | null } {
  if (demoMode) return { snapshot: { schemaVersion: 1, assessments: [], activeId: null }, error: null }
  try {
    const text = localStorage.getItem(storageKey)
    return { snapshot: text ? parseSnapshot(text) : { schemaVersion: 1, assessments: [], activeId: null }, error: null }
  } catch {
    return {
      snapshot: { schemaVersion: 1, assessments: [], activeId: null },
      error: message('error.load'),
    }
  }
}
