// Vitest configuration. Adze is a no-build static site; tests target the
// pure functions in src/engine/ (and friends) that are CommonJS-compatible.
// Browser-only modules (DOM, Web Audio, Web Crypto) are out of scope here —
// those need a Playwright e2e harness, planned for a later release.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/engine/**/*.js']
    }
  }
});
