# Versioning & release workflow

How Adze versions are numbered, when they bump, and the per-release ritual.

## The scheme — SemVer-lite

Three slots: **MAJOR.MINOR.PATCH** (e.g. `15.1.0`). For the first 1–2 PATCH-free releases per minor we drop the trailing `.0` in display ("v15.1") for readability; the underlying constant stays full-form.

| Slot      | When it bumps                                                                  | Cadence during beta            |
| --------- | ------------------------------------------------------------------------------ | ------------------------------ |
| **MAJOR** | Architectural shift or a breaking change for users or for stored data          | Every few months at most       |
| **MINOR** | Any user-visible batch worth telling a tester about                            | Roughly weekly                 |
| **PATCH** | Hotfix only — a single critical bug shipped urgently between minor releases    | Rare, used when needed         |

Examples:
- v15.0 → v15.1 — closed-beta polish + chip taxonomy + email templates *(this kind of release)*.
- v15.1 → v15.1.1 — emergency fix for "passphrase modal won't close" if reported.
- v15.x → v16.0 — Apple/Google OAuth lands (auth flow becomes meaningfully different for users).
- v16.x → v17.0 — Optional opt-in cloud LLM interpretation for free text (privacy contract changes).

## Where the version lives

One source of truth, fanning out:

1. **`src/data/loaders.js`** — `const APP_VERSION = '15.1';` — the canonical value.
2. `src/render/setup.js` — setup intro footer reads `v${APP_VERSION}`.
3. `src/systems/feedback-builder.js` — feedback emails include version.
4. `src/modals/element-feedback.js` — element-feedback header shows version.
5. `src/systems/export-import.js` — JSON exports stamp the version.
6. `CHANGELOG.md` — human-readable log of what landed in each release.
7. **Git tag** `v15.1` on GitHub — canonical pointer to the exact code.
8. *(Optional)* GitHub Releases page — auto-populated from tags + changelog entries.

## The per-release ritual

When you have a batch worth bumping for, do this in order:

1. **Decide MAJOR / MINOR / PATCH.** Default to MINOR unless you're shipping a breaking change (MAJOR) or a single hotfix (PATCH).
2. **Bump `APP_VERSION`** in `src/data/loaders.js`.
3. **Add a `## [X.Y]` section** at the top of `CHANGELOG.md`. Group entries under `### Added`, `### Changed`, `### Fixed`, `### Removed` (Keep-a-Changelog convention). Date the entry.
4. **Commit** with message starting `Release v15.1: <one-line summary>`.
5. **Tag** the commit:
   ```
   git tag v15.1 -m "v15.1 — <one-line summary>"
   git push --tags
   ```
6. **Push** to `main`. Cloudflare auto-deploys.
7. *(Optional but nice)* On GitHub → Releases → "Draft a new release" → pick the tag → paste the changelog entry as the description → Publish.

## What counts as "user-visible enough" to bump?

Bump for:
- Anything a tester might notice in the UI.
- Anything that changes behavior they'd reach for.
- Anything we'd want them to be able to refer to later ("oh, that was fixed in v15.2").

Don't bump for:
- Doc-only changes (`docs/*.md`, `README`, `CHANGELOG.md` itself before the next bump).
- Internal refactors without behavior change.
- CI / tooling.
- A single new comment.

If in doubt: don't bump. Multiple unbumped commits collapse cleanly into the next bump.

## Reading old versions

Pre-v14 entries are not in `CHANGELOG.md`. Earlier history lives only in `git log`. For Stage 1 (v14.x and earlier) the lineage is:
- v13.x — the inline-everything single-file build (legacy `app.html`).
- v14.0–v14.2 — the architecture pivot (decomposed into `engine/` `systems/` `render/` `modals/`).
- v15.x — Stage 2 (E2E sync) and Stage 3 (Cloudflare deploy).

## When testers report a bug

Encourage them to include the version (the setup intro and feedback emails already carry it). For very precise repro, the short git SHA tied to a tag — visible in GitHub releases — disambiguates an unreleased patch from the tagged version.

## Migrating data between versions

If a release introduces a new shape for `state` (added or renamed fields), `migrateState()` in `src/systems/state.js` is the single place to handle the migration. Add a `// vX.Y —` comment block describing the migration so future releases can see the lineage. Migrations are one-way and idempotent — they never undo past migrations.
