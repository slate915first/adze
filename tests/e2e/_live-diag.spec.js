// tests/e2e/_live-diag.spec.js — live-deploy smoke test.
//
// The underscore prefix keeps it out of the default `npm run test:e2e`
// suite (which runs against localhost, where _headers don't apply).
// Run manually after every deploy:  npm run test:e2e:live
//
// This file exists because the CSP `_headers` config is only applied by
// Cloudflare at runtime — there's no way to catch a CSP regression from
// localhost. The v15.3–v15.10 "buttons don't respond" bug (CSP was
// blocking every onclick handler in the app for 7 consecutive releases)
// would have been caught immediately by this test on any live deploy.

import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://adze.life';

test.use({ baseURL: BASE });

test.describe(`Live smoke (${BASE})`, () => {
  test('welcome loads with zero CSP / JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20_000 });
    const ours = errors.filter(m => !/tailwindcss\.com|cdn\.tailwindcss/i.test(m));
    expect(ours, `unexpected errors:\n${ours.join('\n')}`).toEqual([]);
  });

  test('Begin button actually responds (opens setup modal)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20_000 });
    await page.getByRole('button', { name: /begin/i }).click();
    // The setup intro ("v15.x · the app listens first…") is the first
    // thing rendered inside #modal-root after Begin. Asserting SOMETHING
    // renders proves inline onclick handlers are executing.
    await expect(page.locator('#modal-root .modal-bg')).toBeVisible({ timeout: 5_000 });
  });
});
