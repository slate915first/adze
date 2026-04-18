// tests/e2e/welcome.spec.js
// Welcome page renders correctly for an anonymous, never-visited user.
// Catches: missing CSS, broken script tags, JS that throws on load,
// closed-beta gating regressions.

import { test, expect } from '@playwright/test';

test.describe('Welcome page', () => {
  test('renders heading, tagline, primary CTA, and beta gating', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1', { hasText: 'Adze' })).toBeVisible();
    // Begin (start setup) and a sign-in entry both need to be reachable.
    await expect(page.getByRole('button', { name: /begin/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /already have an account/i })).toBeVisible();
    // Closed-beta pill (only present when ADZE_PUBLIC_SIGNUP_ENABLED=false).
    await expect(page.getByText(/closed beta/i)).toBeVisible();
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
    // Filter out third-party noise that's outside our control. Tailwind's
    // CDN is known to log production-mode warnings in some configurations.
    const ours = errors.filter((m) => !/tailwindcss\.com|cdn\.tailwindcss/i.test(m));
    expect(ours, `unexpected console errors:\n${ours.join('\n')}`).toEqual([]);
  });

  test('sign-in modal opens with the closed-beta variant (no Create account button)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /already have an account/i }).click();
    // Auth menu should show "Sign in" but NOT "Create an account" while
    // ADZE_PUBLIC_SIGNUP_ENABLED is false.
    await expect(page.getByRole('button', { name: /^Sign in$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create an account/i })).not.toBeVisible();
    // Closed-beta contact line in the modal.
    await expect(page.getByText(/closed beta/i)).toBeVisible();
  });
});

test.describe('Welcome page · mobile @mobile', () => {
  test('fits in iPhone viewport without scrolling for primary content', async ({ page }) => {
    await page.goto('/');
    const heading = page.locator('h1', { hasText: 'Adze' });
    const cta     = page.getByRole('button', { name: /begin/i });
    const signin  = page.getByRole('button', { name: /already have an account/i });
    await expect(heading).toBeInViewport();
    await expect(cta).toBeInViewport();
    await expect(signin).toBeInViewport();
  });
});
