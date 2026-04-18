// Playwright config for Adze. Tests run against a local python http.server
// serving src/, so they're hermetic and don't depend on the live deploy.
// A separate optional smoke test against https://adze.life can be run
// manually or in a scheduled CI job — kept out of the per-PR suite to
// avoid flaking on Cloudflare deploy lag.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 30_000,

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Pixel 5 emulates a mobile viewport using chromium (same engine as
      // the desktop project). Adding WebKit to the install would let us
      // emulate iPhone 13 too, but at +200 MB CI cache for marginal value
      // — viewport size is what matters for the layout assertions we have.
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      // Only run mobile-specific tests in this project — the broader suite
      // runs in chromium. Tag mobile-only specs with `@mobile`.
      grep: /@mobile/,
    },
  ],

  // Spin up a local http.server for src/ unless we're running against a
  // user-supplied URL (live deploy smoke).
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'python3 -m http.server 8000 --directory src',
    port: 8000,
    timeout: 10_000,
    reuseExistingServer: !process.env.CI,
  },
});
