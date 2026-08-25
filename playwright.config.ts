import { defineConfig, devices } from '@playwright/test'

// E2E runs against the production build with the GH Pages base path, so every
// route is prefixed — exactly like the deployed site.
const BASE = '/filetools'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:4173${BASE}`,
    acceptDownloads: true,
    launchOptions: { args: ['--no-sandbox'] },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort --host 127.0.0.1',
    url: `http://127.0.0.1:4173${BASE}/`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
