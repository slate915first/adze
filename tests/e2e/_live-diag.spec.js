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

  test('primary welcome button actually responds (opens modal)', async ({ page }) => {
    // v15.17.1 — in closed beta the primary button is "✉️ Sign in with
    // email" (renderWelcome when ADZE_PUBLIC_SIGNUP_ENABLED is false).
    // Once public signup flips on, the same slot renders "Begin". Accept
    // either so this smoke test stays green across the pre-public-launch
    // transition. What we're proving is that inline onclick handlers fire
    // (the v15.3–v15.10 CSP-broke-every-button class of regression).
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20_000 });
    const primary = page.getByRole('button', { name: /begin|sign in with email/i }).first();
    await expect(primary).toBeVisible({ timeout: 5_000 });
    await primary.click();
    await expect(page.locator('#modal-root .modal-bg, #modal-root .fade-in')).toBeVisible({ timeout: 5_000 });
  });
});
