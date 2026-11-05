import { defineConfig } from '@playwright/test'
import config from './playwright.demo.config'

const endpoint = process.env.ASSESSMENT_URL
if (!endpoint || new URL(endpoint).protocol !== 'https:') {
  throw new Error('ASSESSMENT_URL must point to the deployed HTTPS demo; no local-server fallback is allowed.')
}

export default defineConfig({
  ...config,
  use: { ...config.use, baseURL: endpoint },
  webServer: undefined,
})
