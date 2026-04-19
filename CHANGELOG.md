# Changelog

All notable changes to Adze. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versions are `MAJOR.MINOR` tracking the practitioner-facing feature set rather than strict semver.

Update this file whenever `APP_VERSION` in `src/data/loaders.js` changes.

## [15.17.3] — 2026-04-19 · P1 game cluster — Mahāpajāpatī inversion + evening double-surface

### Fixed
Two P1 findings from the post-v15.15.9 game-designer lens.

**Mahāpajāpatī `teamScoreMultiplier` removed.** The passive at `src/config.js:130` previously computed `(ctx) => ctx.teamShadow > 60 ? 1.2 : 1.0` — a 1.2× score boost applied when the household's Shadow was high. Game-designer flagged this as a design inversion: the more the household was suffering, the more today's practice earned, which turns struggle into a resource to farm. It also contradicted Mahāpajāpatī's character — she is the bhikkhunī who held the sangha *through* hardship, not one who profits from it. Removed the passive entirely. The `src/systems/sangha.js` narration line ("is lifting the team — every score ×1.2 while the Shadow is high.") also removed to match. A `shadowDecayRateBonus` replacement — which would slow Shadow accumulation when team-Shadow is high, i.e. mitigate hardship rather than reward it — fits the character better and may land in a future commit.

**Evening-sit primary-alert threshold raised 17:00 → 20:00.** `src/systems/path.js:126` produced the `evening_sit` Next-Step hero when `hour >= 17`. `src/render/today.js:134` independently fires the same evening-reflection prompt in the primary-alert band when `!dailyDone && nowHour >= 17`. After 17:00, with morning-sit done and reflection undone, the practitioner saw the evening-close surface in two slots simultaneously — mild notification-pressure doubling. Raised the Next-Step hero threshold to 20:00 so during the 17:00–20:00 window the today.js tile handles the prompt alone; the hero only takes over late in the evening when the window is closing. Complementary Priority 4 branch ("quiet inactive state") updated to `hour < 20` to match.

### Scope
No migration. No new i18n. No new user-facing surfaces. Pure mechanic tuning.

Tests: 40/40 vitest green.

## [15.17.2] — 2026-04-19 · P1 teaching cluster — citation fidelity

### Fixed
Three P1 findings from the post-v15.15.9 dhamma-reviewer lens. Every user-facing surface that cited a canonical source has been re-checked against Bodhi's translations and the commentary tradition.

**Bodhisatta-vow attribution: MN 26 → MN 36.** The "let only skin and sinew and bone remain" vow is traditionally associated with the Bodhi-tree awakening narrative, but the canonical source within the Pāli canon is MN 36 (Mahāsaccaka Sutta), NOT MN 26 (Ariyapariyesana — which is the going-forth + post-awakening sutta). A Theravāda teacher would catch the mis-citation immediately. Changed:
- `setup.vow.bodhisatta_attribution` in `en.json:244` (setup vow-taking screen)
- `wisdom-scrolls.json` scroll w9 "The Vow" source
- `quests/stages.json` stage 4 "Beneath the Bodhi Tree" suttaRef (now "MN 36, Sn 3.2")
- Note appended to `sutta-questions/mn26.json` q6 clarifying that the app's vow text draws from MN 36, while MN 26 is cited elsewhere for the Buddha's first post-awakening words (still correct at `victory.buddha_attribution` and `wisdom-scrolls.json` scrolls w1, w6).

**SN 22.45 acala claim softened.** The tisikkhā-explainer tagline previously read "SN 22.45: the wisdom faculty is acala — unshakeable." SN 22.45 (Aniccatā Sutta) in Bodhi's SN is about contemplating impermanence in the five aggregates; it does not literally use the word acala applied to the wisdom faculty. The attribution was plausible-sounding but unverified against canonical source. Rephrased to "The tradition holds that the wisdom that has seen clearly is acala — unshakeable." — the claim stands (it IS what the tradition says) without anchoring to a specific sutta that does not in fact support it. Also updated `sn22_45.md` summary to drop the acala line and reframe around impermanence, which is what the sutta actually teaches. Code comment in `rank-gate.js:81` also updated.

**Rank-ladder tooltip scaffolding framing.** `main.js:665` previously stated "The end goal — Arahant — is Rank 9." Post v15.15.6 the ceremonial rank-announcement surfaces use scaffolding language throughout (game rank ≠ canonical attainment), but this tooltip was still declarative in the old register. Routed through a new `rank_ladder.tooltip_footer` i18n key and rewritten: "The game ladder ends at Rank 9, which the game labels with the canonical term for the fully-liberated mind; whether any practitioner has in fact reached that territory is only ever theirs and their teacher's to verify." Matches the path-ranks.json `note` pattern.

### Teacher-review ready
The three most-cited findings on the dhamma-reviewer's list are closed. A qualified Theravāda teacher can now read the app's user-facing teaching surfaces without catching a misattribution on the Bodhi-tree vow or a spurious canonical anchor on acala. Remaining dhamma-reviewer items (AN 8.1 metta closed in v15.16.1, Dalai Lama / Thich Nhat Hanh cross-tradition quote labels, Pali → Pāli normalization passes) are P2 and not in this release.

Tests: 40/40 vitest green.

## [15.17.1] — 2026-04-19 · P1 engineering cluster remainder

### Fixed
Closes the three P1 engineering items deferred from v15.16.2.

**`authVerifyMagicCode` retry-loop short-circuit** (`src/systems/auth.js`). The four-type fallback (`['email', 'magiclink', 'recovery', 'signup']`) existed because Supabase's "token invalid" error returns for a VALID token with the wrong `type`, not just for real expiry. But on a network error or Supabase 5xx, looping all four types burned the user's time + the Supabase OTP rate-limit quota for no benefit. Now: only keep looping when the error message mentions "token" / "expired" / "invalid" (the only class the type-loop can actually resolve); any other error class short-circuits immediately with the real cause surfaced.

**`loadState` synced-mode retry-with-backoff** (`src/systems/state.js`). A transient Supabase 503, mobile-data hiccup, or TLS renegotiation previously bubbled straight to bootstrap's error UI with no retry affordance — testers on flaky connections hit a hard error screen where a second attempt 1.5s later would have succeeded. Added a single retry with 1.5s backoff, scoped to error classes that are plausibly transient (fetch/network/5xx/timeout); any other error still throws immediately. Worst-case added latency on real failure is 1.5s before the error UI surfaces.

**Live-smoke button matcher** (`tests/e2e/_live-diag.spec.js`). The smoke test asserted on a `/begin/i` button that doesn't render in closed beta (renderWelcome shows "✉️ Sign in with email" when `ADZE_PUBLIC_SIGNUP_ENABLED` is false, "Begin" when it's true). Smoke test was effectively dead on every manual post-deploy run. Matcher is now `/begin|sign in with email/i` and the modal-presence selector accepts `.modal-bg` or `.fade-in` so both paths pass. What the test still proves is what matters — inline `onclick` handlers are firing, i.e., no CSP regression of the v15.3–v15.10 class.

### Scope
All three are pure follow-ups to v15.16.2; no new schema, no new RLS, no i18n. Tests: 40/40 vitest green.

## [15.17.0] — 2026-04-19 · Reflection history — in-app readback of past entries

### Added
Requested by a real beta tester: the ability to read back past daily / weekly / monthly / one-line reflections inside the app, instead of having to export the JSON file.

**`src/modals/reflection-history.js` (new)** — a two-phase modal:
- *list phase:* reverse-chronological list of every reflection the practitioner has written, each row showing the kind (Daily / One line / Weekly · W{n} / Monthly · M{n}), a human-readable date, and an ~80-char preview.
- *detail phase:* read-only full text of one entry. Back button returns to list without tearing down the modal.

**`src/systems/reflection.js`** — `getAllPastReflections(memberId)` walks `state.reflectionLog`, normalises the four entry shapes (`.daily`, `.oneline`, `.weekly`, `.monthly`), defends against `[object Object]` leakage from the heterogeneous `.answers` / `.writings` shapes, de-duplicates the one-line-vs-daily overlap introduced when the merged evening-close flow writes both fields with the same text, and returns a sorted array. `openReflectionHistory`, `openReflectionHistoryDetail`, `backToReflectionHistoryList` are the phase-routing helpers.

**`src/render/reflection.js`** — a new "Your reflections" tile (📖 · Readback / Your reflections / "Revisit what you noticed on past days — to ask whether it still applies.") surfaces on the Reflection tab above the existing counts tile. Guard: only renders when at least one past entry exists, so new practitioners don't see an empty button.

### Teaching framing (dhamma-reviewer condition)
Every phase of the modal carries one line of framing at the top: *"Past observations are reminders, not records. What matters is what you notice now."* Echoes the existing liberation-disclaimer register. Pre-frames the act as vicāra (investigation) — Bojjhaṅga #2, Dhammavicaya — rather than as progress-audit. The raft metaphor (MN 22 Alagaddūpama) informs the stance without being quoted at the user.

### Game-designer anti-pattern vetoes honored
- No completion percentage, streak count, or "X of Y days reflected" indicator.
- No per-hindrance frequency tally, sortable tags, or trend graph.
- The word "track" does not appear in any of the readback UI.
- Access is behind one deliberate tap on a named tile, not a persistent counter anywhere else in the app.

### UX scope (ux-reviewer)
- Reverse-chronological list, not a calendar grid. A calendar grid would add month-navigation headers, day-cell sizing fights, and type-disambiguation dots before the user reaches the text they want — hostile for a low-energy practice app.
- Text-only in the first pass. Trend visualisation already lives in `openWeeklySummary` (the 📊 tile); kept separate so this readback stays practice-oriented.
- iOS Safari: scroll containers use `max-h-[65vh]` / `max-h-[60vh]` with `-webkit-overflow-scrolling: touch` + `overscroll-behavior: contain` to prevent pull-to-refresh on the outer page and to avoid the 100vh-under-address-bar trap.
- Modal-over-modal risk sidestepped by using two phases of a single modal rather than two stacked modals; the close-button + back-button semantics are independent by design.

### i18n
All user-facing strings routed through `t()`. New keys under `reflection.history_tile.*` and `reflection_history.*` in `src/content/strings/en.json`.

### Manual verification
40/40 vitest green. **Browser smoke-test still pending** (this is a static site with no build step; standard workflow is to load `src/index.html` directly or via any static server and exercise the flow). The scroll-container + Intl.DateTimeFormat + heterogeneous-shape normalisation are the three areas most likely to surface an edge case in practice — worth a 2-minute manual pass before broader tester visibility.

## [15.16.2] — 2026-04-19 · P1 engineering — server-authoritative updated_at + allowlist search_path

### Fixed
Two P1 findings from the post-v15.15.9 fleet triage, both landing in migration `20260419220000_harden_updated_at_and_allowlist_search_path`.

**`user_state.updated_at` is now server-authoritative.** The previous upsert carried a client-supplied `new Date().toISOString()`. Mobile clocks can skew tens of seconds to minutes after sleep/wake, and the cross-device optimistic-concurrency guard on the roadmap will rely on `updated_at` being monotonic. Added `set_user_state_updated_at()` as a BEFORE UPDATE trigger that forces `new.updated_at := now()` on every update regardless of what the client sends. Insert-time default (`default now()`) was already in place. Client code (`src/systems/passphrase.js:passphrasePushState`) no longer sends `updated_at` in the upsert payload. The BroadcastChannel message still carries a local ISO timestamp for diagnostic purposes — it's not consulted for ordering.

**`enforce_beta_allowlist` tightened to project convention.** Was `set search_path = public`; now `set search_path = ''` with the fully-qualified `public.beta_allowlist` reference (which was already there in the query body). Removes the theoretical attack where a malicious object injected into `public` could run under the definer's elevated privileges. Low-impact today (no public-schema write access outside the operator), but aligns with the newer `cleanup_inactive_users` pattern and the project security rule.

### Not in this commit (P1 engineering cluster remainder)
- `authVerifyMagicCode` 4-type retry short-circuit on non-token-type errors.
- `loadState` retry-with-backoff on transient synced-mode network errors.
- `_live-diag.spec.js:31` Begin-button assertion in closed beta.

Deferred as a small follow-up to keep this release scoped to the migration-dependent pair.

## [15.16.1] — 2026-04-19 · P0 cluster — metta citation + hindrance-regex removal + evening-reflection i18n

### Fixed
Three P0 findings from the post-v15.15.9 fleet re-triage.

**Metta tutorial citation (dhamma-reviewer).** `src/content/tutorials/metta.json:35` said "The Buddha said in AN 8.1 that mettā has eleven benefits…" AN 8.1 is the Mettā Sutta in Aṅguttara 8s but it covers the eight grounds for giving, not the eleven benefits. Line 10 of the same file already correctly cites AN 11.16 (Mettānisaṃsa Sutta). The two lines contradicted; a tester looking up the citation would find an empty reference. Fixed line 35 to match line 10's attribution.

**Hindrance-keyword regex bonus removed (game-designer).** The scoring paths in `src/systems/evening-close.js` (two sites) and `src/systems/reflection.js` regex-scanned free-text reflections for Pāli hindrance keywords and awarded extra paññā for each match. Anti-pattern: once a tester guesses that typing "kamacchanda" earns more than "I was restless", the reflection field stops being a reflection and becomes a keyword-stuffing box. Metric-creep replacing intrinsic insight. Removed the three regex call sites + the now-unused `_countHindranceMentions` helper. `TISIKKHA_EARN.hindrance_named` stays defined in `config.js:319` for a future structured-chip flow where the user explicitly names a hindrance via UI rather than by incidental text. The parallel use in `src/systems/hindrances.js:journalEvidenceCount` is retained: that path feeds multi-factor gate evaluation, not a direct reward, so it's not gameable the same way.

**Evening-reflection legacy modal i18n (copy-storyteller).** `src/modals/evening-reflection.js:46` had the one remaining inline-English string — `"Want to write a response? →"` — despite `evening_reflection.want_response` already existing in `en.json:785`. Routed through `t()`. The active 18:00 auto-fire flow (merged into evening-close since v15.15.2) was already `t()`-routed throughout.

### Not in this commit
The larger copy-storyteller list (i18n leaks on teaching-detail, rules-card, rank-intro, setback-recovery, liberation-offer, defeat, struggle-suggestion) lands in the P1 copy cluster.

## [15.16.0] — 2026-04-19 · Security twins — pin CSP connect-src + close allowlist enumeration oracle

### Fixed
Two P0 findings from the post-v15.15.9 re-review (security-reviewer agent, 2026-04-19).

**CSP `connect-src` pinned.** `src/_headers:38` previously allowed `https://*.supabase.co`. A future XSS could therefore connect to any Supabase project — including an attacker-owned one — and exfiltrate decrypted state. Pinned to the specific project URL (`zpawwkvdgocsrwwalhxu.supabase.co`, both `https://` and `wss://`). Auth, REST, and Edge Functions all live under this one hostname in modern Supabase, so no functional change.

**Allowlist enumeration oracle closed.** `src/systems/auth.js:164-168` previously surfaced the verbatim trigger error message — including the distinct "not on the invite list" rejection (P0001) — to the client. A probing attacker could therefore harvest the beta-tester email list by feeding candidates to the magic-link form and reading the error. `authRequestMagicCode` now treats allowlist rejection as silent success (same UX as the allowed path: modal advances to verify step, code is "on its way") and returns a single generic "try again in a moment" message for every other error class. Both the existence of the email on the allowlist and the nature of any failure are no longer distinguishable from the client.

### Trade-off
An invited tester who typos their email address now gets no clear rejection — they'll advance to the verify step and just not receive a code. In closed beta with ~6 testers, the support-load cost of this is acceptable compared to the enumeration risk. Post-public-launch the mitigation becomes essential rather than optional.

### Scope
No changes to encryption, RLS, Edge Function privileges, or data handling. Purely a CSP-wildcard tightening + error-message-generalisation.

## [15.15.9] — 2026-04-19 · HOTFIX — authed-but-locked guard + cross-tab concurrency warning

### Fixed
Closes Fleet Review Blocker #3 (sync-lifecycle trio, items 2 and 3 of 3). Item 1 landed in v15.15.7.

**Authed-but-locked guard** (`src/systems/state.js`, `saveState()`). When the user is signed in but hasn't entered the passphrase yet, `syncIsActive()` is already false so the remote push path is skipped — but the `localStorage.setItem` line above it still ran. Then `authDoPassphraseUnlock` pulled the (authoritative) remote row and overwrote `state`, silently losing any mutation made during the locked window. New behaviour: `saveState()` returns early when `authGetMode() === 'authed' && !passphraseIsUnlocked()`. The unlock modal already gates the UI in the normal flow; the guard makes the "state is not ours to mutate while locked" invariant explicit for race/crash windows.

**Cross-tab concurrency warning** (`src/systems/passphrase.js` + `src/systems/state.js`). Two tabs both authed + unlocked on the same browser would race on the debounced push: each has its own in-memory `state`, each pushes, the later upsert blindly overwrites the earlier. Minimum viable per review: `BroadcastChannel('adze')`. Each successful `passphrasePushState` broadcasts `{type:'pushed', tabId, at}`. Sibling tabs flip `_crossTabStaleWarning` on receipt; their own subsequent `saveState()` calls refuse to write (neither localStorage nor push) until the user reloads. A stale-warning banner renders next to the existing sync-error banner in Settings → Account & sync.

### Added
- **`getCrossTabStaleWarning()`** (global, mirrors `getLastSyncError()`).
- **`syncGetTabId()`** (passphrase.js) — stable per-tab UUID so BroadcastChannel listeners can filter their own echo.

### Scope
- Sibling-tab detector only. Cross-device races (two phones) are not covered; those need the server-side `updated_at` guard + reconcile-on-conflict, which remains on the ADR-7 Important-list but is no longer Blocker-gated.
- Tests: 40/40 vitest, Playwright unchanged (no new behaviour surface that the existing specs exercise).

## [15.15.8] — 2026-04-19 · Cleanup — drop `habit_quest_*` LEGACY_KEYS (test-data era)

### Changed
- **`src/data/loaders.js`** — `LEGACY_KEYS = ['habit_quest_v4', 'habit_quest_v3_5', 'habit_quest_v3_3']` → `[]`. Comment updated to explain the infrastructure is preserved for future renames.
- **Why safe**: Dirk confirmed 2026-04-19 that no live user data ever existed under `habit_quest_*` keys. Pre-rename era was solo-tester (Dirk on his own browser) working with throwaway data while building Adze. The public URL + closed-beta allowlist + first real testers all arrived *after* the v15.15.1 storage-key rename.

### Not removed
- The `for (const legacy of LEGACY_KEYS)` loop in `src/systems/state.js` stays — it's a no-op with `LEGACY_KEYS = []` and the infrastructure is cheap to keep for the next rename.
- The back-compat comment in `src/systems/export-import.js` (about accepting legacy "Habit Quest" JSON imports) stays — it's about file imports from disk, not localStorage, and the structural check makes it forward-compatible regardless.

No behaviour change for any user; purely a cleanup of dead legacy bridges.

## [15.15.7] — 2026-04-19 · HOTFIX — flush pending sync push on tab close / sign-out

### Fixed
Partial close of Fleet Review Blocker #3 (sync-lifecycle trio, item 1 of 3).

**The silent data-loss window**: `saveState()` debounces Supabase pushes by 2 seconds to coalesce taps into a single network call. If the user closed the tab / navigated away / signed out within that 2s window, the last edit was written to `localStorage` but **never** reached Supabase. On next sign-in from another device, that edit was gone. Silent contradiction of the "ciphertext row is authoritative" claim comments made.

Two callers cover the two realistic scenarios:

- **`pagehide` + `visibilitychange:hidden` listeners** (`src/systems/state.js`) fire a best-effort flush on tab close, app backgrounding, or navigation-away. The fetch is kicked without awaiting — modern browsers honor in-flight fetch on unload as a keepalive best-effort. iOS Safari needs both events: `pagehide` is unreliable on app-switch (as opposed to tab-close), so `visibilitychange:hidden` is the iOS workaround.
- **`authSignOut()`** now `await`s `saveStateFlush()` **before** calling `_supabase.auth.signOut()` and `passphraseLock()`. Without this, the JWT gets revoked + the encryption key gets locked before the push can complete → the push fails RLS and the edit is lost. Flush-first order is correct because both the key and the JWT are still live; the push completes cleanly; THEN we tear down.

### Added
- **`saveStateFlush()`** exposed as a global (like `saveState`). Cancels the pending `_pushStateTimer`, fires `passphrasePushState(state)` immediately, returns the promise. Callers on clean paths (`authSignOut`) can await; callers on dirty paths (`pagehide`) fire-and-forget.

### Not in this commit (still open from Blocker #3)
- **Authed-but-locked guard**: `saveState` still mutates localStorage when user is authed but passphrase hasn't been unlocked, and unlock then overwrites with the remote copy. Silent local-only data loss on the authed-but-locked → unlock path. Next commit.
- **Optimistic concurrency**: `passphrasePushState` is still last-writer-wins between two tabs / devices. Needs `updated_at` guard + `BroadcastChannel('adze')` cross-tab warning. Next commit.

Tests: 40/40 vitest, 19/19 Playwright. Manual verification on iOS Safari recommended — Playwright's browser-event simulation isn't reliable for the `pagehide` path.

## [15.15.6] — 2026-04-19 · HOTFIX — rank-announcement strings no longer conflate scaffolding with canonical attainment

### Fixed
The four `rank_announcement.floor_teaching_5_6` through `_8_9` strings in `src/content/strings/en.json` were rewritten. Previously they declared canonical attainment outright ("Stream-entry. The first three fetters — self-identity view, doubt, clinging to rituals — have weakened so much..."; "The arahant has destroyed the cause of his power...") — the exact failure mode the rank architecture was engineered to prevent. `path-ranks.json` `note` fields and `rank_intro.body_3` have always handled this correctly; these four strings were the one surface that broke the pattern.

New pattern, for all four:
1. **Game-rank-first framing**: "Rank 6 reached in the game..."
2. **Canonical parallel as reference, not claim**: "The canonical teaching near this territory is sotāpatti-phala..."
3. **Explicit disclaimer clause**: "...is yours and your teacher's to verify."

Mechanic explanation (floor drops from X to Y) preserved. Narrative momentum preserved. Attainment-claim removed.

Also in the same commit:
- **`src/modals/rank-announcement.js`**: 2 of 9 floor-teaching branches were inline English (`1_2` and `8_9`) despite their `en.json` keys existing. Routed through `t()` uniformly across all 9 branches. The `8_9` inline string was the single worst attainment-conflation surface in the app.
- **Labels** (`Shadow floor rises / at peak / falls`) were inline string construction in `rank-announcement.js:47-49` despite `rank_announcement.floor_rises_label` / `_peak_label` / `_falls_label` keys existing with `{before}` + `{after}` placeholders. Routed through `t()`.

### Why
- Flagged by `dhamma-reviewer` (2026-04-19 fleet review) as the single Blocker in its lens — *"the exact failure mode the app's entire rank architecture was designed to prevent"*.
- Flagged by `copy-storyteller` as three of the inline-English-bypassing-i18n leaks on the most ceremonially weighty screens.
- The fix pattern comes from `path-ranks.json` rank-6-through-9 `note` fields: *"This is a game rank describing the work being done, not a claim about attainment... Game rank. The canonical territory the tradition describes here involves specific fetters weakening — something only the practitioner's own lived experience, confirmed by a qualified teacher, can know."*

Closes Fleet Review Blocker #4. 40/40 vitest.

## [15.15.5] — 2026-04-19 · HOTFIX — `authSignOut()` now clears plaintext residue

### Fixed
- **`src/systems/auth.js` `authSignOut()`** previously locked the passphrase key + nulled the auth handles but did not wipe `localStorage[STORAGE_KEY]` or reset the in-memory `state`. On a shared browser, the next person who opened Adze would load the just-departed user's decrypted practice data via `loadState()`'s localStorage fallback (authed-but-locked path). Now mirrors the `authDeleteAccount` cleanup pattern already established — removes the localStorage entry, resets `state = newState()`, clears `view.modal` + `view.currentMember`.
- Data safety: authed-user data is safe in the Supabase ciphertext; sign-in + passphrase-unlock restores the full state on next session. Sign-out now genuinely means sign-out on-device.

### Why
- Flagged by both `security-reviewer` (Medium — shared-device leak) and `dsgvo-lawyer` (Art. 32 TOM gap) in the 2026-04-19 fleet review. Two lenses independently surfacing the same finding = highest-signal item in the report.

### Scope-note
- This is a one-way local wipe; no confirmation modal is added in this commit. If a user accidentally taps sign-out, their anonymous-mode-local data is gone (anonymous users don't sign out — this only matters for authed sessions where remote ciphertext is the source of truth anyway). A "Sign out will remove cached data from this device" copy note in the sign-out surface is a separate follow-up.

Closes Fleet Review Blocker #7. Tests: 40/40 vitest.

## [15.15.4] — 2026-04-19 · HOTFIX — 6 × unquoted `placeholder=t('...')` bugs + permanent CI guard

### Fixed
All six remaining instances of the template-literal HTML attribute parse bug (where `placeholder=t('key')` renders the literal string `t('key')` instead of the translation — same class as v15.11.5, v15.15.0, v15.15.2):
- `src/modals/element-feedback.js:48` (`element_feedback.report_placeholder`) + `:53` (`element_feedback.suggestion_placeholder`)
- `src/modals/feedback.js:118` (`feedback.summary_placeholder`) — this is the feedback form itself; literal `t('...')` was rendering where the tester types a report summary
- `src/modals/monthly-reflection.js:69` (`weekly_reflection.writing_placeholder`)
- `src/main.js:284` (`daily_reflection.textarea_placeholder`) + `:346` (`weekly_reflection.writing_placeholder`)

Fix pattern: `placeholder=t('key')` → `placeholder="${t('key')}"`. Template interpolation now runs before HTML attribute parsing.

### Added
- **`tests/unit/placeholder-bug-guard.test.js`** — permanent CI test that walks `src/` for `.js` files (excluding `src/vendor/`), strips comment lines, and fails if any line contains the pattern `placeholder=t(`. This bug class has shipped seven times total; the guard ends the cycle.

### Why this bug kept shipping
The pattern looks correct at a glance — `placeholder=t('key')` scans as "placeholder from translator". The browser's HTML-attribute parser reads it as a literal unquoted value ending at the first whitespace, so the rendered element carries `placeholder="t('key')"`. There's no JS error; the string renders silently as the placeholder text. Without a dedicated test, only a tester screenshot catches it.

Closes Fleet Review Blocker #2. Tests: 40/40 vitest (39 pre-existing + 1 new guard), welcome smoke green.

## [15.15.3] — 2026-04-19 · HOTFIX — tisikkhā explainer modal was silently broken

### Fixed
- **`src/modals/tisikkha-explainer.js:12`** shadowed the global `t()` i18n function with a local `const t = mid ? getTisikkha(mid) : {...}`. Every subsequent `t('tisikkha.heading')` call in the file then tried to invoke the tisikkha-state object as a function → `t is not a function` → the entire tisikkhā explainer modal rendered an exception in production. Local renamed to `tk`; 8 property accesses (`tk.sila`, `tk.samadhi`, `tk.panna`, `tk.pannaTotal`) updated; 18 i18n calls now resolve to the global function as intended. Flagged by the copy-storyteller fleet-review agent.

### Why this bug lived
Shadowing is a class of JS bug that doesn't crash at parse time — it only crashes at the first function-call site. With no unit test of this modal and no explicit usage path in the e2e tests, the broken render could persist indefinitely until a tester tried to open it.

Closes Fleet Review Blocker #5.

## [15.15.2] — 2026-04-19 · HOUSEKEEPING — auto-fire + sangha trigger now use the merged Evening reflection flow

### Changed
- **`maybeTriggerEveningReflection`** (`systems/rank-events.js:58-72`) — the 18:00 auto-fire that used to open `view.modal = { type: 'evening_reflection', ... }` now calls `openEveningClose()`, landing the user in the same merged flow as Today's Reflection tile. No more "two different evening modals depending on how you arrived".
- **`switchToNextMemberForEvening`** (`systems/sangha.js:261`) — the multi-member switch also now routes into the merged flow. Same code path as Today tile and auto-fire.
- **Diagnostic sliders + rotating daily question** that used to live only in the `evening_reflection` modal now render inline at the top of the merged `oneline` phase. Collected on both exit paths (`eveningCloseStopHere` and `eveningCloseFinish`) via a new private helper `_eveningCloseSaveDiagnosticsIfAny`. No data-collection loss — daily hindrance snapshots still feed the path-gate and trend charts.

### Fixed
- **`src/modals/evening-reflection.js`** — unquoted `placeholder=t(...)` attribute (same bug class as v15.11.5). Fixed even though this renderer is now unreachable through the two redirected triggers; defense in depth for any serialized `view.modal = { type: 'evening_reflection', ... }` edge case.

### Why
- Tester observation: the merged Evening reflection tile on Today was clean, but users who let the 18:00 auto-fire catch them saw a different-looking modal with different content — confusing inconsistency. Also: the sangha multi-member switch had its own evening surface. All three now share one surface.
- Completes the follow-up flagged in the v15.15.0 CHANGELOG.

### Backward compat
- `evening_reflection` modal type remains a valid render target (for any saved or external `view.modal.type === 'evening_reflection'`), just not auto-routed to anymore.
- Data shape unchanged — `saveDailyDiagnostic` writes to the same `state.diagnostics.daily[dk][mid]` path. Existing trend charts + gate evaluations work unmodified.

### Tests
- 39/39 vitest, 19/19 Playwright.

## [15.15.1] — 2026-04-19 · Renamed `habit_quest` → `adze` everywhere it still lingered

### Changed
- **`STORAGE_KEY`** in `src/data/loaders.js` renamed from `'habit_quest_v4'` → `'adze_v1'`. The old name was a historical artefact from the pre-Adze days. User-invisible migration: existing anonymous-mode users find the new key missing on next load, fall through to `LEGACY_KEYS` (which now lists `'habit_quest_v4'` at the front), their data is migrated and re-saved under `'adze_v1'`. Authenticated users are unaffected — their ciphertext lives in Supabase, not keyed by this name.
- **Export filename**: `habit-quest-${todayKey()}.json` → `adze-${todayKey()}.json` (both in `systems/export-import.js` and the duplicate path in `render/settings.js` — the latter is being kept for compatibility with any older caller).
- **Export `_meta.app`** field in the JSON payload: `'Habit Quest'` → `'Adze'`.
- **Import messaging** ("doesn't look like a Habit Quest export", "Import this Habit Quest data?") → Adze-branded, with a comment noting that legacy exports still import fine (structural check is `members && habits`, not a metadata string check).
- **Markdown exports** (practice-history / sangha / liberation) no longer say "from Habit Quest" — all say "from Adze" now.
- **`alerts.not_a_valid_export`** string updated to match.

### Why
- Tester / maintainer observation: *"I can see in some codes still habit_quest items, why not change everything to adze?"* The app has been called Adze for a long time; leftover `habit_quest` references in filenames, export metadata, and markdown exports were creating a branding-coherence gap. Mostly cosmetic, but the STORAGE_KEY rename is the only one with behavioral impact — and it's transparent to users.

### Backward compat
- **Legacy localStorage**: `'habit_quest_v4'` (current), `'habit_quest_v3_5'`, `'habit_quest_v3_3'` all still migrate on first load. Only the top-level key name changes.
- **Legacy JSON exports**: the old format with `_meta.app: 'Habit Quest'` re-imports fine. The import validator checks structural fields (`members`, `habits`), not the name.

### Not touched
- `docs/CHANGELOG.md` historical entries (history is history).
- Git commit messages (can't rewrite without force-push).
- `docs/COMPLIANCE-LOG.md` + other docs that reference `habit_quest_v4` as the current storage key — those are historical at this point; future compliance notes will reference `adze_v1`.

### Tests
- 39/39 vitest, 19/19 Playwright.

## [15.15.0] — 2026-04-19 · Reflection-merge — one progressive flow, no longer two tiles

### Changed
- **Today → Reflection column** now shows a single "Evening reflection" tile instead of the two ("One-line journal" + "Evening close") that felt redundant. Tapping it opens the merged flow.
- **`openEveningClose()`** now starts at a new phase `oneline` (one-line capture) with two buttons:
  - **"Save and rest"** (ghost) — honest low-energy bail. Writes both `.oneline` AND a minimal `.daily = { theme: 'oneline_only', answer: <line>, completed }`. Counts as a full daily reflection in every downstream system (rank-gate journal leg, `completedDailies` counter, `pickNextStep`, 18:00 auto-fire).
  - **"Save and go deeper →"** (gold) — proceeds to the existing 6-phase gauge/minimal/standard/deep/open flow. `eveningCloseFinish` overwrites `.daily` with the richer version; rank-gate is idempotent same-day so no double counting.
- **`openOnelineJournal()`** redirects to the merged flow for back-compat. `path.js` (next-step prescription) and any other caller of the legacy name still work and land in the new flow.
- **`isDailyReflectionDoneToday`** now returns true for either a `.daily` OR `.oneline` entry. Callers (`path.js`, `rank-events.js`, Today primary-alert) all see a consistent "reflection done today" signal regardless of which branch the user took.

### Added
- **`evening_close.oneline.*`** strings — heading, subtitle, placeholder, hindrance hint, the two action buttons, footer hint reinforcing that the deeper path is optional, never owed.
- **`today.refl.reflection_*`** strings for the new merged tile label + subs. Legacy `today.refl.journal_*` and `today.refl.evening_*` strings kept in place in case we need to roll back.

### Fixed
- **`src/modals/oneline-journal.js`** — placeholder attribute was unquoted (`placeholder=t(...)`), same bug class as v15.11.5 (literal `t('…')` text would render). Fixed even though this renderer is effectively unreachable after the merge — defense in depth for any serialized `view.modal = { type: 'oneline_journal' }` that might still come in.
- **`today.js`** — removed stale dead-key checks for `.daily.eveningClose`, `.deeper`, `.evening` (none were ever written by current code). Cleaned during the reflection-merge rewrite.

### Why
- Tester note (Dirk, 2026-04-19): *"two things one-line journal and evening close, what the real difference, is this not too much? can this be together as one? …they could skip always the more intensive reflection and journaling, but if they like and feel good, they should go on."*
- Design decisions flagged in the commit: (a) stop-at-line writes both `.oneline` AND minimal `.daily` to keep four downstream systems consistent (gate, counter, next-step, auto-fire); (b) single helper for "reflection done today"; (c) line text is folded into the final `.daily.answer` when the user continues deeper, so hindrance-keyword scans see it.

### Tests
- 39/39 vitest, 19/19 Playwright. No new behavioral test for the merged flow (fixture cost too high for one UI surface); welcome + magic-link smoke confirms nothing regressed on the boot path.

### Not yet touched (tracked for follow-up)
- `systems/rank-events.js:58–72` 18:00 auto-fire still opens the separate `evening_reflection` modal (different codepath from `evening_close`). With the new `isDailyReflectionDoneToday` gate including `.oneline`, the auto-fire will correctly suppress when the user has already written a line — but for users who haven't yet, the auto-fire opens a separate modal that doesn't share this merged flow. Harmonizing those two is a future commit.
- `systems/sangha.js:261` sangha-trigger also opens the separate `evening_reflection` modal. Same follow-up.

## [15.14.1] — 2026-04-19 · Warmer copy on the two habit-tap modals

### Changed
- **`timer_prompt`** (the modal that appears when tapping a meditation habit on Today) — added a short italic subtitle under the heading: *"Three honest answers: the cushion already held me · the cushion is calling now · not this time."* Frames the three-option choice as a dhamma-flavored moment instead of a UI decision.
- **`confirm_habit_done`** (non-meditation habit confirmation sheet) — body rewritten from *"A small pause before recording — let the moment of completion be intentional."* to *"The tap is not the practice. But it is the trace. Only yes if it really happened."* Heading tightened from *"Mark as done?"* to *"Mark this done?"*.

### Why
- Tester note (Dirk, 2026-04-19): *"can add a funny menu quote… think as a game designer with storytelling ability."* Small copy refinement; kept the tone measured (not cutesy) because this is a meditation app and the prompt needs to hold gravity, but warmer than pure UI language.

### No code change
- Pure copy. No behaviour change. 39/39 vitest, welcome smoke green.

## [15.14.0] — 2026-04-19 · Saved teachings — stable-id schema + Wisdom-tab collection (copy + print)

### Added
- **Stable IDs on all 27 entries in `teaching-quotes.json`** — e.g. `chah-just-let-go`, `buddha-dhp5-hatred-ceases-by-love`, `tnh-peace-every-step`. The old positional `index` is gone from the wire format.
- **Saved-quote entries now embed `{id, text, source, savedAt}`** — the quote text + attribution travel with each saved entry so a user's personal collection survives any future rename, reorder, or pruning of the canonical quotes JSON. Was a latent data-integrity bug.
- **One-time migration** in `migrateState` (`_v15140SavedQuotesHydrated`) walks every existing user's `state.savedQuotes` and converts legacy `{index, savedAt}` rows into the new shape using the current `TEACHING_QUOTES` array. Orphan rows (index no longer resolving) are dropped silently rather than carried forward as broken pointers.
- **Wisdom tab → Saved teachings section** — new collapsible section between Sutta library and Codex. Shows the collection grouped by source (Ajahn Chah, Thich Nhat Hanh, etc. each a pocket-list), with per-quote copy and unsave buttons, section-level "🖨 Print" and "⧉ Copy all" buttons. Default collapsed (honours the v13.6 anti-scroll rule in Wisdom).
- **Print view** (`printSavedQuotes(memberId)` in `systems/quotes.js`) opens a standalone printable HTML document in a new tab and calls `window.print()` automatically. Clean Georgia-serif typography, grouped by source, page-break-inside avoided per group. Also works as "Save as PDF" via the browser's print dialog.
- **`copyToClipboard(text)`** — small shared helper in `systems/utils.js` (with hidden-textarea fallback for non-secure-contexts). Used by per-quote copy, copy-all, and will be reusable anywhere else clipboard is needed.

### Changed
- **Today → "Word from the Buddha" card** still uses the heart toggle (unchanged UX), but now wires `toggleQuoteSaved('<id>')` instead of `toggleQuoteSaved(<index>)`.
- **`getDailyTeaching()`** returns `id` alongside the existing `text`/`source`/`index`/`matchedTo`. The `index` remains for back-compat with any external caller.
- **Review tab** saved-quotes section continues to work (this-period summary), just wired through the new id-based unsave action. Kept as a complementary view to the permanent Wisdom collection.

### Notes
- Per-source filter isn't a separate UI element — grouping is the filter. Deferred unless testers explicitly ask for a "show only Ajahn Chah" toggle.
- No changes to the heart icon — `🔖`-vs-`♥` can be a separate tiny copy commit if you prefer.
- Tests: 39/39 vitest, 19/19 Playwright. No behavioural test for the new section (would need full assessment setup in the fixture); welcome + magic-link smoke confirms nothing regressed on the boot path.

## [15.13.3] — 2026-04-19 · HOTFIX — bell-sound previews no longer overlap

### Fixed
- **Settings → Bell sound:** tapping a new sound while the previous one was still ringing caused them to overlap. Two underlying causes, both addressed:
  1. **Sample bells (HTMLAudioElement)** — `_playSampleBell` cached one `Audio` element per file path, so each new variant created/used a different cached element with no link to the previously-playing one. Now tracks `_currentBellAudio` module-side and pauses + rewinds it before starting any new bell.
  2. **Synth-fallback bells (Web Audio oscillators)** — each `BELL_VARIANTS[*].play(ctx)` connected oscillators directly to `ctx.destination`, so there was no way to silence an in-flight decay. Synth play signature extended to `play(ctx, dest = ctx.destination)`; `_playVariant` creates a master `GainNode` per call, passes it as `dest`, and ramps the previous one to silence over 50ms (avoids click) before disconnecting.
- All five BELL_VARIANTS in `config.js` (warm, goenka, singing, wood, thai) updated to use `dest` instead of `ctx.destination` in their oscillator connects. Default arg keeps any future variant that ignores the parameter functional — it just won't be silenceable mid-decay.

### Why
- Tester report: "in Settings → Bell sound, each sound won't stop if I press a new one, so the bell sounds overlap each other." Reproducible by tapping multiple Preview buttons quickly.

### Notes
- The fix also applies to `playBell()` (the in-app sit-bell), so back-to-back sit transitions will likewise no longer overlap.
- `_currentBellAudio` and `_currentBellGain` are module-private state; they reset per page load. No persistence needed.

## [15.13.2] — 2026-04-19 · OTP length — copy + invite-flow validation now match the live 8-digit setting

### Fixed
- **`src/systems/auth.js:220`** (`authVerifyEmailOtp`, the invite-code path) — client validation hardcoded `^\d{6}$` and rejected 8-digit codes before they ever reached Supabase. Bumped to `^\d{4,10}$` to match `authVerifyMagicCode` (already fixed in v15.11.2) and Supabase's documented Email-OTP-Length range. The magic-link flow itself was unaffected; this only blocked the older invite-code surface.
- **`src/modals/auth.js`**: invite-code input pattern + maxlength were also hardcoded to 6 — now `[0-9]{4,10}` / `maxlength="10"`.

### Changed (copy)
- Magic-request modal subhead: "6-digit" → "8-digit".
- magic-verify code input placeholder: 6 dots → 8 dots (in both magic-link AND invite-code surfaces, replace_all).
- magic-verify error: "Enter the 6-digit code" → "Enter the 8-digit code from your email".
- v15.13.1 welcome subline (added yesterday) was already digit-agnostic; no change needed there.
- Comments updated through both files to reference the configurable Supabase OTP length, not a magic constant.

### Why
- The live Supabase project (`zpawwkvdgocsrwwalhxu`) is configured for 8-digit OTPs (Auth → Email OTP Length). User-facing copy was still saying 6, which would confuse first-time testers, and the invite-code validator was blocking the actual codes.

## [15.13.1] — 2026-04-19 · Copy clarification — magic-link is passwordless sign-in, not a one-time invite

### Changed
- **Welcome screen** — added a small italic line under the "Sign in with email" CTA: *"A fresh sign-in code is emailed each time — no password to remember. Works on any device with the same email."* Pre-empts the common misreading that magic-link is a one-time invite link.
- **Magic-request modal subhead** — was *"We'll send a code to your inbox."*; now *"We'll email a 6-digit code — a fresh one every time you sign in. No password to remember."* Same intent, more explicit.

### Why
- Tester / co-founder thinking: people unfamiliar with passwordless auth (Slack / Notion / Substack pattern) often parse "magic link" as a single-use invite. The model is actually two layers — magic-link = identity (re-issuable as needed), passphrase = encryption key (only on your device). Making the re-issuance explicit in onboarding copy avoids "wait, how do I sign in on my phone?" support questions.

### No code or behavior change
- Pure copy. Same auth flow, same passphrase flow. 39/39 vitest, 9/9 (welcome + magic-link) Playwright.

## [15.13.0] — 2026-04-19 · Habit-tap confirmation (Li May feedback)

### Changed
- **Today screen → Meditation column** taps now route through the existing `handleHabitTap` dispatcher instead of bypassing it with a direct `toggleHabit` call. One-line fix in `render/today.js:437`. The dispatcher was already in `systems/habits-ui.js` and already knew how to route sit habits to the timer flow — Today just wasn't using it.
- **`handleHabitTap` extended**: meditation classification (sit / walking / metta) now triggers the timer flow even for habits without a `slot` (i.e. user-added walking/metta from the small-habits catalog). Previously only `slot`-bearing habits got the timer.

### Added
- **`confirm_habit_done` modal** — small confirmation sheet shown when a non-meditation habit card is tapped (custom habits, non-meditation small habits like body_scan / mindful_meal / etc., journals if reached this way). "Mark as done?" with a one-line tonal note. Yes / Not yet. Already-done habits still un-mark on tap without confirmation (over-confirmation taxes the user).

### Why
- **Tester feedback (Li May, 2026-04-19)**: *"I can still click with one mouse click on e.g. morning sit or evening sit and the task is just done. I wanted either a popup with the question, if I like to start the task, or if I like to confirm that I sat?"*
- **Dirk's preference**: meditation habits = ritual (commit + start the timer; completion happens when the timer ends, not on the tap). Non-meditation habits = a small intentional pause before recording. Both addressed in this change.

### Tests
- 39/39 vitest, 19/19 Playwright.
- No new test for the confirmation flow itself — would require a fully-set-up assessment to populate habits in the test fixture; deferred. The welcome smoke test confirms the new modal script loads without JS errors.

## [Unreleased — server-side, no APP_VERSION bump] — 2026-04-19 · DSGVO Track A10 + repo migration snapshots

### Added
- **`supabase/migrations/20260419102900_enable_pg_cron_and_inactive_user_cleanup.sql`** (Track A10) — enables `pg_cron` 1.6.4 in Supabase, adds SECURITY DEFINER function `public.cleanup_inactive_users(dry_run boolean default true)`, schedules `adze-cleanup-inactive-users` daily at 03:30 UTC. The function deletes users whose latest activity (max of `last_sign_in_at`, `created_at`, `user_state.updated_at`) is older than 24 months — making the Datenschutzerklärung's 24-month-inactivity promise (A3) enforceable.
- **Cron starts in DRY-RUN mode** — function defaults to `dry_run := true`. Operator validates the dry-run output for a couple of daily cycles, then flips to live deletion via the one-liner included in the migration file (`unschedule` + `schedule` with `false`).
- **`supabase/migrations/`** — snapshots of all three live migrations (`create_user_state`, `create_beta_allowlist_with_trigger`, the new A10 migration) committed to the repo for audit trail + disaster recovery. Companion to `supabase/functions/`. README explains the workflow.

### Notes
- `beta_allowlist` seed inserts in the second migration are intentionally redacted in the repo snapshot — committing real beta-tester e-mail addresses to a public repo would be unlawful processing of their personal data.
- No client-side code changed; APP_VERSION not bumped.

## [15.12.4] — 2026-04-19 · DSGVO Track A4 — Age + Datenschutz consent in magic-request flow

### Added
- **`renderMagicRequest`** now shows an un-pre-checked consent checkbox: *"I am at least 16 years old and have read the documents below."* with inline links to the Datenschutzerklärung and Impressum. Send-code button is disabled until the box is checked. Defense-in-depth: `authDoRequestMagicCode` also rejects with a visible error if the box was bypassed via DOM tampering.
- **New e2e test** `consent checkbox gates the Send-code button (Track A4)` — verifies the button is disabled without consent, enabled with consent, disabled again after uncheck. 19/19 Playwright + 39/39 vitest.

### Why
- **Art. 8 DSGVO** — minimum age 16 in Germany. Without an explicit gate, a 15-year-old could create a synced account through the magic-link flow.
- **Art. 7 DSGVO** — informed consent must be explicit, unambiguous, freely given, easy to withdraw. Linking the Datenschutzerklärung and Impressum at the point of consent (not just in a footer) makes informed consent demonstrable.

### Notes
- A separate Terms-of-Service document (`docs/TERMS.md`) is not currently linked from the app; the consent references the two legal must-haves only. Terms can be folded in if/when Adze offers commercial services.
- Existing magic-link e2e tests updated to check the consent box before clicking Send-code (one regex Edit covered the three `tester@adze.life` call sites + one for the `blocked@example.com` case).

## [15.12.3] — 2026-04-19 · DSGVO Track A9 — Account deletion now removes email from beta_allowlist

### Fixed
- **Edge Function `delete-account`** previously deleted the `auth.users` row (cascading to `user_state`) but left the user's email in `public.beta_allowlist`. Effect: a "deleted" user remained on the closed-beta invite list — partial fulfillment of Art. 17 (right to erasure). The function now deletes the allowlist entry FIRST (read user.email from JWT, lowercase + trim, DELETE), then deletes the auth row. If the allowlist delete fails, the function aborts BEFORE the auth delete to avoid a half-deleted account that silently leaks the email.
- Source committed to `supabase/functions/delete-account/index.ts` (audit trail + disaster recovery — was previously Supabase-only).

### Verification needed (manual, gated on Dirk)
Sign up a throwaway account, add to allowlist, sign in, hit Settings → Reset Everything → Delete account, then SQL-verify both tables are clean. Record under `docs/COMPLIANCE/` (gitignored).

### Notes
- Deployed via Supabase MCP as version 2 of the function (ezbr_sha256 changed). No client-side code changed; the version bump is for changelog continuity.

## [15.12.2] — 2026-04-19 · DSGVO Track A3 — Datenschutzerklärung (Art. 13 disclosure) + Sangha parked

### Added
- **Datenschutzerklärung modal** — new `src/modals/datenschutz.js` companion to the friendly `privacy_detail` modal. 12 numbered sections covering all of Art. 13 (1) + (2): controller, purposes + lawful bases, recipients (Supabase / Cloudflare / Resend), Art. 46 SCCs, retention windows, full rights enumeration, complaint contact (Sächsischer Datenschutz- und Transparenzbeauftragter), required-data clause, Art. 22 negative declaration, TDDDG § 25 (2) Nr. 2 cookie position, source of data, effective-date + change procedure. Reachable via `openDatenschutz()` from welcome footer, Settings → Privacy, and a new "Detailed legal notice" button at the bottom of the friendly modal.
- **Welcome footer + Settings → Privacy** now show three legal links: friendly privacy note · Datenschutz · Impressum.

### Changed
- **`privacy_detail.para_tailwind`** — replaced the obsolete "Tailwind loads from a CDN" paragraph with the truthful "no third-party scripts at runtime; everything vendored under /vendor/" statement (consistent with A1).
- **`privacy_detail.para_gdpr`** — shortened to a summary paragraph that points to the new detailed notice for the structured legal text.

### Decided
- **Sangha (Tracks B + C) parked indefinitely.** Cross-user feature introduces Art. 9 sensitive-data processing, social-graph processing, and a likely Art. 35 DPIA + § 38 BDSG DSB-pflicht reassessment — too much compliance overhead for a feature with no validated tester demand. Design docs in `docs/SANGHA-DESIGN.md` preserved as intellectual capital. Re-evaluation criteria documented in `docs/COMPLIANCE-LOG.md` (need: Track A complete + ≥3 tester requests + product-owner go-ahead). The current legal work covers Adze-as-it-is-today only — no pre-disclosure of unimplemented processing.

### Notes
- Datenschutzerklärung is currently English. German translation queued as a follow-up. The Impressum stays German (legal text obligation under § 5 DDG); Datenschutzerklärung in the language the app otherwise uses is acceptable, with translation a quality improvement.
- Two self-honest acknowledgements in the retention paragraph: 24-month-inactivity auto-delete will be implemented before public release (today only the explicit in-app delete-account button is active); folds with Track A10.

## [15.12.1] — 2026-04-19 · HOTFIX — Setup summary no longer names a worry the user did not pick (Li May)

### Fixed
- **`src/engine/diagnostic.js:291` and `:315`** — the beginnerCare intro lines were hardcoded with chip-specific content (*"Adjust any posture to keep the **pain** manageable"* in physicalNote, *"**Thoughts do not stop** — they are what the mind does"* in reassurance). Both fired whenever **any** chip in the respective question was selected, regardless of which chip. Effect: a tester (Li May) who picked `time_commit` + `missing_days` saw a paragraph about not stopping thoughts — a worry she had not named. Same shape for someone who picked only `sleep_energy` and was told about pain.
- Both intros are now chip-agnostic; the bold lines that follow continue to carry chip-specific guidance via `chipInterp.flags`. No flag mapping changed; copy below the intro untouched.

### Added
- **`tests/unit/engine-diagnostic.test.js`** — six new cases under `beginnerCare intro must not name an unselected chip`. Asserts the intro never contains "thoughts do not stop" / "thoughts" / "pain" when the corresponding chip wasn't picked, and verifies the targeted bold lines still surface for `time_commit`, `missing_days`, `back`. Existing 33 tests still pass; total 39/39.

### Why this matters beyond the bug
The same `dominant_hindrance` derivation that drives this summary becomes the highest-risk Sangha-share field (Track B5 in `docs/COMPLIANCE-LOG.md`). Wrong derivation now = wrong public face later. Fixing this is also Sangha prep.

## [15.12.0] — 2026-04-19 · DSGVO Track A1 + A2 — self-host CDNs + Impressum

Three-lens review (game design + senior engineer + Datenschutz lawyer) of the upcoming Sangha feature converged on a sequenced rollout. Tracks documented in `docs/COMPLIANCE-LOG.md`; roadmap in `docs/ROADMAP.md`. This release ships the two highest-priority items in Track A.

### Added
- **`src/vendor/`** — vendored Tailwind Play CDN runtime (`tailwind-play-cdn.js`, 397 KB) and Supabase JS SDK (`supabase.js`, pinned `2.103.3`). Visitor IPs no longer leak to `cdn.tailwindcss.com` / `cdn.jsdelivr.net`. Closes the LG München I 3 O 17493/20 (Google-Fonts) class of risk.
- **Impressum** — new `src/modals/impressum.js` (German legal text per § 5 DDG). Reachable from welcome footer and Settings → Privacy via `openImpressum()`.
- **`docs/COMPLIANCE-LOG.md`** — full Tracks A/B/C action items with rationale, decision log, and DSGVO article cites for the Sangha rollout.
- **`docs/SANGHA-DESIGN.md` review** — three reviews summarized; details in COMPLIANCE-LOG.

### Changed
- **`src/_headers`** — Content-Security-Policy `script-src` and `style-src` dropped both CDN domains (now `'self'` only). `'unsafe-eval'` retained for the self-hosted Tailwind Play runtime; queued follow-up to replace with a real Tailwind build to drop it.
- **`src/index.html`** — `<script>` tags for Tailwind + Supabase point at the local vendored copies.
- **`docs/ROADMAP.md`** — added "Compliance + Sangha sequencing" section indexing Tracks A/B/C; rewrote "Current Focus" to lead with Track A and the Li May engine bug.
- **`docs/FEEDBACK.md`** — Li May's setup-summary bug logged with reproduction, root cause (`src/engine/diagnostic.js:315`), proposed 3-line fix, missing-test list. Promoted to Next up.

### Tests
- **`tests/e2e/magic-link.spec.js` + `tests/e2e/invite-flow.spec.js`** — `page.route()` regex extended to also intercept the new `/vendor/supabase.js` path, so the Supabase SDK stub still applies after vendoring. Caught by the suite before deploy.
- 33/33 vitest unit tests pass; 18/18 Playwright e2e pass.

### Logged (not yet fixed)
- Li May setup-summary bug: hardcoded "Thoughts do not stop" lead sentence in `engine/diagnostic.js:315` fires on any `concerns` chip, not just the `thoughts_stop` chip. Same anti-pattern in physical-concerns block at `:291`. 3-line fix + 6 missing tests queued — same `dominant_hindrance` field is the highest-risk Sangha-share attribute, so fixing now doubles as Sangha prep (Track B5).
- Track A3–A10 + Track B + Track C → see `docs/COMPLIANCE-LOG.md`.

## [15.11.5] — 2026-04-19 · HOTFIX — Add-habit placeholder literal `t(...)` bug

### Fixed
- Add Custom Habit modal showed the literal string `t('add_habit.name_placeholder')` in the Name input's placeholder instead of the intended "e.g. Read 20 minutes". Root cause: `src/modals/add-habit.js:14` had `placeholder=t(...)` — missing the `${}` template-literal interpolation AND missing quotes around the value. Browser read the whole expression as an unquoted HTML attribute value. Fixed to `placeholder="${t(...)}"`.

### Logged (not yet fixed — in `docs/FEEDBACK.md` Open + Next up)
Six tester observations from the live-game test on 2026-04-19 were added to `docs/FEEDBACK.md`:
- Add-custom-habit modal needs sutta-based habit catalog (remove blank-slate UX).
- "Add as a habit in settings" links on Today jump without context; should stay in Today or pre-fill.
- One-click habit completion with no confirmation — meditation habits should open the timer, non-meditation should ask "mark as done?".
- One-line journal + Evening close — likely merge into a single Evening ritual with the one-liner as the first prompt.
- Quote save / collection — add 🔖 to the "Word from the Buddha" card, collect in a new view.
- "The Codex" heading is opaque — rename or subsume the quote collection.

None of these are code changes tonight — they're design decisions. Promoted the top two (tap-to-complete confirmation + quote save) to the Next up section for the next working session.

## [15.11.4] — 2026-04-19 · Setup Phase B selects now give visual feedback

### Fixed
- **`Where is the edge of your practice right now?` (and other Phase B selects) gave no visual feedback on tap.** Root cause: `setDiagnosticB()` had a hardcoded `selectKeys` list that decided whether to trigger the re-render. `currentEdge` was missing from it (among other potential omissions). State updated silently in memory; UI didn't repaint. Reported by Dirk — "I reported this quite a while ago, not sure why it is not fixed." It had been rolling over from prior sessions without reaching a fix.
- Replaced the hardcoded list with a dynamic derivation from `__ASSESSMENT` (the loaded `assessment.json`). Any question with `"type": "select"` in any Phase B branch now routes to the re-render path automatically. Adding a new select question in the JSON no longer requires a mirrored code change in setup-flow.js.

### Tracked
- Logged in `docs/FEEDBACK.md` → Open → now FIXED. Next-up items queued: annotate setup elements with `data-component` for cleaner element-feedback paths; audit remaining Phase B/C flows for similar re-render omissions.

## [15.11.3] — 2026-04-19 · Feedback mode actually reports clicks now

### Fixed
- **In feedback mode, clicking on anything that wasn't annotated with `data-component` did nothing visible** — the click went through to whatever normal handler existed. Most setup buttons aren't annotated, so testers reported "nothing happens" and got frustrated. Now: every click in feedback mode opens the element-feedback modal, regardless of annotation.
- When the clicked element has `data-component`, its curated path is used (e.g., `setup.assessment.phase_a`). Otherwise a CSS-selector-ish DOM path is derived (e.g., `button.btn.btn-gold`). Either way maintainers can find the element in source.
- Feedback-mode cursor is now `crosshair` on the whole body and a subtle gold outline appears on any hovered element. Visual signal that the mode is active everywhere, not just on some elements.

## [15.11.2] — 2026-04-19 · HOTFIX — OTP verify: code length + type retry

### Fixed
- **Client regex hardcoded 6 digits.** Supabase's OTP length is per-project configurable (4–10). Dirk's project issued 8-digit codes which the client rejected before even calling verifyOtp. Regex relaxed to `^\d{4,10}$`.
- **`verifyOtp` type was always `email`.** Supabase routes `signInWithOtp` differently depending on whether the target email already exists: new user → token type is `signup` or `magiclink`, existing user → `recovery`. The error "token has expired or is invalid" is returned for a valid-but-wrong-type token (not just real expiry), which made this invisible from the app's side. Now retries `email → magiclink → recovery → signup` in sequence until one succeeds. Failed attempts don't consume the token, so retrying is safe.

### Known good: evidence from Supabase auth logs
- `action: user_recovery_requested` is what Supabase logs when an existing user calls `signInWithOtp`. The fix handles exactly that case.

### Pair action
- Stale `d.sauerstein@gmail.com` auth user deleted (via MCP). Next magic-link test starts clean.

## [15.11.1] — 2026-04-19 · HOTFIX — fresh users land in passphrase-setup, not unlock

### Fixed
- Bootstrap used to unconditionally open the **passphrase-unlock** modal for any authed-but-locked session. For a brand-new user who had just confirmed their email or entered their first magic code, there was no remote ciphertext row to unlock — so the modal displayed "no encrypted data on server" and looked broken. First impression: failed.
- Now async-checks `passphraseRemoteExists()` at boot and routes: **row exists → unlock** (returning user on a new device), **no row → setup** (first-time user). The user's first passphrase interaction matches what they actually need.

### Also needs from you (one-time Supabase setting)
- **Supabase dashboard → Authentication → Providers → Email → uncheck "Confirm email" → Save.** With confirm-email on, `signInWithOtp` sends the "Confirm signup" template (clickable link) for new users instead of the "Magic Link" template (6-digit code). The allowlist already gates access — email confirmation is redundant for the closed beta. With it off, every sign-in — first time or returning — uses the magic-link template with the 6-digit code, consistently.

## [15.11] — 2026-04-19 · Magic-link sign-in + allowlist gating

### Added
- **Magic-link sign-in** (the Slack/Notion/Linear pattern). Welcome page now has a single **"Sign in with email"** button. Tester enters email → Supabase sends a 6-digit code via the **Magic Link** template → tester types the code in Adze → session created → passphrase setup → onboarding. **No passwords. No clickable token links. No prefetch vulnerability. Works in every email client.**
- **Database-level allowlist** (`public.beta_allowlist`) + trigger on `auth.users` that rejects emails not on the list. Applied via Supabase MCP migration. You control access by editing one table — *anyone* trying to sign in with a non-allowlisted email gets rejected cleanly at the server before any code is emailed. Seeded with Dirk + Li May.
- `email-templates/magic-link.html` — the email Supabase sends for `signInWithOtp`. Leads with a big monospace 6-digit code, minimal copy, instructions below.
- `tests/e2e/magic-link.spec.js` (4 tests) — happy path, blocked email (allowlist rejection), wrong code, malformed code.
- `systems/auth.js`: `authRequestMagicCode(email)` and `authVerifyMagicCode(email, code)`.
- `modals/auth.js`: new steps `magic-request` + `magic-verify` with Resend Code action.

### Changed
- **Welcome page simplified from 3 confusing options to 2 clear ones:**
  - **Begin** (anonymous local-only practice)
  - **Sign in with email** (magic link)
- Removed the "I already have an account — sign in" and "I have an invite code →" links. Both were broken under CSP anyway (see v15.10.1). The password-based sign-in flow still exists in code for edge cases but is no longer advertised.

### Supabase setup (user action — one time, 3 minutes)
1. **Authentication → Email Templates → Magic Link** → paste `email-templates/magic-link.html` → Save.
2. Allowlist is already seeded with your email + Li May's. To add more testers: **Database → Tables → `beta_allowlist` → Insert row → email → Save**. That's the entire onboarding gesture from now on.
3. No "Invite user" clicks anymore. Testers go to adze.life, tap Sign in with email, type their email → 6-digit code arrives → they're in. Or rejected at the server if their email isn't on the list.

### Why this works where the previous attempts didn't
- **Link prefetchers can't consume codes** — there's no link, only a 6-digit number the tester types.
- **Allowlist enforced at the database trigger level** — cannot be bypassed from the client. Anyone typing an email not on the list is rejected before a code is even generated.
- **No token format assumptions** — `{{ .Token }}` for magic link emails IS a 6-digit code (unlike invite emails where it's a long hash — my v15.10 mistake).
- **One secret per user** — just the encryption passphrase. No password to forget, no invite to expire.

## [15.10.1] — 2026-04-19 · HOTFIX — CSP was blocking every inline onclick handler

### Fixed
- **`_headers` CSP was missing `'unsafe-inline'` in the `script-src` directive.** Adze uses inline `onclick="..."` handlers on every button (100+ of them across modals, render files, welcome). Browsers refuse to execute inline handlers unless `'unsafe-inline'`, a hash, or a nonce is present in CSP. Since v15.3 shipped the first `_headers` file, **every button in the live app has been silently unclickable for every user on every device**. The console logs a specific CSP violation for each click; no JS error, just silent no-op.
- Added `'unsafe-inline'` to `script-src`. Inline handlers now execute. The CSP remains strict on other vectors (frame-ancestors, connect-src, img-src, etc.).

### Added
- **`tests/e2e/_live-diag.spec.js`** — live-deploy smoke test (ignored from the per-PR run, run via `npm run test:e2e:live` after each deploy). Asserts the welcome page loads with zero CSP/JS errors AND that clicking Begin actually opens a modal. This single test would have caught the v15.3→v15.10 regression in under 5 seconds if it had existed.
- `test:e2e:live` npm script now targets this spec specifically.

### Root cause
- The per-PR e2e suite runs against localhost's `python3 -m http.server`, which **does not apply Cloudflare's `_headers` file**. So the CSP restriction only existed on the live deploy, invisible to my local test runs. Every v15.x release since v15.3 has been effectively broken for all users even though CI was green.

### Lesson
- Any CSP / server-header change needs a live-smoke test that runs against the actual Cloudflare deploy, not just localhost. `_live-diag.spec.js` is that test now.

## [15.10] — 2026-04-18 · 6-digit invite code (the Slack/Notion/Linear pattern)

### Added
- **Primary invite flow is now a 6-digit code.** Welcome page → "I have an invite code" → tester enters email + 6 digits → `supabase.auth.verifyOtp({ email, token, type: 'invite' })` → set-password modal → onboarding. Nothing happens server-side until the human types the code. Definitively prefetch-proof.
- `authVerifyEmailOtp(email, token, type)` in `auth.js`. Validates the code is 6 digits, calls verifyOtp, handles the error path honestly.
- New modal step `invite-code` with email + monospace code input (inputmode=numeric, autocomplete=one-time-code for SMS autofill on iOS).
- `invite.html` email template redesigned: the 6-digit code is the primary thing in the email, big and monospace. The old clickable link stays as a low-key shortcut ("if your email client doesn't auto-fetch links").
- Two new e2e tests — verify happy path + invalid-code rejection.

### Why this pattern
- Slack, Notion, Linear, GitHub device auth, most banks. All use codes for auth emails. The single reason: nothing in the link → nothing for a prefetcher to consume.
- The landing-page-with-clickable-link (v15.9) survives as a fallback for testers who prefer to click.

### Action required after Cloudflare deploys
- Supabase dashboard → Authentication → Email Templates → Invite user → re-paste `email-templates/invite.html` (the HTML changed — code is now the primary element).

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
