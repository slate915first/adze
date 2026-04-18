// tests/e2e/pwa.spec.js
// Verifies the PWA pieces are wired correctly: manifest exists with the
// right shape, service worker registers, and the icon resolves.

import { test, expect } from '@playwright/test';

test('manifest.json exists with expected shape', async ({ request }) => {
  const res = await request.get('/manifest.json');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toMatch(/Adze/);
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBeTruthy();
  expect(Array.isArray(manifest.icons)).toBe(true);
  expect(manifest.icons.length).toBeGreaterThan(0);
});

test('service worker registers on first load', async ({ page }) => {
  await page.goto('/');
  // Service worker registration happens on window.load, then asynchronously
  // installs. Give it a generous window before asserting.
  const registered = await page.waitForFunction(
    async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration();
      return !!reg;
    },
    null,
    { timeout: 10_000 }
  );
  expect(registered).toBeTruthy();
});

test('icon.svg resolves and has SVG content', async ({ request }) => {
  const res = await request.get('/icon.svg');
  expect(res.ok()).toBe(true);
  const body = await res.text();
  expect(body).toContain('<svg');
});
