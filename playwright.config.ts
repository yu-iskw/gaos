import { defineConfig, devices } from '@playwright/test';

const ci = process.env['CI'] === 'true';

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: ci ? 1 : undefined,
  timeout: 120_000,
  forbidOnly: ci,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : 'list',
  snapshotPathTemplate: '{testDir}/{testFileName}-snapshots/{arg}{ext}',
  use: {
    baseURL: process.env['WORKSHOP_WEB_URL'] ?? 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  expect: {
    timeout: 15_000,
    toMatchAriaSnapshot: {
      pathTemplate: '{testDir}/{testFileName}-snapshots/{arg}{ext}',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
