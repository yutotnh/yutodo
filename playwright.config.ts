import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Tauri application E2E tests.
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e/tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    process.env.CI ? ['github'] : ['line']
  ],
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'tauri-app',
      use: {
        ...devices['Desktop Chrome'],
        // Tauri app will be launched by the test setup
        baseURL: 'tauri://localhost',
      },
    },
  ],

  // Run local server before starting the tests
  webServer: {
    command: 'cd server && npm run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});