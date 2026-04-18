// tests/e2e/anonymous-onboarding.spec.js
// Smoke-tests the most critical user flow: an anonymous tester clicking
// Begin and walking through the onboarding modal without anything
// throwing. Doesn't assert the recommendation card content (too brittle
// across copy changes); just asserts we reach a non-error state.
//
// This is the test that would have caught the v15.1.1 chip-array crash
// at the integration level (vitest catches it at the unit level too).

import { test, expect } from '@playwright/test';

test.describe('Anonymous onboarding', () => {
  test('clicking Begin opens the setup flow without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.getByRole('button', { name: /begin/i }).click();

    // Setup modal content rendered inside #modal-root. The container itself
    // is empty when no modal is open (zero size → not "visible" by Playwright);
    // assert against the inner modal-bg wrapper instead.
    await expect(page.locator('#modal-root .modal-bg')).toBeVisible();
    // The version line ("v15.x · the app listens first…") proves the setup
    // intro rendered. Stable across releases.
    await expect(page.locator('#modal-root').getByText(/^v\d+\.\d/)).toBeVisible();

    // Wait for any rendering to settle, then check no errors fired.
    await page.waitForTimeout(500);
    const ours = errors.filter((m) => !/tailwindcss\.com|cdn\.tailwindcss/i.test(m));
    expect(ours, `unexpected console errors:\n${ours.join('\n')}`).toEqual([]);
  });
});
