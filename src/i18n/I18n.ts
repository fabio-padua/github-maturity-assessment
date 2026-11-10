import { createContext, useContext, useMemo } from 'react'
import { pillars, ratingNames } from '../model'
import { assess, level, pathDescriptions, roadmap } from '../scoring'
import { contentTranslator, formatDate, translator, sampleText, planName, hostingName, platformName } from './core'
import type { Locale } from './core'

export const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void } | null>(null)

export function useI18n() {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useI18n requires I18nProvider')
  const { locale } = context
  const translated = useMemo(() => {
    const text = contentTranslator(locale)
    const localizedPillars = pillars.map(p => ({
      ...p, name: text(p.name), short: text(p.short), description: text(p.description),
      questions: p.questions.map(q => ({
        ...q, title: text(q.title), why: text(q.why), action: text(q.action), evidence: text(q.evidence),
        options: q.options.map(text),
      })),
    }))
    return {
      pillars: localizedPillars,
      allQuestions: localizedPillars.flatMap(p => p.questions),
      ratingNames: ratingNames.map(text),
    }
  }, [locale])
  const content = contentTranslator(locale)
  return {
    ...context, ...translated, t: translator(locale), content,
    level: (score: number | null) => content(level(score)),
    assess: (a: Parameters<typeof assess>[0]) => {
      const result = assess(a)
      return {
        ...result, rationale: content(result.rationale),
        results: result.results.map(r => ({ ...r, pillar: translated.pillars.find(p => p.id === r.pillar.id)! })),
        findings: result.findings.map(f => ({
          ...f, question: translated.allQuestions.find(q => q.id === f.question.id)!,
          pillar: translated.pillars.find(p => p.id === f.pillar.id)!,
        })),
      }
    },
    pathDescriptions: Object.fromEntries(Object.entries(pathDescriptions).map(([key, description]) => [key, content(description)])),
    roadmap: (a: Parameters<typeof roadmap>[0]) => roadmap(a).map(w => ({
      ...w, title: content(w.title), owner: content(w.owner), actions: w.actions.map(content), exit: content(w.exit),
    })),
    sampleText: (a: { sample: boolean }, value: string) => sampleText(a.sample, value, locale),
    date: (value: string) => formatDate(value, locale),
    platformLabels: { github: 'GitHub', 'azure-devops': 'Azure DevOps', gitlab: 'GitLab', bitbucket: 'Bitbucket', mixed: 'GitHub + Azure DevOps', other: translator(locale)('ui.other_platform') },
    platformLabel: (a: { platform: string; otherPlatform: string }) => platformName(a.platform, locale, a.otherPlatform),
    planLabel: (value: string) => planName(value, locale),
    hostingLabel: (value: string) => hostingName(value, locale),
  }
}
