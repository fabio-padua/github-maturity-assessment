import { expect, test } from '@playwright/test'
import { translator } from '../src/i18n/core'

test('public demo never accesses browser storage and discards answers on refresh', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    const accesses: string[] = []
    Object.defineProperty(window, 'demoStorageAccesses', { value: accesses })
    Storage.prototype.getItem = () => { accesses.push('getItem'); throw new Error('Demo must not read persistent storage') }
    Storage.prototype.setItem = () => { accesses.push('setItem'); throw new Error('Demo must not write persistent storage') }
    Storage.prototype.removeItem = () => { accesses.push('removeItem'); throw new Error('Demo must not remove persistent storage') }
  })
  await page.goto('/')
  await expect(page.getByText('Demo · session only')).toBeVisible()
  await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'github-maturity-assessment:v1' })))
  await page.getByRole('button', { name: 'Start an assessment', exact: true }).click()
  await page.getByLabel('Customer / organization *').fill('Ephemeral Demo Customer')
  await page.getByLabel('Current development platform').selectOption('github')
  await page.getByRole('button', { name: 'Continue to questions' }).click()
  await page.getByRole('radio').nth(3).check()
  await page.getByLabel('Evidence & session notes').fill('This note must not survive reload.')
  await page.getByRole('button', { name: 'User preferences', exact: true }).click()
  await page.getByRole('menuitemradio', { name: 'Português (Brasil)', exact: true }).click()
  await expect(page.getByLabel(translator('pt-BR')('ui.evidence_session_notes'))).toHaveValue('This note must not survive reload.')
  await page.getByRole('button', { name: translator('pt-BR')('language.menu'), exact: true }).click()
  await page.getByRole('menuitemradio', { name: 'English', exact: true }).click()
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await expect(page.getByText('Provisional', { exact: true })).toBeVisible()
  await expect(page.getByText('Ephemeral Demo Customer', { exact: true })).toBeAttached()
  expect(await page.evaluate(() => Reflect.get(window, 'demoStorageAccesses'))).toEqual([])
  await page.reload()
  await expect(page.getByRole('heading', { name: /A clearer path/ })).toBeVisible()
  await expect(page.getByText('Ephemeral Demo Customer', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Explore sample dashboard' }).click()
  await expect(page.getByText('Complete · self-reported')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Report & roadmap' }).click()
  await expect(page.getByRole('heading', { name: 'Decision matrix' })).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Markdown' }).click()
  expect((await downloaded).suggestedFilename()).toBe('northstar-engineering-report.md')
  await page.getByRole('button', { name: 'Methodology', exact: true }).click()
  await expect(page.getByText(/does not read or write browser storage/)).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(window, 'demoStorageAccesses'))).toEqual([])
  expect(errors).toEqual([])
})
