import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import appSource from '../App.tsx?raw'
import menuSource from '../UserMenu.tsx?raw'
import { en } from './en'
import type { MessageKey } from './en'
import { AssessmentError, catalogs, contentTranslator, formatDate, formatMessage, formatMoney, formatNumber, locales, message, resolveLocale, translator } from './core'
import { allQuestions, exampleAssessment, maturityLevels, newAssessment, pillars, ratingNames } from '../model'
import { assess, level, pathDescriptions, roadmap } from '../scoring'
import { fileStem, reportMarkdown } from '../report'
import { parseSnapshot } from '../storage'

describe('translation contract', () => {
  it('keeps new visible JSX copy and accessible labels in the catalogs', () => {
    const untranslated: string[] = []
    for (const [name, code] of Object.entries({ 'App.tsx': appSource, 'UserMenu.tsx': menuSource })) {
      const source = ts.createSourceFile(name, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const visit = (node: ts.Node) => {
        if (ts.isJsxText(node)) {
          const copy = node.text.trim()
          if (/[a-z]/i.test(copy) && !(name === 'UserMenu.tsx' && copy === 'LM')) untranslated.push(`${name}: ${copy}`)
        }
        if (ts.isJsxAttribute(node) && ['aria-label', 'label', 'hint', 'placeholder', 'title'].includes(node.name.getText(source))
          && node.initializer && ts.isStringLiteral(node.initializer)) untranslated.push(`${name}: ${node.initializer.text}`)
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
    expect(untranslated).toEqual([])
  })
  const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
  for (const locale of locales) {
    it(`${locale} provides every key, interpolation value and meaningful translation`, () => {
      expect(Object.keys(catalogs[locale]).sort()).toEqual(Object.keys(en).sort())
      for (const key of Object.keys(en) as MessageKey[]) {
        const text = catalogs[locale][key]
        expect(text.trim(), key).not.toBe('')
        expect(placeholders(text), key).toEqual(placeholders(en[key]))
        expect(/^\s/.test(text), key).toBe(/^\s/.test(en[key]))
        expect(/\s$/.test(text), key).toBe(/\s$/.test(en[key]))
      }
      if (locale !== 'en') {
        const translated = Object.entries(catalogs[locale]).filter(([key, text]) => en[key as MessageKey] !== text)
        expect(translated.length / Object.keys(en).length).toBeGreaterThan(.9)
      }
    })

    it(`${locale} covers every question, response option, level, finding and roadmap`, () => {
      const text = contentTranslator(locale)
      for (const p of pillars) {
        for (const copy of [p.name, p.short, p.description]) expect(text(copy)).toBeTruthy()
      }
      for (const q of allQuestions) {
        for (const copy of [q.title, q.why, q.action, q.evidence, ...q.options]) expect(text(copy)).toBeTruthy()
      }
      for (const copy of [...ratingNames, ...maturityLevels, level(null), ...Object.keys(pathDescriptions), ...Object.values(pathDescriptions)]) expect(text(copy)).toBeTruthy()
      for (const a of [newAssessment(), exampleAssessment()]) {
        const r = assess(a)
        expect(text(r.rationale)).toBeTruthy()
        for (const finding of r.findings) expect(text(finding.priority)).toBeTruthy()
        for (const item of roadmap(a)) {
          for (const copy of [item.title, item.owner, item.exit, ...item.actions]) expect(text(copy)).toBeTruthy()
        }
      }
    })

    it(`${locale} exports the full report without altering customer data or scores`, () => {
      const a = exampleAssessment()
      a.customer = 'Cliente São Paulo / Bogotá'
      a.facilitator = 'María João'
      a.dependencies = 'Customer-authored text stays unchanged.'
      a.answers.identity.evidence = 'Confirmação do cliente — mantener sin traducir.'
      a.seatCost = '12.5'
      a.hourlyRate = '50'
      a.hoursSaved = '1.5'
      const before = structuredClone(a)
      const report = reportMarkdown(a, locale)
      const t = translator(locale)
      expect(report).toContain(t('ui.executive_summary'))
      expect(report).toContain(t('report.register'))
      expect(report).toContain(t('report.limitations'))
      expect(report).toContain(contentTranslator(locale)(allQuestions[0].title))
      expect(report).toContain(a.dependencies)
      expect(report).toContain(a.answers.identity.evidence)
      expect(report).toContain(a.customer)
      expect(report).toContain(a.facilitator)
      expect(report).toContain(formatNumber(assess(a).score!, locale))
      expect(report).not.toMatch(/\{\w+\}/)
      expect(a).toEqual(before)
    })
  }
  it('handles locale tags, interpolation, numbers, dates and fixed USD currency', () => {
    expect(resolveLocale('pt-br')).toBe('pt-BR')
    expect(resolveLocale('es-MX')).toBe('es')
    expect(resolveLocale('unknown')).toBe('en')
    expect(resolveLocale(null)).toBe('en')
    expect(translator('pt-BR')('counts.answers', { count: 1, total: 30 })).toContain('1/30')
    expect(() => translator('en')('counts.answers')).toThrow('Missing interpolation')
    expect(formatNumber(1234.5, 'pt-BR', 2)).toBe('1.234,50')
    expect(formatMoney(2400, 'pt-BR')).toContain('2.400')
    expect(formatDate('2026-11-05', 'en')).toBe('Nov 5, 2026')
    expect(formatDate('2026-11-05', 'pt-BR')).toContain('2026')
    expect(fileStem('São Paulo / Bogotá')).toBe('sao-paulo-bogota')
  })
  it('can retranslate existing errors after switching languages', () => {
    const error = new AssessmentError('error.answer', { id: 'identity' })
    expect(error.message).toBe('Invalid question or answer: identity.')
    const value = message(error.messageKey, error.values)
    expect(formatMessage(value, 'pt-BR')).toContain('identity')
    expect(formatMessage(value, 'pt-BR')).not.toBe(formatMessage(value, 'en'))
    expect(formatMessage(value, 'es')).not.toBe(formatMessage(value, 'pt-BR'))
  })
  it('rejects invalid calendar dates before localized formatting', () => {
    const a = newAssessment()
    a.date = '2026-02-31'
    expect(() => parseSnapshot(JSON.stringify({ schemaVersion: 1, assessments: [a], activeId: a.id }))).toThrow('dates')
  })
})
