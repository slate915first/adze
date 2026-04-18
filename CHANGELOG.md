# Changelog

All notable changes to Adze. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versions are `MAJOR.MINOR` tracking the practitioner-facing feature set rather than strict semver.

Update this file whenever `APP_VERSION` in `src/data/loaders.js` changes.

## [15.0] — 2026-04-18 · End-to-end encrypted sync

### Added
- **Optional cross-device sync with E2E encryption.** Sign up with email+password; set a separate encryption passphrase; your practice data is encrypted in your browser (AES-GCM-256, PBKDF2-SHA256 @ 600k iterations) before being uploaded to Supabase. Nobody but you can read it, including the maintainer.
- New screens: sign-up, sign-in, passphrase setup, passphrase unlock, "forgot passphrase → wipe and reset" flow.
- Welcome page redesigned: single screenful, explicit "I already have an account" entry for returning users.
- Settings "Account & sync" card with three-state status (local / signed-in & unlocked / signed-in & locked).
- `docs/` scaffold: `ROADMAP.md`, `DECISIONS.md` (architecture decision records), `WORKLOG.md`.
- Cloudflare Workers deploy (public URL) driven by `wrangler.toml`.

### Changed
- Removed the old design where the Supabase password doubled as the encryption key — now they are two independent secrets (see `docs/DECISIONS.md` ADR-1).
- Encryption is gated at `syncIsActive()` (authed + passphrase unlocked), not just at auth mode.

### Fixed
- `styles.css` `.tooltip-text` block was missing a closing `}`, which silently broke all rules below it — including feedback-mode outlines and the `.feedback-fab` styling. FAB visibility and element-click feedback mode restored.
- `input { width: 100% }` rule was stretching checkboxes and pushing consent labels out of layout. Now scoped to `input:not([type=checkbox]):not([type=radio])`.
- Toggling the passphrase-setup consent checkbox no longer re-renders the whole modal (which was wiping the passphrase field and triggering Safari's save-password dialog prematurely).
- After sign-in / passphrase-set / passphrase-unlock, the user now lands in setup or the main app depending on `state.setupComplete` — no more "stuck on welcome page after signing in".
- Habit-mode selection uses in-place DOM patching instead of a full re-render (no focus flicker on the custom sliders).
- Removed duplicate `src/loaders.js` (identical twin of `src/data/loaders.js`).

### Privacy / security notes
- Public GitHub repo at https://github.com/slate915first/adze . Supabase anon key is published in the source (publishable by design; RLS policies in the `user_state` table scope access to `auth.uid()`).
- See `modals/privacy-detail.js` → "Your data" for the full data-handling story.

## [14.2] — 2026-04-17 · Stage 1 · Architecture pivot

### Changed
- Decomposed the single-file `app.html` build (~1MB inline HTML) into layered folders: `engine/`, `systems/`, `render/`, `modals/`, `content/`. 57 script tags in load-order-safe sequence.
- Async data loader — 46 JSON + 39 sutta `.md` + 6 sutta-questions `.json` files fetched at boot.

### Fixed
- `renderModal()` dispatcher bug: the `#modal-root` injection code was captured inside `renderPathViewerModal` where `root` was out of scope, so every non-setup modal silently failed to render.

## [Earlier versions]
Earlier versions (`v13.x` and before) predate this changelog. See commit history for details if needed.
