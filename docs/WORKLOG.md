# Worklog

Reverse-chronological session-by-session notes. Entry per working session, not per message. Capture: what was done, decisions made (link to `DECISIONS.md`), what's next, any blockers.

---

## 2026-04-18 · Stage 2 rework + Stage 3 deploy

### Done
- Reworked Stage 2 around a **separate E2E passphrase** (ADR-1): `systems/auth.js` is now pure Supabase session management; new `systems/passphrase.js` owns the encryption key lifecycle; `systems/state.js` gates sync on `syncIsActive()`.
- Modal rewrite (`modals/auth.js`): six steps — menu, signup, signin, passphrase-setup, passphrase-unlock, passphrase-reset-confirm, passphrase-success. Loud warning copy on setup; reset-my-data path for lost passphrase.
- Welcome page redesigned (`render/welcome.js`) — one screenful, clear primary CTA, secondary "I already have an account — sign in" link.
- Settings "Account & sync" card updated for three states (local / authed+unlocked / authed+locked).
- Boot-time auto-prompt: authed-but-locked session → unlock modal fires automatically before setup.
- `authAfterAuthSuccess` routes signed-in users to setup OR main app based on `state.setupComplete`.
- Checkbox fix: `styles.css` `input{width:100%}` rule now excludes `[type=checkbox]` and `[type=radio]`.
- Passphrase-setup checkbox: toggling it no longer triggers a full modal re-render (used to wipe the passphrase fields + pop Safari's save-password dialog).
- Habit-mode card: in-place DOM patch on selection instead of full re-render (no focus flicker).
- Supabase `user_state` table + RLS policies created via MCP.
- GitHub repo live (ADR-6): https://github.com/slate915first/adze.
- Cloudflare deploy live (ADR-5): https://adze.cloudflare-adze-gotten828.workers.dev via `wrangler.toml`.

### Decisions
- ADR-3: no cloud LLM for user text in Stages 2–3.
- ADR-4: chip-based local interpretation for optional setup questions.
- ADR-5: Cloudflare Workers (not Pages).
- ADR-6: public GitHub repo with noreply commit email.

### Blockers / follow-ups
- Encryption-transparency copy in `modals/privacy-detail.js` started but not finished.
- Feedback FAB button feels less visible / interaction broken per Dirk's test — needs investigation.
- Version constant + CHANGELOG not yet in place; onboarding still references `v14.2` while code is at v15.x (unversioned formally).
- Duplicate file `src/loaders.js` vs `src/data/loaders.js` — one is dead.

### Next session
1. Fix feedback FAB regression.
2. Add `APP_VERSION` constant + `CHANGELOG.md`; reference it in welcome/settings/feedback copy.
3. Finish encryption-transparency privacy-detail copy.
4. Design the chip taxonomy for Phase 2 optional questions with Dirk (collaborative) before coding.
5. Redesign Phase 3 slider screens as one-question-per-step.
6. Apply in-place DOM patch pattern to assessment steps for flicker cleanup.

---

## 2026-04-18 (evening) · Polish pass + chip system

### Done
- **Feedback FAB regression fixed** — unclosed `.tooltip-text` block in `styles.css` was swallowing every rule below it, including `body.feedback-mode` visual cues and `.feedback-fab` gradient/position. One-character fix (added `}`).
- **Version 15.0 + CHANGELOG.md** — `APP_VERSION` bumped to `15.0`, Keep-a-Changelog-style file at repo root. Deleted duplicate `src/loaders.js` (byte-identical to `src/data/loaders.js`).
- **Welcome email template** — new `email-templates/` folder with `confirm-signup.html` (parchment/gold, bulletproof tables, single CTA, mindful copy), plain-text fallback, and `README.md` with install steps + design principles.
- **Encryption transparency copy** — `privacy_detail.para_sync_optional` rewritten to reflect ADR-1 (two-secret design). New `para_sync_technical` (algorithm specifics: PBKDF2-SHA256@600k, AES-GCM-256, non-extractable, Web Crypto) and `para_sync_references` (links to source, MDN, NIST, RFC 2898, OWASP). "How encryption works →" link added to Settings → Account & sync.
- **Chip taxonomy implemented** (ADR-4) — three Phase-B textareas replaced with chip grids. New `systems/chip-interpretation.js` is the single source of truth for mappings. Optional free-text "Other" preserved but not interpreted. In-place DOM toggle for chips. `docs/CHIP-INTERPRETATION.md` written as a non-programmer-readable rationale document.
- **Phase 3 (Phase C) diagnostic redesigned** — one-question-per-step with progress dots, `Skip this one` secondary button. `view.setupData.phaseCStep` drives the sub-step cursor. User's concern: "the tool for mindfulness should itself be mindful at every touchpoint."
- **Assessment flicker polish** — Phase A experience + dominant-hindrance radios, Phase A hopes multi-select, Phase B knowledge-check multi-select now all patch the clicked button in place instead of full re-render. New `patchRadioButtonsInPlace` helper.

### Waiting on user
- Task #7 — paste `email-templates/confirm-signup.html` into Supabase → Authentication → Email Templates → Confirm signup. Or skip if moving to Resend as discussed.

### Next session candidates
1. Wire chip flags into recommendation-engine outputs (currently flags are stored but no content references them yet).
2. Supabase → Resend migration for transactional email.
3. Re-enable Supabase email confirmation before public release.
4. Custom domain for Cloudflare deploy.
5. Apple/Google OAuth (Stage 4 territory).
6. Obsidian vault scaffold for sutta tracking + project journal.
