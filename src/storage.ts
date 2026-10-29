import { allQuestions } from './model'
import type { Assessment } from './model'

export const storageKey = 'github-maturity-assessment:v1'
export const demoMode = import.meta.env?.VITE_DEMO_MODE === 'true'
export type Snapshot = { schemaVersion: 1; assessments: Assessment[]; activeId: string | null }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown, max = 20000): value is string => typeof value === 'string' && value.length <= max
const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10000000
const isAmount = (value: unknown) => isText(value, 30) && (value === '' || /^\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value)) && Number(value) <= 10000000)

export function validateAssessment(value: unknown): Assessment {
  if (!isRecord(value)) throw new Error('An assessment must be a JSON object.')
  for (const field of ['id', 'customer', 'facilitator', 'date', 'dependencies', 'constraints', 'updatedAt']) {
    if (!isText(value[field], field === 'id' ? 100 : 20000)) throw new Error(`Invalid assessment field: ${field}.`)
  }
  if (!value.id || !/^\d{4}-\d{2}-\d{2}$/.test(String(value.date)) || !Number.isFinite(Date.parse(String(value.updatedAt)))) {
    throw new Error('The assessment identifier or dates are invalid.')
  }
  if (!['github', 'azure-devops', 'mixed', 'other'].includes(String(value.platform))
    || !['cloud', 'server', 'undecided'].includes(String(value.hosting))
    || !['none', 'business', 'enterprise', 'undecided'].includes(String(value.copilotPlan))
    || typeof value.sample !== 'boolean') throw new Error('The assessment platform or plan is invalid.')
  for (const field of ['developers', 'seats']) {
    if (!isCount(value[field])) throw new Error(`Invalid non-negative whole number: ${field}.`)
  }
  for (const field of ['seatCost', 'hoursSaved', 'hourlyRate']) {
    if (!isAmount(value[field])) throw new Error(`Invalid non-negative amount: ${field}.`)
  }
  if (!isRecord(value.answers)) throw new Error('The assessment answers must be an object.')
  for (const [id, answer] of Object.entries(value.answers)) {
    const question = allQuestions.find(q => q.id === id)
    if (!question || !isRecord(answer) || !isText(answer.evidence)
      || !(answer.value === null || answer.value === 'na' || typeof answer.value === 'number' && Number.isInteger(answer.value) && answer.value >= 0 && answer.value <= 4)) {
      throw new Error(`Invalid question or answer: ${id}.`)
    }
    if (answer.value === 'na' && (question.critical || !answer.evidence.trim())) {
      throw new Error(`Not-applicable answers need a rationale and cannot exclude critical controls: ${id}.`)
    }
  }
  return value as Assessment
}

export function parseSnapshot(text: string): Snapshot {
  const value: unknown = JSON.parse(text)
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.assessments) || value.assessments.length > 200) {
    throw new Error('Unsupported file. Expected a version 1 assessment export with up to 200 assessments.')
  }
  const assessments = value.assessments.map(validateAssessment)
  if (new Set(assessments.map(a => a.id)).size !== assessments.length) throw new Error('Duplicate assessment identifiers found.')
  if (value.activeId !== null && (typeof value.activeId !== 'string' || !assessments.some(a => a.id === value.activeId))) {
    throw new Error('The active assessment does not exist in this file.')
  }
  return { schemaVersion: 1, assessments, activeId: value.activeId }
}

export function loadSnapshot(): { snapshot: Snapshot; error: string | null } {
  if (demoMode) return { snapshot: { schemaVersion: 1, assessments: [], activeId: null }, error: null }
  try {
    const text = localStorage.getItem(storageKey)
    return { snapshot: text ? parseSnapshot(text) : { schemaVersion: 1, assessments: [], activeId: null }, error: null }
  } catch (error) {
    return {
      snapshot: { schemaVersion: 1, assessments: [], activeId: null },
      error: `Saved assessments could not be loaded. Existing data has not been overwritten. ${error instanceof Error ? error.message : 'Browser storage is unavailable.'}`,
    }
  }
}
