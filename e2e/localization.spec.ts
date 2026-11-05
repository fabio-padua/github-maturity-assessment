import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { languageNames, translator } from '../src/i18n/core'
import type { Locale } from '../src/i18n/core'

async function switchLanguage(page: import('@playwright/test').Page, current: Locale, next: Locale) {
  await page.getByRole('button', { name: translator(current)('language.menu'), exact: true }).click()
  await page.getByRole('menuitemradio', { name: languageNames[next], exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', next)
  await expect(page.getByRole('menu')).toHaveCount(0)
}

for (const locale of ['pt-BR', 'es'] as const) {
  test(`${locale}: localizes all surfaces and exports without altering answers`, async ({ page }, testInfo) => {
    const errors: string[] = []
    const requests: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) requests.push(request.method()) })
    const t = translator(locale)
    await page.goto('/')
    await switchLanguage(page, 'en', locale)
    await expect(page).toHaveURL(new RegExp(`lang=${locale}`))
    await page.getByRole('button', { name: t('language.menu'), exact: true }).click()
    await page.screenshot({ path: testInfo.outputPath('language-menu.png') })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: t('ui.start_an_assessment'), exact: true })).toBeVisible()
    await page.getByRole('button', { name: t('ui.start_an_assessment'), exact: true }).click()
    await page.getByLabel(t('ui.customer_organization'), { exact: true }).fill('Empresa São Paulo / Bogotá')
    await page.getByLabel(t('ui.facilitator'), { exact: true }).fill('María João')
    await page.getByRole('button', { name: t('ui.continue_to_questions'), exact: true }).click()
    await expect(page.getByRole('heading', { name: t('model.how_is_access_to_your_development_platform_managed'), exact: true })).toBeVisible()
    await expect(page.getByText(t('model.sso_mfa_and_automated_provisioning_enforced'), { exact: true })).toBeVisible()
    await page.getByRole('radio').nth(3).check()
    const evidence = 'Evidência do cliente — mantener sin traducir.'
    await page.getByLabel(t('ui.evidence_session_notes')).fill(evidence)
    await page.getByRole('button', { name: t('ui.overview'), exact: true }).click()
    await expect(page.getByText(t('ui.provisional'), { exact: true })).toBeVisible()
    await expect(page.locator('.overall-score strong')).toHaveText('75')
    const jsonBeforeDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: t('ui.export_assessment_json'), exact: true }).click()
    const jsonBefore = JSON.parse(await readFile((await (await jsonBeforeDownload).path())!, 'utf8'))
    await page.getByLabel(t('ui.import_assessment_json_file'), { exact: true }).setInputFiles({
      name: 'unsupported.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":999}'),
    })
    await expect(page.getByRole('status')).toContainText(t('storage.unsupported_file_expected_a_version_1_assessment_export_with'))
    const other = locale === 'pt-BR' ? 'es' : 'pt-BR'
    await switchLanguage(page, locale, other)
    const changed = translator(other)
    await expect(page.getByRole('status')).toContainText(changed('storage.unsupported_file_expected_a_version_1_assessment_export_with'))
    await expect(page.locator('.overall-score strong')).toHaveText('75')
    await page.getByRole('button', { name: changed('ui.report_roadmap'), exact: true }).click()
    await expect(page.getByRole('heading', { name: changed('ui.decision_matrix'), exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Empresa São Paulo/ })).toBeVisible()
    await expect(page.getByText('María João', { exact: false })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('localized-report.png') })
    const downloaded = page.waitForEvent('download')
    await page.getByRole('button', { name: changed('ui.export_markdown'), exact: true }).click()
    const report = await readFile((await (await downloaded).path())!, 'utf8')
    expect(report).toContain(changed('ui.executive_summary'))
    expect(report).toContain(changed('report.register'))
    expect(report).toContain(evidence)
    const jsonAfterDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: changed('ui.export_assessment_json'), exact: true }).click()
    const jsonAfter = JSON.parse(await readFile((await (await jsonAfterDownload).path())!, 'utf8'))
    expect(jsonAfter).toEqual(jsonBefore)
    await page.getByRole('button', { name: changed('ui.methodology_2'), exact: true }).click()
    await expect(page.getByRole('heading', { name: changed('ui.how_scores_are_calculated'), exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await switchLanguage(page, other, locale)
    await page.getByRole('button', { name: t('ui.questionnaire'), exact: true }).click()
    await expect(page.getByLabel(t('ui.customer_organization'), { exact: true })).toHaveValue('Empresa São Paulo / Bogotá')
    await page.getByRole('button', { name: t('ui.continue_to_questions'), exact: true }).click()
    // Continue targets the first unanswered question; use step 1 to revisit the existing answer.
    await page.getByRole('button', { name: t('ui.question_2', { p1: 1, p2: t('ui.answered_2') }), exact: true }).click()
    await expect(page.getByRole('radio').nth(3)).toBeChecked()
    await expect(page.getByLabel(t('ui.evidence_session_notes'))).toHaveValue(evidence)
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    expect(errors).toEqual([])
    expect(requests).toEqual([])
  })
}

test('user menu supports keyboard selection, Escape and outside dismissal', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'User preferences', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menuitemradio', { name: 'English', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitemradio', { name: 'Português (Brasil)', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  const changed = page.getByRole('button', { name: translator('pt-BR')('language.menu'), exact: true })
  await expect(changed).toBeFocused()
  await changed.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(changed).toBeFocused()
  await changed.click()
  await page.locator('.brand').click()
  await expect(page.getByRole('menu')).toHaveCount(0)
})
