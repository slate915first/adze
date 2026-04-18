# Changelog

All notable changes to Adze. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versions are `MAJOR.MINOR` tracking the practitioner-facing feature set rather than strict semver.

Update this file whenever `APP_VERSION` in `src/data/loaders.js` changes.

## [15.9] — 2026-04-18 · Prefetch-resistant invite + recovery flow

### Changed (security/UX)
- **Email links now route through Adze itself.** The `invite.html` and `reset-password.html` templates emit URLs like `https://adze.life/?invite_token={{ .TokenHash }}&type=invite|recovery` instead of Supabase's default `{{ .ConfirmationURL }}`. Adze becomes the landing page; the token is **only** verified when the human clicks "Set up your account" on the landing modal.
- This closes the gmail / proxy / link-scanner prefetch attack class. Previously, anything that prefetched the email URL hit Supabase's verify endpoint and consumed the single-use token before the human got there. Now prefetches only fetch a static landing page; the token survives.

### Added
- `auth.js` `_pendingInviteToken` state + `authConsumeInviteToken()` function. Reads `?invite_token=...&type=...` from the URL on boot, holds the token until the user taps the landing CTA, then calls `verifyOtp({ token_hash, type })` to spend it.
- New modal step `invite-landing` in `modals/auth.js`. Two flavors via `tokenType`:
  - **invite** — "Welcome to Adze" + "Set up your account →"
  - **recovery** — "Reset your password" + "Confirm & choose a new password →"
- Three new e2e tests in `tests/e2e/invite-flow.spec.js` (now 6 total):
  - `?invite_token=...&type=invite` shows the landing button; click hands off to set-password.
  - `?invite_token=...&type=recovery` shows the recovery-flavored button.
  - Landing page does NOT auto-verify on load — the verify endpoint is never hit until the user clicks. (Asserted by intercepting the `/auth/v1/verify` route and checking call count = 0.)

### Compatibility
- The legacy `#access_token=…&type=invite` implicit-flow URL handling is kept as a defensive fallback for any pending invite emails sent before this release. New invites use the new format automatically.
- Re-install the templates in Supabase dashboard → Email Templates after this deploys (the URL inside the HTML changed).

### UX cost
- One extra tap per invite acceptance. Net win: tokens no longer die to prefetches, so testers stop seeing "the link doesn't work." The landing page also frames the moment more deliberately than dropping straight into a password form from an email click.

## [15.8] — 2026-04-18 · Invite-flow e2e regression guard

### Added
- `tests/e2e/invite-flow.spec.js` (3 tests) — verifies that landing on Adze with `#access_token=…&type=invite` (the URL Supabase emits after `verify(invite)`) opens the **Set your password** modal; same for `type=recovery`; and that a plain page load *without* the hash does **not** open the set-password modal. Stubs the Supabase JS CDN via Playwright route interception so no real Supabase round-trip is needed.

### Why this matters
- The invite-link path has now broken twice manually (path-viewer syntax error in v15.7, plus a separate cache-staleness issue Li May hit). With this test, future regressions in the implicit-flow URL detection / `_pendingPasswordSet` flag / `set-initial-password` modal step are caught in CI before they reach a tester.

### Notes
- The stub overrides `window.supabase.createClient` to return a fake client whose `getSession()` returns a session object. Combined with `urlPasswordSetHint` from the URL hash, this exercises the same code path a real invite triggers — without sending real emails.

## [15.7] — 2026-04-18 · Playwright e2e + path-viewer syntax fix

### Added
- **Playwright end-to-end test suite** with 9 chromium tests + 1 mobile-chrome viewport test:
  - `welcome.spec.js` — heading/CTA/sign-in/closed-beta-pill render; no JS console errors on first paint; sign-in modal hides "Create an account" while signups are off; mobile viewport (Pixel 5) fits primary content without scrolling.
  - `anonymous-onboarding.spec.js` — clicking Begin opens the setup modal without throwing. (The integration-level guard for the v15.1.1 chip-array crash class.)
  - `feedback-fab.spec.js` — FAB exists, positioned bottom-right, ≥40 px tap target. Catches the v15.x missing-`}` regression that nuked all feedback-mode CSS.
  - `pwa.spec.js` — `manifest.json` resolves with the right shape, service worker registers within 10 s, `icon.svg` resolves.
- `.github/workflows/test.yml` extended with an `e2e` job: installs Chromium, runs the suite, uploads Playwright traces on failure for 7-day debugging.
- New npm scripts: `test:e2e`, `test:e2e:ui` (interactive), `test:e2e:live` (run welcome + PWA tests against the live `https://adze.life` deploy).

### Fixed
- **`src/modals/path-viewer.js`** had an extra orphan `}` at line 462 — leftover from when the renderModal-injection code was extracted out to `main.js` weeks ago. Browsers parsed everything up to the orphan brace as `renderPathViewerModal`, then hit the function's real `return content;` at top-level scope and threw "Illegal return statement" on every page load. The Welcome page rendered (the error fired late and silently for most users), but every modal that depended on globals defined later in the script-tag chain was potentially affected. The new e2e console-errors test caught it on the first run.

## [15.6] — 2026-04-18 · Account deletion (GDPR right to erasure)

### Added
- **Delete my account** flow in Settings → Account & sync → Danger zone. Two-step confirmation: open the modal, type the exact phrase `delete my account`, click the button (only enabled when the phrase matches). On confirm, the server-side Edge Function `delete-account` deletes the `auth.users` row using the service role; `user_state` cascades via the FK. Then the client signs out, locks the passphrase, wipes localStorage, and resets in-memory state. The user lands back on the welcome screen with no trace.
- Supabase Edge Function `delete-account` deployed to project `zpawwkvdgocsrwwalhxu`. Verifies the caller's JWT (so a user can only delete their own account), uses service role for the actual delete, returns `{success:true,deletedUserId}` on success.

### Notes
- Satisfies GDPR Article 17 (right to erasure) which is *legally required* for EU users — Adze has German testers (Leipzig) so this isn't optional.
- No 30-day grace period, no soft delete, no shadow row. The user asked to disappear; they disappear. The privacy promise depends on it.
- Anonymous users (no Supabase account) don't see a "Delete account" button — there's no account to delete. They can use the existing "Reset everything" in Settings to wipe localStorage.

## [15.5] — 2026-04-18 · Custom bell upload + unit-test infra

### Added
- **Custom bell upload** in Settings → Bell sound → "＋ Use your own bell". Tester picks any audio file (MP3, WAV, OGG, M4A, AAC, FLAC); validation enforces ≤500 KB, ≤60 seconds, audio MIME / extension. Stored as a base64 data URL on `state.prefs.customBellDataUrl` so it syncs encrypted along with the rest of state — the maintainer cannot hear it on the server. New variant `'custom'` appears in the bell list with replace + remove + preview controls. Constraints + reasoning documented inline in `systems/sound.js`.
- **Unit-test infrastructure** — Vitest + 33 tests covering `engine/diagnostic.js` across every experience branch, chip-array shapes (the v15.1.1 regression class is now caught by 6 dedicated tests), chip-flag-driven `beginnerCare` copy, experienced-branch insight detection (4NT, eightfold, tradition gratitude, dark territory), supporting habits, first-sutta selection. Runs in `npm test`.
- **GitHub Actions CI** — `.github/workflows/test.yml` runs `npm ci` + `npm test` on every push and PR to main. Future PRs will fail the check before merge if any test breaks.
- **`media-src 'self' data: blob:`** added to the CSP `_headers` so the custom bell's data URL plays without a policy violation.

### Notes
- 500 KB limit was chosen because base64 encoding inflates ~33%, and the ciphertext on Supabase needs to stay reasonable to encrypt/decrypt fast on each save.
- Filename is HTML-escaped before display in Settings (no XSS via filename).
- The file never leaves the browser before encryption; no server-side upload, no third-party storage.

## [15.4] — 2026-04-18 · Installable PWA + real bell recordings

### Added
- **Progressive Web App.** Adze is now installable on iOS (Safari Share → Add to Home Screen), Android (Chrome auto-prompt), and desktop. Opens without browser chrome with its own ☸️ dharmachakra icon. New files: `src/manifest.json`, `src/icon.svg` (gold dharmachakra on parchment-dark), `src/sw.js` (service worker).
- **Offline-capable.** Service worker caches the app shell (cache-first), `/content/*` JSON (network-first with cache fallback), and lets Supabase calls pass through (never cached — preserves the E2E story). After first visit, Adze opens instantly and works without network.
- **Real recorded bell sounds** replacing the synthesized oscillator versions for four of the five variants. Five CC0 Tibetan bowl recordings from BigSoundBank (CC0 1.0 Public Domain, recorded by Joseph SARDIN with Tascam DR-40 + Sennheiser ME66) live in `src/content/sounds/bells/`. Credits + provenance + how to add new bells: `src/content/sounds/bells/CREDITS.md`.
- `BELL_VARIANTS` schema extended: each variant can specify `sample: 'path/to/file.mp3'` for a recorded bell, `play(ctx)` for synthesized fallback, or both. `systems/sound.js` prefers the sample; falls back to synth if the sample fails. Audio is cached per-variant after first play for instant preview.

### Changed
- **`warm`** variant — was synthesized 3-tone sine. Now: real Tibetan bowl strike (low and round). The default.
- **`goenka`** variant — was 3-tone sine that sounded "creepy" (user feedback). Now: real Tibetan bowl strike with extended decay. Closest CC0 match for a Burmese-style ritual bell. The actual VRI bell is copyrighted; this is the privacy-respecting substitute. Variant renamed in UI to "Long-decay bowl" to avoid implying authorization from VRI.
- **`singing`** variant — was 5-tone sine with beat frequencies. Now: real friction-rung Tibetan singing bowl, 44 seconds.
- **`thai`** variant — was 4-tone sine. Now: real bright Tibetan bowl strike. Renamed to "Bright bowl strike" — same reason as goenka.
- **`wood`** variant — kept synthesized (no CC0 wood-block recording sourced yet). Description notes the gap.

### Notes for future
- iOS apple-touch-icon currently uses the SVG; iOS may rasterize fuzzily on some devices. To get crisp PNG variants (180/192/512), drop `src/icon.svg` into [realfavicongenerator.net](https://realfavicongenerator.net) and add the resulting PNGs to the manifest.
- Cache size: bells add ~3.6 MB. Cached lazily on first listen, not at install — initial PWA install stays under 100 KB.

## [15.3] — 2026-04-18 · Production hygiene + password reset

### Added
- **Public-repo essentials:** root `README.md` (project elevator, how-to-run, doc links), `LICENSE` (MIT), `SECURITY.md` (vulnerability disclosure policy + scope, security@adze.life).
- **Defensive HTTP headers** via `src/_headers`: Content-Security-Policy locked to known origins (Supabase, Tailwind CDN, jsdelivr); X-Frame-Options DENY; X-Content-Type-Options nosniff; Strict-Transport-Security (1 year); Referrer-Policy strict-origin-when-cross-origin; Permissions-Policy locking off camera/mic/geolocation/etc.
- **Terms of use** at `docs/TERMS.md` — Adze's first formal terms document (beta-realistic: as-is, no SLA, GDPR-respecting, MIT for code, your reflections belong to you).
- **User-journey map** at `docs/USER-JOURNEY.md` — day-1 through day-30 milestones with the magic moment each one is designed to produce, plus failure modes and recovery hooks.
- **Beta success metrics** at `docs/METRICS.md` — the 4 numbers (onboarding completion, day-7 retention, day-30 retention, reports per active tester per week), how to pull each from Supabase, exit criteria for leaving beta.
- **"Forgot password?" UI** in the sign-in modal: opens a new `forgot-password` step that calls `authResetPassword(email)`, shows a generic "check your inbox" confirmation (without revealing whether the email exists). The reset link returns the user to the existing `set-initial-password` modal via the `type=recovery` URL hash that `authInit` already handles.

### Changed
- **`privacy_detail.para_gdpr` rewritten** to honestly describe the v15.x sync architecture: Adze is the data controller, Supabase is the processor under EU SCCs, ciphertext is unreadable by either, GDPR rights apply, contact `hello@adze.life` for any of them. The pre-v15.0 wording wrongly claimed no third party was involved.
- README now points visitors directly to `adze.life` and links every doc in the project.

## [15.2] — 2026-04-18 · Chip flags shape recommendation copy

### Added
- `engine/diagnostic.js` `computeRecommendation` now accepts a `chipInterp` second argument (the result of `interpretChipSelections`). When the user selected a chip in Phase 2 with a known mapping, the beginnerCare copy on the recommendation card now includes a targeted line:
  - **`posture.back`** → "Back: a chair with a small lumbar pillow often beats a cushion…"
  - **`posture.lower_body`** → "Knees / hips: a chair, a bench, or even lying down — all honorable…"
  - **`posture.upper_body`** → "Shoulders / neck: drop the shoulders away from the ears…"
  - **`posture.general`** → "Chronic pain: walking meditation may serve you better than seated…"
  - **`bias.morning_sits`** → "Energy / sleep: morning sits before fatigue settles tend to land more cleanly…"
  - **`posture.injury_temporary`** → "While the injury heals: keep sits short and gentle…"
  - **`misconception.thoughts`** → "On thoughts not stopping: the instruction is not 'no thoughts'…"
  - **`framing.secular_preferred`** → "On the framing: nothing here requires belief…"
  - **`friction.perfectionism`** → "On missing days: a five-minute thread that holds for years is stronger…"
  - **`self_image.nervous`** → "On 'spiritual enough': there is no such thing to be…"
  - **`friction.time`** → "On time: shorter sits done daily build more momentum…"
- The full chip → flag → copy chain is now end-to-end. Tester picks "Knees" → engine knows `posture.lower_body` → recommendation card mentions chair / bench / lying-down. No more "stored but never used" flags.

### Changed
- Both call sites of `computeRecommendation` (in `setup-flow.js` and `render/setup.js`) now pass `chipInterpretation`. The render-side path computes it lazily if missing.

## [15.1.1] — 2026-04-18 · Hotfix — recommendation crash for beginners

### Fixed
- `engine/diagnostic.js` called `.trim()` on `diag.physicalConcerns` and `diag.concerns`, which became arrays in v15.1 when those questions switched from textareas to chips. Any beginner ("Never sat" / "A little") clicking "See recommendation" silently crashed in `computeRecommendation`. Now handles arrays + the optional "Other" free-text + legacy string format.

## [15.1] — 2026-04-18 · Closed beta polish

### Added
- **Beta tester guide** — six-card swipeable modal fires once after onboarding (`modals/beta-guide.js`); re-openable anytime from Settings → "About Adze · Beta guide". Covers what Adze is, what's still rough, the 💬 button, testing the recommendations against your own judgment, and three motivational reasons your feedback matters.
- Long-form companion: `docs/BETA-GUIDE.md` — same content for sharing as a public link.
- **Phase 2 chip taxonomy** for the three optional onboarding questions (`stoppedBefore`, `physicalConcerns`, `concerns`). Replaces blank textareas with curated multi-select chips, each mapped deterministically and locally to diagnostic factor bumps + practical flags. See `docs/CHIP-INTERPRETATION.md` for the full rationale.
- **Phase 3 mindful redesign** — diagnostic Phase C now shows one slider per step with progress dots and a "Skip this one" secondary, replacing the all-five-on-one-page layout.
- **Encryption transparency** in the privacy modal — algorithm specifics (PBKDF2-SHA256 @ 600k, AES-GCM-256, non-extractable, Web Crypto) plus links to source code and reference specs.
- **Closed-beta gating** — auth modal and welcome page hide self-signup when `ADZE_PUBLIC_SIGNUP_ENABLED=false` (default during beta) and surface `hello@adze.life` for invitation requests.
- **Three Adze-styled email templates** in `email-templates/`: `invite.html`, `confirm-signup.html`, `reset-password.html`. Plus a README with Supabase + Resend SMTP setup steps.
- **Passphrase strength meter** on the setup modal — length + character-variety score, colored bar, actionable label ("Add upper/lowercase, numbers, symbols").
- **Custom domain** `adze.life` connected via Cloudflare Workers + `wrangler.toml`.
- **Cloudflare Email Routing** for receiving inbound mail at `hello@`, `feedback@`, `beta@adze.life`.
- `docs/FEEDBACK.md` scaffold for tracking beta tester reports.
- `docs/VERSIONING.md` documenting the release workflow.

### Changed
- Welcome page redesigned to a single screenful with "I already have an account" entry for returning users; gains a "Closed beta · by invitation" pill.
- Settings → Account & sync card has three states (local / authed+unlocked / authed+locked) and a "How encryption works" link.
- Feedback FAB now sends to `feedback@adze.life` (was `adze.feedback@gmail.com`).
- All `.btn` elements get `min-height: 44px` (Apple HIG minimum tap target).
- FAB respects `env(safe-area-inset-bottom)` on notched iPhones.
- Phase A radio + multi-select interactions now patch the DOM in place instead of full re-renders, eliminating selection flicker.
- Habit-mode card switching uses the same in-place pattern.
- All passphrase / initial-password inputs disabled during the encrypting/saving busy state.

### Fixed
- Supabase invite-link sign-in flow: detects implicit-flow tokens in the URL hash (`#access_token=…&type=invite`) before the SDK consumes them, so invitees land on a "Set your password" modal instead of being routed to passphrase-unlock with no passphrase.
- Phase A Continue button stuck disabled on mobile after radio selections (regression from the in-place flicker polish).
- Passphrase-setup checkbox no longer triggers a full modal re-render (was wiping passphrase fields and pre-firing Safari's save-password dialog).
- `pauseSetupForCare` reset shape now matches the v15.x diagnostic model (chip arrays, Other free-text, phaseCStep).
- After sign-in / passphrase-set / passphrase-unlock, users now land in onboarding or the main app based on `state.setupComplete` — no more "stuck on welcome page after signing in".

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
