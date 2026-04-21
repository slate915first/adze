// tests/e2e/theme-tokens.spec.js
// v15.19.7 — Token-resolution regression guard.
//
// On 2026-04-21 v15.19.0 shipped a broken :root block where 14 tokens
// were declared as --foo: var(--foo);. Browsers resolve circular
// custom-property references as the guaranteed-invalid value (empty
// string), which broke body background, text color, and borders on
// live adze.life until v15.19.6 caught it. vitest did not catch the
// bug because CSS variable resolution is a browser concern.
//
// This spec enumerates every token declared in :root (via the browser's
// parsed stylesheet — the CSSOM) and asserts each resolves to a
// non-empty computed value in both classic and calm themes. A new
// token automatically gets covered — no maintenance as the token
// surface grows.

import { test, expect } from '@playwright/test';

// Read tokens directly from the browser's CSSOM so we check the
// ACTUALLY-PARSED stylesheet, not source text. This catches any rule
// the browser rejected silently (bad syntax, wrong scope).
async function readBaseTokens(page) {
  return page.evaluate(() => {
    const names = [];
    for (const sheet of document.styleSheets) {
      if (!sheet.href || !sheet.href.includes('styles.css')) continue;
      if (sheet.href.includes('theme-')) continue;
      for (const rule of sheet.cssRules || []) {
        if (rule.type !== CSSRule.STYLE_RULE) continue;
        if (rule.selectorText !== ':root') continue;
        for (let i = 0; i < rule.style.length; i++) {
          const prop = rule.style[i];
          if (prop.startsWith('--')) names.push(prop);
        }
      }
    }
    return names;
  });
}

async function resolveAllTokens(page, names) {
  return page.evaluate((ns) => {
    const out = {};
    const cs = getComputedStyle(document.documentElement);
    for (const n of ns) out[n] = cs.getPropertyValue(n).trim();
    return out;
  }, names);
}

// Enumerate tokens declared in theme-calm.css under :root[data-theme="calm"].
// The v15.19.0 circular-ref bug happened in this exact block shape but in
// styles.css; the bug class applies equally here. This function mirrors
// readBaseTokens for the calm theme.
async function readCalmTokens(page) {
  return page.evaluate(() => {
    const names = [];
    for (const sheet of document.styleSheets) {
      if (!sheet.href || !sheet.href.includes('theme-calm.css')) continue;
      for (const rule of sheet.cssRules || []) {
        if (rule.type !== CSSRule.STYLE_RULE) continue;
        if (rule.selectorText !== ':root[data-theme="calm"]') continue;
        for (let i = 0; i < rule.style.length; i++) {
          const prop = rule.style[i];
          if (prop.startsWith('--')) names.push(prop);
        }
      }
    }
    return names;
  });
}

test.describe('Design tokens — regression guard', () => {
  test('every :root token resolves to a non-empty value in classic theme', async ({
    page,
  }) => {
    await page.goto('/');
    const names = await readBaseTokens(page);
    expect(names.length, 'no tokens found in :root').toBeGreaterThan(0);
    const resolved = await resolveAllTokens(page, names);
    const empty = Object.entries(resolved)
      .filter(([, v]) => v === '')
      .map(([n]) => n);
    expect(empty, 'tokens that failed to resolve in classic theme').toEqual([]);
  });

  test('every :root token still resolves when data-theme="calm" is active', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() =>
      document.documentElement.setAttribute('data-theme', 'calm')
    );
    const names = await readBaseTokens(page);
    const resolved = await resolveAllTokens(page, names);
    const empty = Object.entries(resolved)
      .filter(([, v]) => v === '')
      .map(([n]) => n);
    expect(empty, 'tokens that failed to resolve in calm theme').toEqual([]);
  });

  test('theme-calm.css :root[data-theme="calm"] — every declared token resolves (when active)', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() =>
      document.documentElement.setAttribute('data-theme', 'calm')
    );
    const names = await readCalmTokens(page);
    // Calm may be empty in theory; if so the test is vacuous — fine.
    if (names.length === 0) return;
    const resolved = await resolveAllTokens(page, names);
    const empty = Object.entries(resolved)
      .filter(([, v]) => v === '')
      .map(([n]) => n);
    expect(empty, 'calm-theme tokens that failed to resolve').toEqual([]);
  });

  test('theme-calm.css — no circular self-reference in :root[data-theme="calm"]', async ({
    page,
  }) => {
    await page.goto('/');
    const circular = await page.evaluate(() => {
      const found = [];
      for (const sheet of document.styleSheets) {
        if (!sheet.href || !sheet.href.includes('theme-calm.css')) continue;
        for (const rule of sheet.cssRules || []) {
          if (rule.type !== CSSRule.STYLE_RULE) continue;
          if (rule.selectorText !== ':root[data-theme="calm"]') continue;
          for (let i = 0; i < rule.style.length; i++) {
            const name = rule.style[i];
            if (!name.startsWith('--')) continue;
            const value = rule.style.getPropertyValue(name).trim();
            const selfRefPattern = new RegExp(
              `^var\\(\\s*${name.replace(/-/g, '\\-')}\\s*[,)]`
            );
            if (selfRefPattern.test(value)) found.push(name);
          }
        }
      }
      return found;
    });
    expect(circular, 'circular self-references in theme-calm.css').toEqual([]);
  });

  test('no token self-references itself (circular ref guard)', async ({ page }) => {
    await page.goto('/');
    // For each declared token, check its raw declared value (not the
    // computed value). Read the :root rule's cssText and look for the
    // exact bug shape: --foo: var(--foo)
    const circular = await page.evaluate(() => {
      const found = [];
      for (const sheet of document.styleSheets) {
        if (!sheet.href || !sheet.href.includes('styles.css')) continue;
        if (sheet.href.includes('theme-')) continue;
        for (const rule of sheet.cssRules || []) {
          if (rule.type !== CSSRule.STYLE_RULE) continue;
          if (rule.selectorText !== ':root') continue;
          for (let i = 0; i < rule.style.length; i++) {
            const name = rule.style[i];
            if (!name.startsWith('--')) continue;
            const value = rule.style.getPropertyValue(name).trim();
            // Match var(--same-name) regardless of whitespace.
            const selfRefPattern = new RegExp(
              `^var\\(\\s*${name.replace(/-/g, '\\-')}\\s*[,)]`
            );
            if (selfRefPattern.test(value)) found.push(name);
          }
        }
      }
      return found;
    });
    expect(circular, 'circular self-references in :root').toEqual([]);
  });

  test('every token referenced in a rule body is declared in :root', async ({
    page,
  }) => {
    await page.goto('/');
    const diagnostics = await page.evaluate(() => {
      const declared = new Set();
      const referenced = new Set();
      for (const sheet of document.styleSheets) {
        if (!sheet.href || !sheet.href.includes('styles.css')) continue;
        if (sheet.href.includes('theme-')) continue;
        for (const rule of sheet.cssRules || []) {
          if (rule.type !== CSSRule.STYLE_RULE) continue;
          if (rule.selectorText === ':root') {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) declared.add(prop);
            }
            continue;
          }
          // Scan rule.cssText for var(--name) references.
          const matches = rule.cssText.matchAll(/var\(\s*(--[\w-]+)/g);
          for (const m of matches) referenced.add(m[1]);
        }
      }
      const missing = [...referenced].filter((r) => !declared.has(r));
      return { missing, declaredCount: declared.size, referencedCount: referenced.size };
    });
    expect(
      diagnostics.missing,
      `${diagnostics.missing.length} token(s) referenced in rule bodies but not declared in :root`
    ).toEqual([]);
  });

  test('body has a real background in classic theme (sentinel)', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(
      () => getComputedStyle(document.body).backgroundImage
    );
    // Classic body has a radial-gradient. If any surface token broke,
    // the gradient would collapse to "none".
    expect(bg, 'body background-image was empty in classic theme').toMatch(
      /radial-gradient/
    );
  });

  test('body text color is non-default in classic theme (sentinel)', async ({
    page,
  }) => {
    await page.goto('/');
    const color = await page.evaluate(() => getComputedStyle(document.body).color);
    // Default body color is rgb(0, 0, 0). A broken --surface-ink token
    // would fall back to that. The classic token is #e6dcc8 (parchment).
    expect(color, 'body color fell back to browser default').not.toBe(
      'rgb(0, 0, 0)'
    );
  });
});
