import { en } from './en'
import type { MessageKey } from './en'
import { ptBR } from './pt-BR'
import { es } from './es'

export const locales = ['en', 'pt-BR', 'es'] as const
export type Locale = typeof locales[number]
export const languageNames: Record<Locale, string> = { en: 'English', 'pt-BR': 'Português (Brasil)', es: 'Español' }
export const catalogs: Record<Locale, Record<MessageKey, string>> = { en, 'pt-BR': ptBR, es }
export type Values = Record<string, string | number | undefined>
export type Message = { key: MessageKey; values?: Values; prefix?: MessageKey }
export type Translate = (key: MessageKey, values?: Values) => string

export function resolveLocale(value: string | null): Locale {
  if (value?.toLowerCase() === 'pt-br' || value?.toLowerCase() === 'pt') return 'pt-BR'
  if (value?.toLowerCase().split('-')[0] === 'es') return 'es'
  return 'en'
}

export function translator(locale: Locale): Translate {
  return (key, values = {}) => catalogs[locale][key].replace(/\{(\w+)\}/g, (_, name: string) => {
    if (values[name] === undefined) throw new Error(`Missing interpolation "${name}" for "${key}"`)
    return String(values[name])
  })
}

const sourceKeys = new Map<string, MessageKey>()
export function isMessageKey(value: string): value is MessageKey { return Object.hasOwn(en, value) }
for (const key of Object.keys(en)) {
  if (isMessageKey(key)) sourceKeys.set(en[key], key)
}
const identityLabels: Record<string, MessageKey> = {
  'Secure DevOps': 'ui.secure_devops', Hybrid: 'ui.hybrid', Migrate: 'ui.migrate', 'Optimize + Copilot': 'ui.optimize_copilot',
  Critical: 'scoring.critical', High: 'scoring.high', Medium: 'scoring.medium',
}
for (const [identity, key] of Object.entries(identityLabels)) sourceKeys.set(identity, key)

// Domain objects retain stable English identities; only their display copy is localized.
export function contentTranslator(locale: Locale) {
  const t = translator(locale)
  return (source: string) => {
    const key = sourceKeys.get(source)
    if (!key) throw new Error(`Unregistered assessment copy: ${source}`)
    return t(key)
  }
}

export function message(key: MessageKey, values?: Values): Message { return { key, values } }
export function formatMessage(value: Message | null, locale: Locale) {
  if (!value) return ''
  const t = translator(locale)
  const text = t(value.key, value.values)
  return value.prefix ? t(value.prefix, { p1: text }) : text
}
export class AssessmentError extends Error {
  readonly messageKey: MessageKey
  readonly values?: Values
  constructor(key: MessageKey, values?: Values) {
    super(translator('en')(key, values))
    this.name = 'AssessmentError'
    this.messageKey = key
    this.values = values
  }
}
export function errorMessage(error: unknown, fallback: MessageKey): Message {
  return error instanceof AssessmentError ? message(error.messageKey, error.values) : message(fallback)
}

export function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}
export function formatNumber(value: number, locale: Locale, digits = 0) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)
}
export function formatAssumption(value: string, locale: Locale) {
  const parts = /^(\d+)(?:\.(\d+))?$/.exec(value)
  if (!parts) throw new RangeError('Expected a non-negative decimal assumption.')
  const integer = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(BigInt(parts[1]))
  if (parts[2] === undefined) return integer
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.1).find(part => part.type === 'decimal')
  if (!decimal) throw new RangeError(`No decimal separator for locale ${locale}`)
  // Keep fractional digits as text; Number conversion or a fixed digit cap can lose supplied precision.
  return `${integer}${decimal.value}${parts[2]}`
}
export function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function sampleText(sample: boolean, value: string, locale: Locale) {
  const keys: MessageKey[] = [
    'model.sample_facilitator',
    'model.azure_boards_retained_for_portfolio_planning_eight_production_pipelines',
    'model.security_approval_required_before_expanding_ai_use_identity_remains',
    'model.illustrative_response_only_replace_with_evidence_gathered_during_a',
  ]
  const key = sample ? keys.find(key => en[key] === value) : undefined
  return key ? translator(locale)(key) : value
}
export function platformName(value: string, locale: Locale) {
  return value === 'github' ? 'GitHub' : value === 'azure-devops' ? 'Azure DevOps' : value === 'mixed' ? 'GitHub + Azure DevOps' : translator(locale)('ui.other_platform')
}
export function planName(value: string, locale: Locale) {
  return value === 'business' ? 'Copilot Business' : value === 'enterprise' ? 'Copilot Enterprise' : translator(locale)(value === 'none' ? 'ui.not_deployed' : 'ui.not_yet_confirmed')
}
export function hostingName(value: string, locale: Locale) {
  return value === 'cloud' ? 'GitHub Enterprise Cloud' : value === 'server' ? 'GitHub Enterprise Server' : translator(locale)('ui.not_yet_decided')
}
