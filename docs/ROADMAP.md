# Adze Roadmap

One source of truth for stages, current scope, and what's next. Update at the end of each working session.

## Stage 1 — Architecture pivot · DONE (2026-04-17)
Decomposed single-file `app.html` into `engine/` · `systems/` · `render/` · `modals/` · `content/` layers. 57 script tags in load-order-safe sequence. Async data loader. Verified rendering in browser. Fixed `renderModal()` dispatcher bug that had hidden modal injection in `renderPathViewerModal`.

## Stage 2 — Auth + client-side E2E encryption · ~90% (2026-04-18)
**Done:**
- Supabase auth (email/password), session persistence, `auth.js` decoupled from crypto.
- `passphrase.js`: AES-GCM-256 key derived via PBKDF2-SHA256 @ 600k iters, per-user salt, in-memory only.
- `user_state` table in Supabase with RLS scoped to `auth.uid()`.
- Auth modal flow: menu → signup/signin → passphrase-setup / passphrase-unlock / reset-confirm / success.
- Welcome page redesigned to a single screenful with explicit "I already have an account" CTA.
- Settings "Account & sync" card shows three states (local / authed+unlocked / authed+locked).
- Boot-time auto-prompt: authed-but-locked → unlock modal.
- `authAfterAuthSuccess` routes to setup or main app based on `setupComplete`.
- Stylesheet fix: checkboxes no longer stretched by `input { width:100% }`.
- Habit-mode button: in-place DOM patch instead of full re-render.

**Remaining:**
- Encryption transparency section in `modals/privacy-detail.js` + matching strings.
- Password reset UI hooked up to `authResetPassword(email)` in `auth.js`.
- Re-enable Supabase email confirmation before public release.
- Settings card link to "How encryption works" → opens privacy-detail modal.

## Stage 3 — Deploy · LIVE (2026-04-18)
- GitHub repo: https://github.com/slate915first/adze (public).
- Cloudflare deploy: https://adze.cloudflare-adze-gotten828.workers.dev via `wrangler.toml` (Workers with static assets, SPA fallback).
- Auto-deploy wired: pushes to `main` redeploy automatically.

**Remaining:**
- Smoke-test full signup + passphrase + sync round-trip on the Workers URL.
- Custom domain decision (optional; e.g., `adze.app` if available).
- Confirm Supabase CORS/redirect URLs include the Workers domain.

## Stage 4 — Open items, no target date
- OAuth providers (Apple, Google) — requires Apple Developer account + Google Cloud OAuth client + Supabase provider config.
- Optional LLM interpretation for free text (opt-in, explicit "this leaves your device" disclosure). Deferred — may never ship.
- Obsidian vault integration for sutta tracking + project journal.
- **Cross-user Sangha** — bond with other practitioners, visible profile cards with per-field opt-in sharing, metta/quote/nudge actions, champion-ability effects across bonds. Full design in `docs/SANGHA-DESIGN.md`. Implementation in 4 stages.

## Current Focus (what's next)
1. **Fix feedback FAB regression** (blocks beta testing).
2. **Version constant + `CHANGELOG.md`** — wire `APP_VERSION` through welcome/setup/settings/feedback email subject.
3. **Encryption transparency copy** — finish the privacy-detail modal update we started.
4. **Setup diagnostic rework:** chip suggestions + local interpretation for Phase 2 optional questions; one-question-per-step for Phase 3 sliders.
5. **Assessment-step flicker** — apply in-place DOM patch pattern.

## Backlog (not committed)
- Duplicate file: `src/loaders.js` and `src/data/loaders.js` are both present. One is a leftover — consolidate.
- Setup character-detail round-trip loses cursor focus on the name input (cosmetic, non-data-loss).
- German + Malay translations (current strings file is English only).
