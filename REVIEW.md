# Review rules — Adze

Instructions for Claude Code `/ultrareview` and the GitHub Code Review integration when reviewing changes to this repo. **Project context**: Theravāda Buddhist practice app, solo-maintainer, closed beta → public launch. Browser-side E2E encryption (AES-GCM-256 + PBKDF2) over Supabase, magic-link auth, DSGVO-compliant EU operation.

## Severity escalation rules

Any change to the following is **Important** (not Nit), regardless of size:

- `src/systems/passphrase.js`, `src/systems/crypto.js` — passphrase derivation, AES-GCM key handling. The derived key must never be logged, serialised, or sent over the wire. Flag if a `console.log`, `JSON.stringify(state)`, or network call touches the key or the passphrase in plaintext.
- `src/systems/auth.js`, `src/modals/auth.js` — sign-in, session handling, age + consent gate. Flag any path that lets a sign-in proceed without `#magic-consent` checked or without the `authVerifyMagicCode` regex guard.
- `supabase/functions/delete-account/index.ts` — Art. 17 DSGVO right-to-erasure. Flag any change that (a) reorders the deletes so `auth.users` runs before `beta_allowlist`, (b) swallows an error silently, or (c) fails to verify the JWT-to-email resolution.
- `supabase/migrations/*.sql` — RLS policies, SECURITY DEFINER functions, pg_cron jobs. Flag any SECURITY DEFINER function without `set search_path = ''` or equivalent. Flag any `grant execute ... to public/anon/authenticated` on privileged functions.
- `src/_headers` — CSP, HSTS, frame options. Flag CSP loosening (new domains, `unsafe-*` additions).
- `src/modals/datenschutz.js`, `src/modals/impressum.js`, `src/content/strings/en.json` `datenschutz.*` / `impressum.*` keys — legal-text accuracy. Flag if retention windows, recipient lists, or lawful-basis text drift from `docs/VVT.md`.
- `src/systems/state.js` — `STORAGE_KEY`, `LEGACY_KEYS`, `migrateState`. Flag any rename of `STORAGE_KEY` that doesn't also add the old name to `LEGACY_KEYS` (data-loss risk for anonymous-mode users).

## Compliance gates

- **New personal-data processing** requires a new row in `docs/VVT.md` (Art. 30 DSGVO) + an updated paragraph in `src/modals/datenschutz.js` with a lawful basis (Art. 6 (1) b/f/a) cited. Flag PRs that introduce new `state.*` fields containing user content without touching these files.
- **New server-side unencrypted data about a user** violates ADR-7 (`docs/DECISIONS.md`): server data is a projection of the encrypted state, not a source of truth. Flag any new Supabase table or Edge Function that stores user-identifiable content outside of `user_state` ciphertext.
- **Sangha-feature code** (`docs/SANGHA-DESIGN.md`) is **parked**. Flag any new code that references cross-user bonds, shared profiles, metta/nudge events, or `sangha_*` tables — it should not land without lifting the park (criteria in `docs/COMPLIANCE-LOG.md`).

## Evidence requirements

- Claims of "no behaviour change" must cite a test file proving it, OR explicitly note "no test coverage for this surface — manual verification only."
- Claims of "backwards compatible" for state schema must show the migration path in `migrateState` or reference an existing `LEGACY_KEYS` entry.
- Claims of "secure" for a new input path must name the validation function.

## Project conventions — do NOT flag these

- **`// vXX.Y — …` version-tagged comments** are intentional context, not dead code or over-documentation. Keep.
- **`data-component="..."` attributes** drive the feedback-FAB element picker. Removing them breaks tester reports. Don't suggest removal.
- **`t('strings.key')` calls with full dotted keys** are the i18n contract. Don't suggest shortening, inlining, or refactoring to bundles.
- **`_migrated*` / `_v15140*` flag naming on `state` object** is the established one-time-migration idiom. Don't suggest alternatives.
- **Hoisted top-level `function` declarations** in `src/systems/` and `src/modals/` are load-order-dependent — every file is concatenated into a global scope by `index.html`. Don't suggest converting to `const arrow = () => {}` or ES modules.
- **Markdown exports** (`practice-history.js`, `sangha.js`, `liberation.js`) use template-literal concatenation by design — these are one-off document generators, not a templating layer.
- **Vendored third-party JS** under `src/vendor/` (Tailwind Play CDN runtime, supabase-js UMD) is intentional for DSGVO compliance (no CDN IP-leak). Don't flag file size or suggest importing from npm.

## Accepted trade-offs (don't re-flag every review)

- **CSP `'unsafe-eval'`** is required by the vendored Tailwind Play CDN runtime for JIT class generation. Will drop when a proper Tailwind build step lands.
- **CSP `'unsafe-inline'`** covers legacy inline onclick handlers. Event-delegation refactor is queued; not blocking.
- **`src/loaders.js` + `src/data/loaders.js`** duplicate noted in `docs/ROADMAP.md` backlog.
- **Supabase project ref in memory** (`zpawwkvdgocsrwwalhxu`, anon key in `sb_publishable_*` format) — anon key is designed to be public, safe to surface in client code.

## Out-of-scope for review

- `CHANGELOG.md` entries dated before today.
- Git commit messages (immutable history).
- `docs/` entries archived as "historical" (look for the phrase in the doc header).
- `node_modules/` and any file matching `.gitignore`.

## Bugs worth matching against the existing inventory

- **`placeholder=t('...')` without wrapping `"${...}"`** — this bug class shipped three times (v15.11.5, v15.15.0, v15.15.2). If you see a new instance anywhere, **Important** severity. Pattern: inside a JSX-like template-literal HTML string, an `attribute=t('key')` that lacks `${}` interpolation or quoting — browser reads the literal `t('...')` as attribute value.

## How to scope a typical review

- Default scope: diff from the last tagged release or the last `main` push.
- For auth/crypto/DB-migration touches: widen to the full file + adjacent call sites (one hop of the call graph).
- For legal-text changes: cross-reference against `docs/VVT.md`, `docs/DPIA-sangha.md` (if it exists), and the Datenschutzerklärung modal.
