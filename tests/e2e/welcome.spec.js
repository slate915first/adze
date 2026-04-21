// tests/e2e/welcome.spec.js
// v15.11 — Closed beta: welcome page shows a single "Sign in with email"
// CTA plus the closed-beta pill and privacy footer. No Begin (that's
// gated behind ADZE_PUBLIC_SIGNUP_ENABLED, off during beta).

import { test, expect } from '@playwright/test';

test.describe('Welcome page (closed beta)', () => {
  test('renders heading, tagline, primary CTA, and beta pill', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1', { hasText: 'Adze' })).toBeVisible();
    // Closed-beta pill.
    await expect(page.getByText(/closed beta/i).first()).toBeVisible();
    // Single primary CTA — magic-link sign-in.
    await expect(page.getByRole('button', { name: /sign in with email/i })).toBeVisible();
    // "Begin" should NOT be present while signup is disabled.
    await expect(page.getByRole('button', { name: 'Begin' })).not.toBeVisible();
    // Privacy link in footer.
    await expect(page.getByRole('button', { name: /privacy note/i })).toBeVisible();
  });

  test('logs no JavaScript errors on first paint', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    const ours = errors.filter((m) => !/tailwindcss\.com|cdn\.tailwindcss/i.test(m));
    expect(ours, `unexpected console errors:\n${ours.join('\n')}`).toEqual([]);
  });

  test('sign-in CTA opens magic-link request modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sign in with email/i }).click();
    // Magic-link request modal has email field + "Send code" button.
    await expect(page.locator('#magic-email')).toBeVisible();
    await expect(page.getByRole('button', { name: /send code/i })).toBeVisible();
    // Closed-beta note inside the modal.
    await expect(page.getByText(/closed beta/i).nth(1)).toBeVisible();
  });

  test('footer theme chips toggle data-theme on <html>', async ({ page }) => {
    // Clear any saved theme so we start from a known state.
    await page.addInitScript(() => {
      try { localStorage.removeItem('adze_theme'); } catch (_) {}
    });
    await page.goto('/');

    // Initial: no data-theme attribute (classic is the default).
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'calm');

    // Tap Calm chip → attribute flips to "calm".
    await page.getByRole('button', { name: /^calm$/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'calm');

    // Tap Classic chip → attribute removed.
    await page.getByRole('button', { name: /^classic$/i }).click();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'calm');
  });
});

test.describe('Welcome page · mobile @mobile', () => {
  test('fits primary content in mobile viewport', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h1', { hasText: 'Adze' });
    const cta = page.getByRole('button', { name: /sign in with email/i });
    await expect(heading).toBeInViewport();
    await expect(cta).toBeInViewport();
  });
});
