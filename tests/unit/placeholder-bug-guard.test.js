// ============================================================================
// tests/unit/placeholder-bug-guard.test.js
// ----------------------------------------------------------------------------
// Guards against the `placeholder=t('...')` unquoted-attribute bug class.
//
// Context: Adze uses template-literal HTML for modal rendering. When a
// template writes `<textarea placeholder=t('key')>`, the browser parses
// `t('key')` as a literal unquoted HTML attribute value — the user sees
// the text `t('element_feedback.report_placeholder')` as the placeholder,
// not the translation. The fix is always the same: wrap with
// `placeholder="${t('key')}"` so the `${}` interpolation runs before the
// attribute is parsed.
//
// This bug shipped SEVEN times before this test existed (v15.11.5,
// v15.15.0, v15.15.2, v15.15.4 × 4). REVIEW.md escalates new instances
// to Important severity. This test turns that rule into CI.
//
// Scope: src/ directory, .js files only, excluding src/vendor/* (third-
// party bundled code) and single-line `//` and block `*` comments.
// ============================================================================

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', '..', 'src');

function walkJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'vendor') continue; // skip vendored third-party JS
      out.push(...walkJsFiles(p));
    } else if (entry.name.endsWith('.js')) {
      out.push(p);
    }
  }
  return out;
}

describe('placeholder=t(...) unquoted bug guard', () => {
  it('finds no instances of `placeholder=t(` in active src/ JS', () => {
    const files = walkJsFiles(SRC_DIR);
    const violations = [];
    for (const filePath of files) {
      const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        // Skip comment lines — they may reference the bug class in docs.
        if (trimmed.startsWith('//')) return;
        if (trimmed.startsWith('*')) return;
        if (/placeholder\s*=\s*t\s*\(/.test(line)) {
          violations.push(`${filePath}:${i + 1}\n    ${line.trim()}`);
        }
      });
    }
    if (violations.length > 0) {
      const msg =
        'Found unquoted `placeholder=t(...)` — must be wrapped as ' +
        '`placeholder="${t(\'key\')}"` so the interpolation runs before ' +
        'HTML attribute parsing.\n\n' +
        violations.map(v => '  ' + v).join('\n\n');
      throw new Error(msg);
    }
    expect(violations).toEqual([]);
  });
});
