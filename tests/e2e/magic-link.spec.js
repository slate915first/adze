// tests/e2e/magic-link.spec.js
// v15.11 magic-link sign-in e2e.
// Stubs the Supabase SDK so tests run without hitting real Supabase.

import { test, expect } from '@playwright/test';

const SUPABASE_STUB = `
  window.supabase = {
    createClient: function() {
      const fakeUser = { id: 'magic-user', email: 'tester@adze.life' };
      const fakeSession = { user: fakeUser };
      let lastEmail = null;
      return {
        auth: {
          getSession: function() { return Promise.resolve({ data: { session: null }, error: null }); },
          signInWithOtp: function(opts) {
            if (!opts || !opts.email) return Promise.resolve({ data: null, error: { message: 'email required' } });
            if (opts.email === 'blocked@example.com') {
              return Promise.resolve({ data: null, error: { message: 'Adze is in closed beta. Your email is not on the invite list.' } });
            }
            lastEmail = opts.email;
            return Promise.resolve({ data: {}, error: null });
          },
          verifyOtp: function(opts) {
            // v15.11.2 — stub accepts the correct code on any of the 4
            // types the client now retries; simulates Supabase returning
            // an error for all other types/codes.
            if (!opts || opts.token !== '482931') {
              return Promise.resolve({ data: null, error: { message: 'Invalid or expired code.' } });
            }
            return Promise.resolve({ data: { session: fakeSession, user: fakeUser }, error: null });
          },
          signOut: function() { return Promise.resolve({ error: null }); },
          signUp: function() { return Promise.resolve({ data: {}, error: null }); },
          signInWithPassword: function() { return Promise.resolve({ data: {}, error: null }); },
          updateUser: function() { return Promise.resolve({ data: {}, error: null }); },
          resetPasswordForEmail: function() { return Promise.resolve({ error: null }); },
          onAuthStateChange: function() { return { data: { subscription: { unsubscribe: function() {} } } }; }
        },
        from: function() {
          return {
            select: function() { return { eq: function() { return { maybeSingle: function() { return Promise.resolve({ data: null, error: null }); } }; } }; },
            upsert: function() { return Promise.resolve({ error: null }); },
            delete: function() { return { eq: function() { return Promise.resolve({ error: null }); } }; }
          };
        },
        functions: { invoke: function() { return Promise.resolve({ data: { success: true }, error: null }); } }
      };
    }
  };
`;

async function stubSupabase(page) {
  await page.route(/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/, (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: SUPABASE_STUB })
  );
}

test.describe('Magic-link sign-in', () => {
  test('happy path: request code → enter code → hand off to passphrase', async ({ page }) => {
    await stubSupabase(page);
    await page.goto('/');
    await page.getByRole('button', { name: /sign in with email/i }).click();
    await page.fill('#magic-email', 'tester@adze.life');
    await page.getByRole('button', { name: /send code/i }).click();
    await expect(page.locator('#magic-code')).toBeVisible({ timeout: 5000 });
    await page.fill('#magic-code', '482931');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    // After verifyOtp success, authStartUnlockOrSetup runs → opens
    // passphrase-setup (no remote row exists in the stub). Assert its
    // heading appears.
    await expect(page.getByRole('heading', { name: /set your encryption passphrase/i }))
      .toBeVisible({ timeout: 5000 });
  });

  test('blocked email shows allowlist error', async ({ page }) => {
    await stubSupabase(page);
    await page.goto('/');
    await page.getByRole('button', { name: /sign in with email/i }).click();
    await page.fill('#magic-email', 'blocked@example.com');
    await page.getByRole('button', { name: /send code/i }).click();
    await expect(page.getByText(/closed beta/i).first()).toBeVisible({ timeout: 5000 });
    // User stays on the request form, not advanced to code entry.
    await expect(page.locator('#magic-code')).not.toBeVisible();
  });

  test('wrong code shows error, stays on verify step', async ({ page }) => {
    await stubSupabase(page);
    await page.goto('/');
    await page.getByRole('button', { name: /sign in with email/i }).click();
    await page.fill('#magic-email', 'tester@adze.life');
    await page.getByRole('button', { name: /send code/i }).click();
    await page.fill('#magic-code', '000000');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText(/invalid|expired/i).first()).toBeVisible({ timeout: 5000 });
    // Still on the verify step.
    await expect(page.locator('#magic-code')).toBeVisible();
  });

  test('very short code rejected client-side before network', async ({ page }) => {
    await stubSupabase(page);
    await page.goto('/');
    await page.getByRole('button', { name: /sign in with email/i }).click();
    await page.fill('#magic-email', 'tester@adze.life');
    await page.getByRole('button', { name: /send code/i }).click();
    await page.fill('#magic-code', '12');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByText(/digits from your email/i).first()).toBeVisible({ timeout: 5000 });
  });
});
