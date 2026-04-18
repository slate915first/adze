// tests/e2e/feedback-fab.spec.js
// Specifically guards against the v15.x feedback-FAB regression where a
// missing `}` in styles.css silently dropped the .feedback-fab styling
// (and the entire feedback-mode overlay) below it. The fix shipped in
// v15.x is invisible to vitest — only a real browser sees the rendered
// CSS and can assert the FAB is positioned + visible.

import { test, expect } from '@playwright/test';

test('feedback FAB exists, is positioned bottom-right, and is visible', async ({ page }) => {
  await page.goto('/');
  const fab = page.locator('#feedback-fab');
  await expect(fab).toBeVisible();
  // Position checks: should be fixed bottom-right.
  const box = await fab.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  // Within 100px of bottom-right edge. Generous to accommodate safe-area.
  expect(viewport.height - (box.y + box.height)).toBeLessThan(100);
  expect(viewport.width  - (box.x + box.width)).toBeLessThan(100);
  // Non-trivial size — Apple HIG minimum tap target is 44x44.
  expect(box.width).toBeGreaterThanOrEqual(40);
  expect(box.height).toBeGreaterThanOrEqual(40);
});
