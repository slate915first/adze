# Compliance + Sangha Sequencing Log

Single source of truth for the legal, design, and engineering action items that came out of the **2026-04-19 three-lens review** of the Sangha cross-user feature (game design + senior-engineer + DSGVO/lawyer audits).

This file is the **detailed log**. The shorter roadmap view lives in `docs/ROADMAP.md` under "Compliance + Sangha sequencing".

## Source reviews

- Game design: `claude` agent review of `docs/SANGHA-DESIGN.md` against SDT, wellness-app failure modes, brahmavihāra mechanics, anti-patterns.
- Senior-engineer audit: review of the proposed schema/RLS/client architecture against actual code in `src/systems/`, `src/engine/`, `src/config.js`.
- DSGVO/lawyer audit: § 5 DDG, Art. 6/7/9/13/15–22/28/30/32/33–34/35/44–49 DSGVO, § 25 TDDDG (TTDSG-Nachfolger), § 38 BDSG.

## Status legend

- `[ ]` open · `[~]` in progress · `[x]` done · `[/]` deferred (with reason) · `[!]` blocker

---

## Track A — must complete before EU beta opens to anyone outside Dirk's allowlist

These ten items unblock public-facing-EU operation. They do not touch Sangha. Estimated total: ~1 work-week.

- [ ] **A1 · Self-host Tailwind + Supabase-JS-SDK**
  Move CDN scripts (`cdn.tailwindcss.com`, `cdn.jsdelivr.net`) to `src/vendor/` and update `index.html`. Tighten CSP `script-src` / `style-src` to `'self'` in `src/_headers`.
  *Why:* Drittland-IP-Übermittlung ohne Rechtsgrundlage (Art. 44 DSGVO; LG München I 3 O 17493/20). Single largest current legal risk on the live URL.
  *Effort:* ~1 hour.

- [ ] **A2 · Add Impressum**
  New `src/modals/impressum.js` + footer link on every screen (welcome, settings, app shell). Content per § 5 DDG: full name, **ladungsfähige Anschrift** (Leipzig), e-mail.
  *Decision needed:* address strategy (home / c/o coworking / virtual office).
  *Why:* § 5 DDG, BGH Zwei-Klick-Regel.

- [x] **A3 · Expand Datenschutzerklärung to Art. 13 completeness** · v15.12.2
  Built as a separate `datenschutz` modal (companion to the friendly `privacy_detail`), reachable from welcome footer + Settings + a "Detailed legal notice" button at the bottom of the friendly modal. 12 numbered sections covering all of Art. 13 (1) + (2): controller, purposes + lawful bases, recipients (Supabase + Cloudflare + Resend), Art. 46 SCCs, retention windows, rights, complaint to Sächsischer Datenschutzbeauftragter, required-data clause, no-Art-22-automated-decision, TDDDG § 25 (2) Nr. 2 cookie position, source of data, effective-date + change procedure. Friendly `privacy_detail.para_tailwind` + `para_gdpr` updated to reflect self-hosting (A1) and link to the detailed notice. Currently English; German translation queued (see follow-ups). Scope: current Adze only — no Sangha-related processing declared (Tracks B/C parked).
  *Follow-ups not blocking other Track A items:*
  - German translation of `datenschutz.*` keys (file the translation under a future `de.json` or as inline `datenschutz.de.*` keys; tracked under "Translationen der Rechtsdokumente" in DSGVO audit C21).
  - Implement the 24-month-inactivity auto-delete cron mentioned in `datenschutz.para_retention` (currently honest-but-unimplemented; folds with A10 retention work).

- [ ] **A4 · Link Terms from app + age/Datenschutz checkbox**
  New `src/modals/terms.js` (loads `docs/TERMS.md` content). Add un-pre-checked "I am at least 16 years old and have read the Datenschutzerklärung and Terms" checkbox to magic-request flow in `src/render/welcome.js` / `src/modals/auth.js`.
  *Why:* Art. 8 DSGVO (Mindestalter 16 in DE), § 312i BGB.

- [ ] **A5 · DPA evidence archive**
  Create `docs/COMPLIANCE/DPA/` (gitignored). Activate / download DPAs for Supabase, Cloudflare, Resend. Add 1-page TIA (Transfer Impact Assessment) for the three US processors — short, since payload is E2E for Supabase, IPs only for Cloudflare/Resend.
  *Why:* Art. 28 (3) DSGVO; without DPA every transfer is rechtswidrig.

- [ ] **A6 · Incident-response procedure**
  New `docs/INCIDENT-RESPONSE.md` (intern). Cover: detection paths (Supabase/Cloudflare alerts, security@ inbox), 24h triage trigger, 72h supervisory-authority report timer, Sächsischer LfDI online form, betroffene-user notification template, Estate-Plan / Notfall-Zugang for Single-Maintainer-Risiko.
  *Why:* Art. 33–34 DSGVO.

- [ ] **A7 · VVT (Verzeichnis von Verarbeitungstätigkeiten)**
  New `docs/VVT.md` (intern). Use the table from the DSGVO audit §1 as starting point.
  *Why:* Art. 30 DSGVO. Freistellung greift nicht, sobald Art.-9-Verarbeitung (Sangha) regelmäßig wird.

- [ ] **A8 · DATA-SUBJECT-REQUESTS process**
  New `docs/DATA-SUBJECT-REQUESTS.md` (intern). Template responses for Auskunft/Berichtigung/Löschung/Übertragbarkeit. 30-day Frist (Art. 12 (3)) tracker.

- [ ] **A9 · Extend `delete-account` Edge Function**
  Currently deletes `auth.users` (cascades to `user_state`). Add: `DELETE FROM public.beta_allowlist WHERE email = ...`. Verify cascade actually fires on a test account; record evidence in compliance folder.
  *Why:* Art. 17 DSGVO Vollständigkeit.

- [ ] **A10 · Define + publish retention windows**
  Decide and document: sessions = until refresh-token expiry; e-mail + ciphertext = until account deletion or **24 months inactivity → auto-delete** (need cron); Cloudflare logs = CF default (30 d); Supabase auth-logs = SB default (90 d); feedback log in Dirk's inbox = 24 months.
  Publish in Datenschutzerklärung (A3 dependency).
  *Why:* Art. 5 (1) e (Speicherbegrenzung).

---

## Track B — must complete before Sangha implementation begins · ⚠ PARKED 2026-04-19

**Status: deferred indefinitely.** The Sangha cross-user feature introduces Art. 9 sensitive-data processing (mental-health-adjacent), social-graph processing of vulnerable users, and likely triggers an Art. 35 DPIA + a § 38 BDSG DSB-pflicht reassessment. That's a substantial legal overhead for a feature with no validated tester demand yet.

**Re-evaluation criteria** — only reopen Track B + C when ALL of:
1. Track A is complete (EU beta has its full legal floor).
2. Multiple beta testers (≥3) have explicitly asked for cross-user features.
3. The product owner (Dirk) has decided that the social layer is worth the compliance overhead.

**The design work is preserved.** `docs/SANGHA-DESIGN.md` and the three-lens reviews (game design + engineering audit + DSGVO audit summarised below) remain valuable intellectual capital. Don't delete; do not implement.

**Implication for current legal work**: the Datenschutzerklärung (A3), VVT (A7), and DPIA decision should describe **only what Adze processes today** (single-practitioner, E2E-encrypted, no cross-user sharing). Do NOT pre-declare Sangha processing — over-disclosure of unimplemented processing is its own risk.

These six items prepare the legal + design + technical ground for Sangha. They depend on Track A finishing; they don't depend on each other.

- [ ] **B1 · ADR-7 — projection contract**
  Add to `docs/DECISIONS.md`: *"Server-side unencrypted user data is always a write-through projection of the encrypted state, never a source of truth read by the owning client for own-rendering."* This rule constrains every Sangha schema decision.

- [ ] **B2 · DPIA (Datenschutz-Folgenabschätzung)**
  New `docs/DPIA-sangha.md`. 4–8 pages, structure per Art. 35 (7) a–d. Specifically address: `dominant_hindrance` as Art. 9 sensitive data (mental-health adjacent — EuGH C-184/20 line); social graph + vulnerable users → DSK-Blacklist trigger; risk mitigations; consent architecture.
  *Why:* Art. 35 DSGVO Pflicht (sehr wahrscheinlich), shapes design before code.

- [ ] **B3 · Design the missing brahmavihāra verbs**
  Update `docs/SANGHA-DESIGN.md` — currently only **metta** has a verb. Add design for:
  - **karuṇā** (compassion) — "sit with" verb; appears when bonded user signals struggle.
  - **muditā** (sympathetic joy) — "rejoice" verb; appears on bonded user's rank advance / quest completion.
  - **upekkhā** (equanimity) — "release" verb; user-invoked card-hide for a set period without ending the bond.
  *Why:* dhamma consistency + mechanism for the design's strongest claim (the brahmavihāras as the social mechanic).

- [ ] **B4 · Design dormancy, dissolution, abuse-handling**
  Update `docs/SANGHA-DESIGN.md`:
  - **Dormancy**: card visually shifts to "resting" state after N weeks; no last-active timestamp on rest.
  - **Graceful end-bond** distinct from block; 7-day grace re-bond window; annual sangha-review prompt.
  - **Abuse**: report flow with server-side audit log; global rate-limits per sender (not just nudge); blocked-party sees ended-bond, not block-distinguishing signal.
  *Why:* the design has block but no off-ramp, no report path, no moderation.

- [ ] **B5 · Resolve `dominant_hindrance` UX**
  Three-lens convergent recommendation: keep field but add:
  - Toggle option "share that I'm working with a hindrance" without naming which (coarsening for privacy).
  - Secondary confirmation modal when toggling on, with Art. 9 language.
  - Default state: **off** even when user toggles "share everything else".
  *Why:* highest-risk single field, all three reviews flagged independently.

- [ ] **B6 · Resolve open design questions (4 from SANGHA-DESIGN.md §239–243)**
  Combined three-lens answers:
  - **Display name default**: user types or accepts a Pāli-suggestion at onboarding (forced, not auto-applied). No real-name default.
  - **Sangha size**: soft nudge at 7, hard cap at 12.
  - **Teacher/maintainer role**: defer entirely from v1. Don't build speculative governance.
  - **Notifications**: default silent everywhere; in-app dot only, no numeric badge; no push for received metta.
  Update `docs/SANGHA-DESIGN.md` to reflect resolutions.

---

## Track C — Sangha implementation (5 stages, gated on Track A + B) · ⚠ PARKED 2026-04-19

**Status: deferred indefinitely.** See Track B parking note. Engineering plan preserved below for the day it becomes unparked.

Replaces the original 4-stage plan in `docs/SANGHA-DESIGN.md` §205–217. Adds Stage 0 prep (engineering audit insight). Splits original Stage 1 into separate schema + UI deploys. Each stage = one deploy + green live-RLS suite.

- [ ] **C0 · Prep (no schema)** · 3 turns
  Feature flag `ADZE_SANGHA_ENABLED = false` in `src/config.js`. Pure `projectProfile()` function in new `src/systems/sangha-projection.js` + matching `tests/unit/sangha-projection.test.js`. Wire dormant call after `passphrasePushState` (gated on flag).

- [ ] **C1 · `sangha_profiles` table + projection sync (no UI)** · 4 turns
  Migration: table + self-only RLS. Real `sanghaProjectionSync()` implementation. Settings "Privacy & sharing" card with per-field toggles (shared_fields lives in encrypted state, not server). Live-RLS test suite scaffold + opt-in CI job (`npm run test:rls`).

- [ ] **C2 · Bonds + peer read** · 4 turns
  Migration: `sangha_bonds` + RLS policies + `request_bond` / `accept_bond` security-definer RPCs. `get_peer_profile` / `list_peer_profiles` security-definer functions (NOT a view — engineering insisted; views can't carry their own RLS cleanly). Client `systems/sangha-bonds.js`. Dev-only "add bond by UUID" button in Settings. Live-RLS suite extended with the 7 bypass-attempt scenarios.

- [ ] **C3 · Bond request + accept flow + card grid (UI)** · ~5 turns
  Email-based invite via Edge Function (server-only; constant-time response to defeat enumeration). `render/sangha-social.js` card grid above existing household view. First-bond ritual moment.

- [ ] **C4 · Social events: metta, nudge, quote** · ~5 turns
  `sangha_events` table + nudge rate-limit trigger (with `SELECT FOR UPDATE` to handle contention) + keyset-paginated read RPC + 90-day TTL via `pg_cron`. Recipient `nudges_enabled` opt-out (default off). `read_at` tracked for inbox UI but **never exposed to senders** (game-design rule). 24h IndexedDB peer-cache + offline event-queue.

- [ ] **C5 · Champion abilities across bonds** · ~6 turns
  Extend `ABILITY_HOOKS` in `src/config.js` to accept `target_user_id`. Validate bond exists + tighter cross-user cooldowns (1/week not 1/day). Effects emit `sangha_events` of kind `ability_assist` AND a signed-by-server delta the recipient client drains on next decrypt — no server-side mutation of recipient ciphertext.

---

## Cross-cutting design principles (binding for all Sangha work)

These are anti-patterns the three reviews independently identified. Pre-commit against them; no individual PR can violate them without revisiting this doc.

1. **No metric creep**: no "sangha health score", no weekly aggregate, no leaderboards in any form.
2. **No notification re-engagement loops**: no "your sangha misses you" pushes when DAU dips.
3. **No real-time presence indicators** (green dots, "currently sitting").
4. **No onboarding pressure to bond**: solo practice stays first-class forever; no feature gated on having a bond.
5. **No reading receipts**: senders never learn whether a metta was seen.
6. **No badge counts** anywhere (not on tab, not on app icon).
7. **No bond-request follow-up prompts**: silence is an answer.
8. **Cross-user abilities are additive only**: solo play must remain fully viable without sangha composition. No "raid comp" obligation.
9. **Server-side data is a projection, never source of truth** (ADR-7).
10. **Feature flag is not a security control**: RLS is. Untested RLS isn't safe just because UI doesn't call it yet.

---

## TTDSG / cookie status (resolved 2026-04-19)

**No cookie banner needed.** Adze writes nothing pre-login that isn't strictly necessary under § 25 (2) Nr. 2 TDDDG (formerly TTDSG, renamed May 2024; ePrivacy Regulation still not enacted in 2026). Document this as a deliberate compliance position in the Datenschutzerklärung (A3).

When Sangha ships, the per-field sharing consent dialogs are **Art. 7 DSGVO consents**, not TTDSG cookie banners — different legal basis, different UI surface (modal at Sangha onboarding, not a site-wide banner).

---

## Decision log

| Date       | Decision                                                                                                       | Source             |
| ---------- | -------------------------------------------------------------------------------------------------------------- | ------------------ |
| 2026-04-19 | Adopt 5-stage Sangha rollout (replaces original 4-stage plan)                                                  | Engineering audit  |
| 2026-04-19 | Use security-definer RPCs (not a view) for peer profile reads                                                  | Engineering audit  |
| 2026-04-19 | Defer teacher/maintainer role indefinitely                                                                     | All three reviews  |
| 2026-04-19 | `dominant_hindrance` is Art. 9 sensitive — separate explicit consent UX                                        | Lawyer + game-des. |
| 2026-04-19 | Sangha size: soft nudge at 7, hard cap at 12                                                                   | Game design        |
| 2026-04-19 | Notifications default silent; no push for metta                                                                | Game-des. + lawyer |
| 2026-04-19 | No cookie banner; document TDDDG-§25(2)Nr.2 position in Datenschutzerklärung                                   | Lawyer             |
| 2026-04-19 | Impressum required NOW for closed beta (publicly served URL)                                                   | Lawyer             |
| 2026-04-19 | **Sangha (Tracks B + C) parked indefinitely.** Re-evaluate when Track A complete + ≥3 testers ask + product owner decides the legal overhead is worth it. Design docs preserved as IC, not implemented. | Product (Dirk)     |
