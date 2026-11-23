import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for TalentAI journeys
 * (Candidate, Recruiter, Admin, Verification & Coding Sandbox)
 */
export default defineConfig({
  testDir: './tests/playwright',
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
