import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { exampleAssessment } from '../src/model'
import { storageKey } from '../src/storage'

test('sample dashboard, mobile layout, and report exports', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /A clearer path/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('welcome.png'), fullPage: true })
  await page.getByRole('button', { name: 'Explore sample dashboard' }).click()
  await expect(page.getByText('Sample data', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Secure DevOps', exact: true })).toBeVisible()
  await expect(page.getByText('Complete · self-reported')).toBeVisible()
  await expect(page.getByRole('table', { name: 'Maturity by dimension' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true })
  await page.getByRole('button', { name: 'Report & roadmap' }).click()
  await expect(page.getByRole('heading', { name: 'Decision matrix' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Business case & licensing scenario' })).toHaveCount(0)
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await expect(page.locator('.evidence-register details[open]')).toHaveCount(6)
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  await expect(page.locator('.evidence-register details[open]')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('report.png'), fullPage: true })
  const mdDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Markdown' }).click()
  const downloaded = await mdDownload
  const report = await readFile((await downloaded.path())!, 'utf8')
  expect(report).toContain('SYNTHETIC SAMPLE')
  expect(report).toContain('Response and evidence register')
  const jsonDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export assessment JSON' }).click()
  const json = JSON.parse(await readFile((await (await jsonDownload).path())!, 'utf8'))
  expect(json.assessments).toHaveLength(1)
  expect(Object.keys(json.assessments[0].answers)).toHaveLength(30)
  await page.reload()
  await expect(page.getByText('Sample data', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
  expect(requests.every(url => url.startsWith('http://127.0.0.1:4173/'))).toBe(true)
})

test('complete a customer assessment, retain unknown evidence, validate N/A, and persist', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start an assessment', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continue to questions' })).toBeDisabled()
  await page.getByLabel('Customer / organization *').fill('Contoso Customer')
  await page.getByLabel('Facilitator', { exact: true }).fill('Test consultant')
  await page.getByLabel('Current development platform').selectOption('mixed')
  await page.getByLabel('Current GitHub plan').selectOption('business')
  await page.getByRole('button', { name: 'Continue to questions' }).click()
  await page.getByLabel('Evidence & session notes').fill('Identity owner to confirm.')
  await page.getByRole('button', { name: 'Next question' }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByLabel('Evidence & session notes')).toHaveValue('Identity owner to confirm.')
  await expect(page.getByText('0/30 answered', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Mark not applicable/ })).toHaveCount(0)
  await page.getByRole('radio').nth(2).check()
  await page.getByRole('button', { name: 'Next question' }).click()
  await page.getByRole('button', { name: /Mark not applicable/ }).click()
  await expect(page.getByRole('alert')).toContainText('Add a rationale')
  await page.getByLabel('Evidence & session notes').fill('Repository ownership handled outside this pilot scope.')
  await page.getByRole('button', { name: /Mark not applicable/ }).click()
  await expect(page.getByRole('button', { name: 'Marked not applicable' })).toBeVisible()
  await page.getByRole('button', { name: 'Next question' }).click()
  for (let i = 2; i < 30; i++) {
    await page.getByRole('radio').nth(2).check()
    if (i === 10) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      const activeVisible = await page.locator('.dimension-button.selected').evaluate(button => {
        const nav = button.parentElement!.getBoundingClientRect()
        const bounds = button.getBoundingClientRect()
        return bounds.left >= nav.left - 1 && bounds.right <= nav.right + 1
      })
      expect(activeVisible).toBe(true)
      await page.screenshot({ path: testInfo.outputPath('questionnaire.png'), fullPage: true })
    }
    await page.getByRole('button', { name: i === 29 ? 'View results' : 'Next question', exact: true }).click()
  }
  await expect(page.getByText('Complete · self-reported')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hybrid', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Report & roadmap' }).click()
  await expect(page.getByText('GitHub Business', { exact: true }).first()).toBeVisible()
  await page.reload()
  await expect(page.getByText('Complete · self-reported')).toBeVisible()
  await page.getByRole('button', { name: 'Assessments', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Contoso Customer' })).toBeVisible()
})

test('imports as independent copies, rejects malformed files, and deletes only confirmed records', async ({ page }) => {
  await page.goto('/')
  const sample = exampleAssessment()
  const file = Buffer.from(JSON.stringify({ schemaVersion: 2, assessments: [sample], activeId: sample.id }))
  await page.getByLabel('Import assessment JSON file').setInputFiles({ name: 'customer.json', mimeType: 'application/json', buffer: file })
  await expect(page.getByRole('status')).toContainText('Imported 1 assessment')
  await page.getByLabel('Import assessment JSON file').setInputFiles({ name: 'customer.json', mimeType: 'application/json', buffer: file })
  await page.getByRole('button', { name: 'Assessments', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Northstar Engineering' })).toHaveCount(2)
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey)
  expect(new Set(stored.assessments.map((a: { id: string }) => a.id)).size).toBe(2)
  await page.getByLabel('Import assessment JSON file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"schemaVersion":999}') })
  await expect(page.getByRole('status')).toContainText('Import failed')
  await expect(page.getByRole('heading', { name: 'Northstar Engineering' })).toHaveCount(2)
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Delete Northstar Engineering' }).first().click()
  await expect(page.getByRole('heading', { name: 'Northstar Engineering' })).toHaveCount(2)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Delete Northstar Engineering' }).first().click()
  await expect(page.getByRole('heading', { name: 'Northstar Engineering' })).toHaveCount(1)
})

test('migrates existing local v1 assessments without reusing the Copilot plan or deleted fields', async ({ page }) => {
  const legacy = { ...exampleAssessment(), copilotPlan: 'business', dependencies: 'Removed integrations',
    constraints: 'Removed restrictions', seats: 10, seatCost: '20', hoursSaved: '2', hourlyRate: '50' }
  await page.addInitScript(({ key, legacy }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, assessments: [legacy], activeId: legacy.id }))
  }, { key: storageKey, legacy })
  await page.goto('/')
  await expect(page.getByText('Complete · self-reported')).toBeVisible()
  await page.getByRole('button', { name: 'Questionnaire', exact: true }).click()
  await expect(page.getByLabel('Current GitHub plan')).toHaveValue('undecided')
  await page.getByLabel('Current GitHub plan').selectOption('enterprise')
  await page.reload()
  await page.getByRole('button', { name: 'Questionnaire', exact: true }).click()
  await expect(page.getByLabel('Current GitHub plan')).toHaveValue('enterprise')
  const data = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey)
  expect(data.schemaVersion).toBe(2)
  expect(data.assessments[0].answers).toEqual(legacy.answers)
  for (const field of ['copilotPlan', 'dependencies', 'constraints', 'seats', 'seatCost', 'hoursSaved', 'hourlyRate']) {
    expect(data.assessments[0]).not.toHaveProperty(field)
  }
})

test('preserves corrupt browser data instead of silently overwriting it', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, '{corrupt-data'), storageKey)
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Existing data has not been overwritten')
  await expect(page.getByRole('button', { name: 'Start an assessment', exact: true })).toBeDisabled()
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe('{corrupt-data')
})

test('makes storage failures explicit and preserves unsaved answers for export', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start an assessment', exact: true }).click()
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage quota reached', 'QuotaExceededError') }
  })
  await page.getByLabel('Customer / organization *').fill('Unsaved Customer')
  await expect(page.getByRole('alert')).toContainText('Could not save your latest changes')
  const file = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export current work' }).click()
  const json = JSON.parse(await readFile((await (await file).path())!, 'utf8'))
  expect(json.assessments[0].customer).toBe('Unsaved Customer')
})

test('pauses editing when another tab changes saved assessments', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start an assessment', exact: true }).click()
  await page.getByLabel('Customer / organization *').fill('Original Customer')
  const second = await context.newPage()
  await second.goto('/')
  await second.getByRole('button', { name: 'Questionnaire', exact: true }).click()
  await second.getByLabel('Customer / organization *').fill('Updated in other tab')
  await expect(page.getByRole('alert')).toContainText('changed in another tab')
  await expect(page.getByLabel('Customer / organization *')).toBeDisabled()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).assessments[0].customer, storageKey)).toBe('Updated in other tab')
})
