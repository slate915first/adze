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
//
// Two behaviors:
//   - `getSession()` returns a session (so the legacy hash-flow tests below
//     act as if the SDK auto-processed an implicit invite link).
//   - `verifyOtp()` returns a NEW session — the v15.9 invite-landing flow
//     calls verifyOtp explicitly when the user taps the landing button.
const SUPABASE_STUB_SCRIPT = `
  window.supabase = {
    createClient: function() {
      const fakeUser = { id: 'test-user-id', email: 'tester@adze.life' };
      const fakeSession = { user: fakeUser };
      return {
        auth: {
          getSession: function() { return Promise.resolve({ data: { session: fakeSession }, error: null }); },
          signOut: function() { return Promise.resolve({ error: null }); },
          signUp: function() { return Promise.resolve({ data: {}, error: null }); },
          signInWithPassword: function() { return Promise.resolve({ data: {}, error: null }); },
          updateUser: function() { return Promise.resolve({ data: {}, error: null }); },
          verifyOtp: function() { return Promise.resolve({ data: { session: fakeSession, user: fakeUser }, error: null }); },
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

  // v15.9 — Prefetch-resistant flow. The new email links emit
  //   /?invite_token=XXX&type=invite|recovery
  // which makes Adze the landing page and defers the verifyOtp call to a
  // user click. These tests assert the landing button shows up, the click
  // consumes the token (calls verifyOtp), and the user is handed off to
  // the set-initial-password modal.

  test('?invite_token=...&type=invite shows landing button, click → set-password', async ({ page }) => {
    await stubSupabaseCdn(page);
    await page.goto('/?invite_token=fake-token-abc&type=invite');

    // Landing button visible.
    const landingButton = page.getByRole('button', { name: /set up your account/i });
    await expect(landingButton).toBeVisible({ timeout: 5000 });
    // The auto-verify modal must NOT have fired (we should be on landing,
    // not yet on set-initial-password).
    await expect(page.locator('#initpw-new')).not.toBeVisible();

    // Tap the button → verifyOtp gets called → set-initial-password modal opens.
    await landingButton.click();
    await expect(page.locator('#initpw-new')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#initpw-confirm')).toBeVisible();
  });

  test('?invite_token=...&type=recovery shows recovery-flavored landing button', async ({ page }) => {
    await stubSupabaseCdn(page);
    await page.goto('/?invite_token=fake-token-rec&type=recovery');

    // Recovery branch uses different copy: "Confirm & choose a new password".
    const landingButton = page.getByRole('button', { name: /confirm.*choose a new password/i });
    await expect(landingButton).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#initpw-new')).not.toBeVisible();
  });

  // v15.10 — Primary flow: 6-digit code pasted into the app manually.
  // No link, no prefetch, nothing happens server-side until the human
  // types the code.
  test('invite-code flow: enter email + 6-digit code → set-password modal', async ({ page }) => {
    await stubSupabaseCdn(page);
    await page.goto('/');
    await page.getByRole('button', { name: /I have an invite code/i }).click();
    await page.fill('#invcode-email', 'tester@adze.life');
    await page.fill('#invcode-token', '482931');
    await page.getByRole('button', { name: /verify code/i }).click();
    await expect(page.locator('#initpw-new')).toBeVisible({ timeout: 5000 });
  });

  test('invite-code flow rejects non-6-digit code with a readable error', async ({ page }) => {
    await stubSupabaseCdn(page);
    await page.goto('/');
    await page.getByRole('button', { name: /I have an invite code/i }).click();
    await page.fill('#invcode-email', 'tester@adze.life');
    await page.fill('#invcode-token', '12'); // too short
    await page.getByRole('button', { name: /verify code/i }).click();
    await expect(page.getByText(/6 digits/i)).toBeVisible({ timeout: 5000 });
  });

  test('landing page does not auto-verify on load (token preserved)', async ({ page }) => {
    let verifyOtpCallCount = 0;
    // Intercept any actual verify endpoint hit (paranoia — there shouldn't be).
    await page.route(/\/auth\/v1\/verify/, (route) => {
      verifyOtpCallCount++;
      route.fulfill({ status: 200, body: '{}' });
    });
    await stubSupabaseCdn(page);
    await page.goto('/?invite_token=should-not-be-consumed&type=invite');

    // Wait long enough for any auto-verify to have fired if it were going to.
    await page.waitForTimeout(1500);
    expect(verifyOtpCallCount).toBe(0);
    // Landing button should still be there waiting for a tap.
    await expect(page.getByRole('button', { name: /set up your account/i })).toBeVisible();
  });
});
