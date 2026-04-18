// tests/e2e/invite-flow.spec.js
// v15.8 — Verifies that landing on Adze with the URL hash Supabase emits
// after a successful invite-link verify (#access_token=...&type=invite)
// triggers the "Set your password" modal.
//
// Without this test, the invite-link path is purely manual: send a real
// invite, click in real Safari, hope the modal appears. Since that flow
// has now broken twice (path-viewer syntax error + cache staleness), the
// test belongs in CI.
//
// Strategy: stub the global `supabase` SDK with a minimal fake before any
// app script runs. The fake `getSession()` returns a session, so authInit
// thinks the SDK auto-processed the hash. Combined with the type=invite
// hint our authInit reads from window.location.hash, _pendingPasswordSet
// flips true, bootstrap opens the set-initial-password modal.

import { test, expect } from '@playwright/test';

// The script body that replaces the real Supabase CDN bundle. Defines a
// minimal `window.supabase` whose `createClient()` returns a fake client.
// The fake getSession returns a session, so authInit thinks the implicit-
// flow hash was consumed and a real session was created.
const SUPABASE_STUB_SCRIPT = `
  window.supabase = {
    createClient: function() {
      return {
        auth: {
          getSession: function() { return Promise.resolve({ data: { session: { user: { id: 'test-user-id', email: 'tester@adze.life' } } }, error: null }); },
          signOut: function() { return Promise.resolve({ error: null }); },
          signUp: function() { return Promise.resolve({ data: {}, error: null }); },
          signInWithPassword: function() { return Promise.resolve({ data: {}, error: null }); },
          updateUser: function() { return Promise.resolve({ data: {}, error: null }); },
          verifyOtp: function() { return Promise.resolve({ data: { session: null }, error: null }); },
          resetPasswordForEmail: function() { return Promise.resolve({ error: null }); },
          onAuthStateChange: function() { return { data: { subscription: { unsubscribe: function() {} } } }; }
        },
        from: function() {
          return {
            select: function() {
              return { eq: function() { return { maybeSingle: function() { return Promise.resolve({ data: null, error: null }); } }; } };
            },
            upsert: function() { return Promise.resolve({ error: null }); },
            delete: function() { return { eq: function() { return Promise.resolve({ error: null }); } }; }
          };
        },
        functions: { invoke: function() { return Promise.resolve({ data: { success: true }, error: null }); } }
      };
    }
  };
`;

// Intercept the Supabase CDN request and serve our stub instead. The real
// CDN script would otherwise load and overwrite any window.supabase we set
// via addInitScript.
async function stubSupabaseCdn(page) {
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: SUPABASE_STUB_SCRIPT,
    });
  });
}

test.describe('Invite-link flow', () => {
  test('lands on Set-your-password modal when URL hash has type=invite', async ({ page }) => {
    await stubSupabaseCdn(page);
    await page.goto('/#access_token=fake&refresh_token=fake&token_type=bearer&type=invite');

    // The set-initial-password modal should open. Heading is "Welcome to Adze".
    await expect(page.locator('#modal-root').getByRole('heading', { name: /welcome to adze/i }))
      .toBeVisible({ timeout: 5000 });
    // The two password input fields should exist.
    await expect(page.locator('#initpw-new')).toBeVisible();
    await expect(page.locator('#initpw-confirm')).toBeVisible();
    // The submit button should be present (text contains "Set password").
    await expect(page.locator('button', { hasText: /Set password/i })).toBeVisible();
  });

  test('lands on Set-your-password modal for type=recovery (forgot-password reset)', async ({ page }) => {
    await stubSupabaseCdn(page);
    await page.goto('/#access_token=fake&refresh_token=fake&token_type=bearer&type=recovery');

    await expect(page.locator('#modal-root').getByRole('heading', { name: /welcome to adze/i }))
      .toBeVisible({ timeout: 5000 });
  });

  test('plain page load (no hash) does NOT open set-password modal', async ({ page }) => {
    await stubSupabaseCdn(page);
    await page.goto('/');

    // No invite hash → boot path opens passphrase-unlock (because the stub
    // rehydrates a session) or shows welcome. Either way, the set-initial-
    // password modal must NOT appear.
    const setPwHeading = page.locator('#modal-root').getByRole('heading', { name: /welcome to adze/i });
    await page.waitForTimeout(800);
    await expect(setPwHeading).toHaveCount(0);
  });
});
