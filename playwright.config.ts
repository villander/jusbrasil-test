import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const E2E_DATABASE_URL = 'file:./e2e.db'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Tests run against a production build backed by a fresh SQLite file
  webServer: {
    command: `rm -f e2e.db && npx prisma migrate deploy && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { DATABASE_URL: E2E_DATABASE_URL },
    reuseExistingServer: false,
    timeout: 240_000,
  },
})
