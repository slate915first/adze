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
- **Cross-user Sangha** — bond with other practitioners, visible profile cards with per-field opt-in sharing, metta/quote/nudge actions, champion-ability effects across bonds. Design in `docs/SANGHA-DESIGN.md`; implementation sequencing in `docs/COMPLIANCE-LOG.md` Track C (5 stages, replacing the original 4).

## Compliance + Sangha sequencing (added 2026-04-19)

Three independent reviews (game design, senior-engineer audit, DSGVO/lawyer audit) converged on a sequenced rollout. Detailed action items + rationale + decision log in **`docs/COMPLIANCE-LOG.md`** — this is the index.

**Track A — must complete before EU beta opens beyond Dirk's allowlist** (~1 work-week)
1. Self-host Tailwind + Supabase-JS-SDK (kills CDN IP-leak; tightens CSP). One hour, biggest legal-risk reduction per minute.
2. Add Impressum (modal + footer link). Needs ladungsfähige Anschrift decision.
3. Expand Datenschutzerklärung to Art. 13 completeness.
4. Link Terms + age/Datenschutz checkbox in magic-request flow.
5. DPA evidence archive (Supabase, Cloudflare, Resend) + 1-page TIA.
6. Incident-response procedure (`docs/INCIDENT-RESPONSE.md`, intern).
7. VVT (`docs/VVT.md`, intern).
8. DATA-SUBJECT-REQUESTS process doc.
9. Extend `delete-account` Edge Function to also clean `beta_allowlist`.
10. Define + publish retention windows (incl. 24-month-inactivity auto-delete cron).

**Track B — must complete before Sangha implementation begins**
1. ADR-7 (server data is a projection, never source of truth).
2. DPIA-sangha.md (Art. 35 — `dominant_hindrance` is Art. 9 sensitive).
3. Design the missing brahmavihāra verbs (karuṇā, muditā, upekkhā — only metta has one today).
4. Design dormancy / dissolution / abuse-handling.
5. Resolve `dominant_hindrance` UX (coarsen-or-precise toggle).
6. Resolve the 4 open design questions (size cap 7/12, defer teacher role, default-silent notifications, forced-pen-name onboarding).

**Track C — Sangha implementation** (replaces the original 4-stage plan in SANGHA-DESIGN.md)
- C0 prep (no schema) → C1 profiles + projection sync (no UI) → C2 bonds + peer read → C3 bond UI + card grid → C4 social events → C5 cross-sangha abilities.

**Cookie banner status:** not required (TDDDG § 25 (2) Nr. 2) — document this position in the Datenschutzerklärung.

## Current Focus (what's next)
1. **Track A1 — self-host Tailwind + Supabase-JS-SDK.** Single highest legal-risk reduction; 1 hour.
2. **Fix `engine/diagnostic.js` reassurance lead sentence** — hardcoded "Thoughts do not stop" fires regardless of selected chips (Li May bug, see FEEDBACK.md 2026-04-19). 3-line fix + 6 new tests; engineering review in COMPLIANCE-LOG.md notes.
3. **Track A2 + A3 — Impressum + Datenschutzerklärung expansion** (in parallel; A2 is mostly content + address decision).
4. **Quote save / collection** + **tap-to-complete habit confirmation** (existing FEEDBACK.md "Next up").
5. **Track B prep** can start in parallel with A4–A10; specifically B3 (brahmavihāra verbs) and B6 (resolve open design questions) are pure design work.
6. **Encryption transparency copy** — finish the privacy-detail modal update (folds into A3).

## Backlog (not committed)
- Duplicate file: `src/loaders.js` and `src/data/loaders.js` are both present. One is a leftover — consolidate.
- Setup character-detail round-trip loses cursor focus on the name input (cosmetic, non-data-loss).
- German + Malay translations (current strings file is English only).
