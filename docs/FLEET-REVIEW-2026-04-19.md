# Fleet review — pre-public-launch audit · 2026-04-19

Parallel review by the seven Tier-1 + Tier-2 agents defined in `.claude/agents/`. Bar: Ray Amjad-caliber product-review standard per Dirk's instruction. Scope: full current state of Adze at commit `de7beb0`. Sangha feature out of scope (parked).

- **dsgvo-lawyer** · DSGVO/BDSG/TDDDG compliance
- **senior-engineer** · architecture + correctness
- **security-reviewer** · AppSec + crypto + RLS
- **game-designer** · motivational mechanics + anti-patterns
- **ux-reviewer** · interaction design + iOS Safari
- **copy-storyteller** · voice + i18n catalog + Pāli diacritics
- **dhamma-reviewer** · Theravāda teaching accuracy

---

## TL;DR — is Adze shippable to public launch?

**Not yet, but close.** The architecture, crypto, and teaching-content *spine* are strong — every agent said so, in their own register. What blocks public launch is a cluster of ~12 Blocker-severity items spread across five lenses, and roughly 45 Important items that should land before `ADZE_PUBLIC_SIGNUP_ENABLED=true`.

None of the Blockers are architecture-level ("rip this up"). They are:

- Legal paperwork (A5 DPA archive)
- Five classes of wiring bug (unquoted `placeholder=t('...')`, sync-lifecycle silent data-loss, rank-announcement attainment-conflation, tisikkha-explainer shadow bug, inline-English-bypassing-i18n)
- Missing documentation (ADR-7)

Closing them is ~1 week of focused work with the agent fleet reviewing each fix. None require decisions Dirk hasn't already made — just execution.

---

## Blocker count by lens

| Lens | Blockers | Important | Nits |
|---|---|---|---|
| dsgvo-lawyer | 1 | 7 | 5 |
| senior-engineer | 3 | 9 | 2 |
| security-reviewer | 0 | 2 | 7 |
| game-designer | 0 | 4 | 3 |
| ux-reviewer | 1 (6 instances) | 7 | 5 |
| copy-storyteller | 1 | ~20 (inline-English leaks) | ~10 |
| dhamma-reviewer | 1 (4 string instances) | 8 | 5 |

Blocker total counting each distinct Blocker finding: **7 classes**, expanding to **~12 concrete commits** once each class's instances are enumerated.

---

## Cross-cutting concerns — multi-agent convergence

These findings were independently flagged by **≥ 2 agents** and are therefore highest-confidence:

### 1. Shared-device localStorage residue on sign-out
**Flagged by**: security-reviewer (Medium), dsgvo-lawyer (Art. 32 TOM gap)
**Summary**: `authSignOut()` locks the passphrase key but does not `localStorage.removeItem(STORAGE_KEY)` nor reset `state`. A user on a shared browser leaves their plaintext visible to the next user. Fix: four lines mirroring `authDeleteAccount`.

### 2. The `placeholder=t('...')` unquoted bug class ships in 6 places
**Flagged by**: ux-reviewer (Blocker, 5 new instances beyond the 2 I fixed this session), copy-storyteller (pattern)
**Summary**: `src/modals/element-feedback.js:48+:53`, `src/modals/feedback.js:118`, `src/modals/monthly-reflection.js:69`, `src/main.js:284+:346`. Browser renders literal `t('…')` text as placeholder. REVIEW.md was supposed to escalate new instances — this class is the exact bug REVIEW.md's last section called out.

### 3. Retention promise doesn't match implementation reality
**Flagged by**: dsgvo-lawyer (Art. 13 transparency), senior-engineer (rollout concern)
**Summary**: Datenschutzerklärung states "24 months of inactivity → auto-delete" in the present tense. The pg_cron job is in dry-run mode. Either flip the cron before launch, or rephrase the claim to name the planned change.

### 4. Consent gate wording — legal, copy, UX all agree it needs work
**Flagged by**: dsgvo-lawyer (Art. 7 Abs. 2 phrasing), copy-storyteller (inline English, legally-significant, duplicated), ux-reviewer (re-shown every device — redundant friction)
**Summary**: "I am at least 16 years old and have read the documents below" is inline English in `src/modals/auth.js:80`, shown on every new-device sign-in, with no Kenntnisnahme timestamp captured. Multiple fixes needed: rephrase to "zur Kenntnis genommen", extract to `t()` key, capture timestamp on first sign-in, skip on subsequent device sign-ins for returning users.

### 5. `metta` vs `mettā` inconsistency across user-facing copy
**Flagged by**: copy-storyteller (6 UI instances), dhamma-reviewer (6 instances in en.json + tutorials)
**Summary**: `en.json` uses "Mettā" in the meditation-timer + timer-prompt but "metta" in today-med + review labels. `tutorials/metta.json` uses both **in adjacent keys**. Pick mettā everywhere user-facing; bare `metta` only as code identifier.

### 6. Rank-announcement strings violate the rank-architecture's attainment-scaffolding discipline
**Flagged by**: dhamma-reviewer (Blocker — "stream-entry. The first three fetters have weakened…" declares canonical attainment without scaffolding), game-designer (Concern — rank-as-integer psychology)
**Summary**: `path-ranks.json` `note` fields and `liberation.js` disclaimer are exemplary. The four `rank_announcement.floor_teaching_*` strings break the pattern. Also `rank-announcement.js:38` hardcodes the 8→9 string bypassing the catalog.

### 7. `enforce_beta_allowlist` SECURITY DEFINER uses `search_path = public` not `''`
**Flagged by**: security-reviewer (Low-Nit), senior-engineer (Important), dsgvo-lawyer (Art. 32 comment)
**Summary**: REVIEW.md's security rules require `set search_path = ''` with fully-qualified identifiers. Current trigger uses `public`. Low-risk but inconsistent with the newer `cleanup_inactive_users` which does it right.

### 8. `auth.js` has 973 lines with zero `t()` calls
**Flagged by**: copy-storyteller (Important — legally-significant strings stay English-only), dsgvo-lawyer (Art. 12 Abs. 1 — German public launch needs translation), ux-reviewer (tonal drift from exemplars)
**Summary**: Every passphrase warning, error message, consent checkbox text is inline English. German translation for EU public launch is legally expected and operationally blocked by the inline-English wiring.

### 9. Extensive inline-English leaks on ceremonial surfaces
**Flagged by**: copy-storyteller (primary — this is their core finding), dhamma-reviewer (touches rank-announcement + teaching-detail), ux-reviewer (surfaces the tisikkha-explainer shadow bug)
**Summary**: Excellent copy exists in `en.json` that code bypasses. Worst: `teaching-detail.js` (4 hindrances + 4 foundations + 3 subtitles hardcoded), `rules-card.js` (10 bullets), `rank-intro.js` (3 paragraphs), `rank-announcement.js` (2 floor-teachings + 3 labels), `auth.js` (entire file), `welcome.js`, `settings.js`.

### 10. 18:00 auto-fire vs passive-tile architecture
**Flagged by**: game-designer (Concern — notification re-engagement pattern), ux-reviewer (adjacent — noted the passive tile at 17:00 already exists)
**Summary**: The 17:00 primary-alert tile is a passive invitation. The 18:00 `maybeTriggerEveningReflection` adds an active modal summons for the same undone reflection. Game-designer recommends deletion or opt-in; UX-reviewer didn't flag but noted the tile already covers the job.

---

## Prioritized action list

### Blockers (must land before `ADZE_PUBLIC_SIGNUP_ENABLED=true`)

1. **Track A5 — DPA archive + TIA**. Activate and archive the Supabase, Cloudflare, Resend DPAs under `docs/COMPLIANCE/DPA/` (gitignored). Draft a 1-page TIA per processor. *Source: dsgvo-lawyer. Owner: Dirk (dashboard access required).*

2. **Fix the 6 unquoted `placeholder=t('...')` instances**. `src/modals/element-feedback.js:48+:53`, `src/modals/feedback.js:118`, `src/modals/monthly-reflection.js:69`, `src/main.js:284+:346`. Same fix pattern as v15.11.5/v15.15.0/v15.15.2. Add a regex CI guard. *Source: ux-reviewer.*

3. **Sync-lifecycle data-loss trio**:
   - Add `pagehide`/`visibilitychange` flush for pending `_pushStateTimer` in `saveState()`.
   - Guard `saveState` to no-op (with user warning) when `authGetMode() === 'authed' && !passphraseIsUnlocked()` OR refuse state mutations while locked.
   - Add optimistic concurrency on `passphrasePushState` via `updated_at` guard + reconcile-on-conflict. Minimum viable: `BroadcastChannel('adze')` cross-tab warning. *Source: senior-engineer.*

4. **Rank-announcement attainment-conflation fix**. Rewrite `rank_announcement.floor_teaching_5_6` through `_8_9` (en.json) + the hardcoded string at `rank-announcement.js:38`. Apply the scaffolding-language pattern already established in `path-ranks.json` `note` fields and `rank_intro.body_3`. *Source: dhamma-reviewer (Blocker).*

5. **Fix `tisikkha-explainer.js:12` shadow bug**. `const t = mid ? getTisikkha(mid) : {...}` shadows global `t()`. Rename local to `tk`. The entire tisikkhā explainer modal is currently broken in production. *Source: copy-storyteller.*

6. **Write ADR-7 in `docs/DECISIONS.md`**. Text already drafted in `docs/COMPLIANCE-LOG.md` B1. Reviewers (human + agent) cite this rule everywhere — it must have a canonical source. 3-minute change. *Source: senior-engineer.*

7. **Shared-device plaintext residue in `authSignOut`**. Four lines: `localStorage.removeItem(STORAGE_KEY); state = newState();`. Mirror the existing `authDeleteAccount` cleanup. *Source: security-reviewer + dsgvo-lawyer.*

### Important (must land before public launch; closed-beta can survive one more cycle)

Legal / compliance:
- Retention-claim-vs-cron-reality mismatch: flip cron to live OR rephrase Datenschutz. *dsgvo-lawyer.*
- Recipient list omits Cloudflare Email Routing + Proton AG. *dsgvo-lawyer.*
- Feedback mailto Privacy-by-Default: practice-progress fields in default pre-fill (Art. 25 Abs. 2). *dsgvo-lawyer.*
- Terms § 4 "adults" vs consent gate "16+" mismatch. Pick one. *dsgvo-lawyer.*
- Datenschutzerklärung German translation for EU public launch. *dsgvo-lawyer.*
- Incident-response self-flags: configure Supabase + Cloudflare alerts; designate continuity contact. *dsgvo-lawyer.*
- Consent gate: rephrase "have read" → "zur Kenntnis genommen", capture timestamp, skip on returning-device sign-in. *dsgvo-lawyer + ux-reviewer + copy-storyteller.*
- VVT feedback lawful basis: reclassify Art. 6 (1) a → (1) f. *dsgvo-lawyer.*

Security:
- Email-enumeration oracle on allowlist error path — generic "if your email is on the list, a code is on its way" messaging before public launch. *security-reviewer.*
- Pin CSP `connect-src` to specific Supabase project URL rather than `*.supabase.co` wildcard. *security-reviewer.*

Architecture:
- Migration #1 not idempotent — add `if not exists` / exception-handling on policies. *senior-engineer.*
- `enforce_beta_allowlist` change `search_path = public` → `''` with qualified identifiers. *senior-engineer + security-reviewer.*
- `loadState` in synced mode: retry-with-backoff on transient network failure; softer error UI. *senior-engineer.*
- `_live-diag.spec.js:31` clicks `/begin/i` button that doesn't render in closed beta — live smoke is currently dead. *senior-engineer.*
- `authVerifyMagicCode` 4-type retry loop is noisy on flaky networks — cut to 2 likely types. *senior-engineer.*
- Remove stale `docs/ROADMAP.md:62` backlog item (src/loaders.js no longer exists). *senior-engineer.*

Game / motivational:
- Drop hindrance-keyword bonus from reflection scoring OR tie to chip-selection only (not regex scan of free text). *game-designer.*
- Delete or preference-gate `maybeTriggerEveningReflection` — the 17:00 passive tile is sufficient. *game-designer.*
- Rework `mahapajapati.teamScoreMultiplier` trigger — currently rewards high team shadow (rewards sangha struggle); invert to "recently dropped" OR drop multiplier. *game-designer.*
- Convert consumable character abilities (`weeklyMissForgiveness`, `teammateRescue`, `armyDismissal`) from period-budgets to condition-triggered floors (remove use-it-or-lose-it pressure). *game-designer.*
- Audit every `spendPanna` call site — verify paññā is being "spent" on teaching-appropriate beats, not gameplay unlocks. *game-designer.*

UX:
- Evening-close oneline phase: diagnostic sliders rendering above textarea violates minimal-by-default; put behind collapsed accordion or move to `gauge` phase. *ux-reviewer.*
- Welcome screen: add product preview before email request (post-launch conversion leak). *ux-reviewer.*
- Meditation-timer duration picker: "use last" shortcut (returning-daily tax). *ux-reviewer.*
- `confirm_habit_done`: add "don't ask for this habit" per-habit opt-out. *ux-reviewer.*
- Meditation-timer sitting phase: add "+5 min" mid-sit extension. *ux-reviewer.*
- Feedback banner: honor `env(safe-area-inset-top)` to not overlap iPhone notch. *ux-reviewer.*
- Passphrase-unlock success: 300–500ms "✓ unlocked" confirmation beat. *ux-reviewer.*

Copy / voice:
- Close inline-English leaks on ceremonial surfaces: `teaching-detail.js`, `rules-card.js`, `rank-intro.js`, `rank-announcement.js`, `setback-recovery.js`, `liberation-offer.js`, `defeat.js`, `struggle-suggestion.js`, `evening-reflection.js` — all have `en.json` keys waiting. Pure mechanical routing fix. *copy-storyteller.*
- Extract `auth.js` strings to i18n catalog (973 lines inline). *copy-storyteller + dsgvo-lawyer (consent gate specifically).*
- Extract `welcome.js`, `settings.js` critical strings. *copy-storyteller.*
- Normalize `metta` → `mettā` in all UI text and tutorials. *copy-storyteller + dhamma-reviewer.*
- Decide + document beta-guide register (first-person maintainer voice). *copy-storyteller.*

Teaching accuracy:
- Karanīya → Karaṇīya (Snp 1.8 misspelled — en.json:991). *dhamma-reviewer.*
- Pali → Pāli in user-facing text (liberation.js:110 and similar). *dhamma-reviewer.*
- AN 8.1 → AN 11.15/11.16 for eleven benefits of mettā (metta tutorial misattribution). *dhamma-reviewer.*
- MN 26 (closing) → MN 70 / AN 2.5 for the Bodhi-tree vow quotation (wisdom scroll w9). *dhamma-reviewer.*
- SN 22.45 wisdom-as-acala citation — locate the actual source (likely SN 48 indriya saṃyutta). *dhamma-reviewer.*
- `main.js:665` rank-ladder tooltip: rewrite "The end goal — Arahant — is Rank 9" (contradicts rank-architecture scaffolding). *dhamma-reviewer.*
- Dalai Lama + Thich Nhat Hanh quotes: either add lineage-framing tag in quote schema, or restrict default rotation to Theravāda sources. *dhamma-reviewer.*

### Nits (batch in a cleanup pass)

Roughly 30+ small items across all lenses. Not enumerated here; captured in each agent's per-report section below. Examples: HSTS preload, USt-ID future checklist, `Mahā Kassapa` vs `Mahākassapa` spacing, bell preset named "goenka", bump/body "grow a little" copy softening, pause button tap-target size, etc.

---

## Meta-observations

1. **The agent fleet works.** Seven independent lenses surfaced 12+ Blockers, ~45 Importants, ~30+ Nits. One single-lens review would have missed most of them. The cross-cutting concerns section above shows where multiple agents independently flagged the same issue — those are the highest-signal items.

2. **The architecture is sound.** Every technical agent (senior-engineer, security-reviewer) independently said "ship with fixes, the spine is strong." The blockers are execution issues, not design flaws.

3. **The content is stronger than typical.** copy-storyteller called the catalog "some of the best-tuned app copy I've read — when it's consumed" (the qualifier being the i18n bypass). dhamma-reviewer called it "teacher-review-ready once the Blocker is fixed" with specific praise for the SN 22.101 adze-handling, the rank-architecture discipline in data files, and the MN 21 / MN 36 handling.

4. **The two lenses most aligned with each other**: security-reviewer + dsgvo-lawyer both converged on shared-device residue + consent-gate documentation. These are the "data protection in practice" lenses and they complement well.

5. **The two most Adze-specific lenses**: game-designer + dhamma-reviewer. Every other lens would generalize to any E2E-encrypted web app. These two are the ones that earn their place specifically because of what Adze is.

6. **Tuning suggestions for next fleet run**:
   - Game-designer's `mahapajapati.teamScoreMultiplier` finding is an anti-pattern that didn't make it into the `.claude/agents/game-designer.md` anti-pattern list. Add it: "**Concern**: mechanics that reward one party for another's suffering, even at single-household scale — pre-empt at the design time before Sangha ships."
   - Copy-storyteller found the inline-English-bypassing-i18n pattern — this should be a first-class concern in its agent definition ("Check: does the code consume the en.json key, or is it inline?").
   - Dhamma-reviewer's rank-announcement blocker was possible only because the reviewer systematically walked every surface that surfaces a rank. Add to the agent def: "When ranks change, verify every user-facing surface mentions them."

---

## Per-agent reports (verbatim)

### dsgvo-lawyer

> Controller: Dirk Sauerstein, Bischofstr. 2 A, 04179 Leipzig.
> Scope: pre-public-launch audit of the files enumerated in the brief. Sangha (parked) out of scope.
> Register: Bavarian-auditor strict. If the Sächsischer Datenschutz- und Transparenzbeauftragter opened the site tomorrow, would they file a Verwaltungsakt? Each finding answers that question.

**Full report archived verbatim.** Key findings:
- **Blocker**: Track A5 DPA evidence archive. Art. 28 Abs. 3 — without AVVs on file, every transfer is rechtswidrig.
- **Important**: Retention-claim-vs-cron mismatch (Art. 5 + 13); recipient list omits Cloudflare Email Routing + Proton AG (Art. 13 lit. e); feedback mailto Privacy-by-Default (Art. 25 Abs. 2); Terms § 4 vs consent age mismatch (Art. 8); German translation needed (Art. 12 Abs. 1); incident-response self-flags (Art. 32, 33); consent wording + Kenntnisnahme timestamp (Art. 7 Abs. 2).
- **Nits**: retention criteria phrasing; Impressum phone-number; USt-ID future checklist; feedback lawful-basis Art. 6 (1) a → (1) f; DSR second-factor scoping; HSTS preload; CSP 'unsafe-*' (accepted tradeoff).

**Verdict**: *"Not shippable — the A5 DPA Blocker must land before public signups. Architecture is upper-quartile for solo-maintainer EU operation."*

### senior-engineer

> The load-order discipline is intact... one architectural concern surfaces: **ADR-7 is cited repeatedly but is not actually written in `docs/DECISIONS.md`**. Reviewers are being asked to enforce a rule that has no canonical definition.

**Full report archived verbatim.** Key findings:
- **Blocker ×3**: `saveState()` no flush-on-unload; `authDoPassphraseUnlock` overwrites local edits; `passphrasePushState` no optimistic concurrency (two tabs silently overwrite).
- **Important**: ADR-7 missing from DECISIONS.md; migration #1 not idempotent; `enforce_beta_allowlist` search_path; `loadState` no retry; `_live-diag.spec.js` tests a button that doesn't render in closed beta; `authVerifyMagicCode` 4-type retry loop; CSP vs SW pass-through asymmetry; hardcoded `SUTTA_FILES` list; migrateState pile of `_migrated*` flags.
- **Nits**: stale ROADMAP backlog item; `err.stack` Safari quirk already handled.

**Verdict**: *"Ship with fixes. Resolve issues #1, #2, #3, and #11 (ADR-7) before opening public signup. Core architecture is sound; scar-tissue discipline is paying off. Blockers are all in the sync lifecycle."*

### security-reviewer

> Reviewed the full client-stack + server-stack at de7beb0. The threat model covers: malicious authenticated client, stolen JWT, RLS regression, XSS regression, service-role key leakage, crypto primitive misuse, side-channel via error messages, prototype pollution in import, CSRF via Edge Function.

**Full report archived verbatim.** Key findings:
- **Medium ×2**: `authSignOut` plaintext residue in localStorage (shared-device leak); allowlist-error email-enumeration oracle.
- **Low-Nits**: `passphraseUnlock` error conflation; CORS allowlist includes `localhost:8000` in prod; CSP `connect-src` wildcard `*.supabase.co`; import structural validation thin; `setCustomBell` decode-check timing; `enforce_beta_allowlist` search_path = public; feedback-builder mailto construction (verified safe).

**What's good** (quoted): *"PBKDF2 parameters: 600,000 iterations SHA-256, 16-byte random salt, 32-byte AES-GCM key, 12-byte random IV, non-extractable CryptoKey. This is textbook OWASP-2023 / NIST SP 800-38D... `cleanup_inactive_users`: SECURITY DEFINER, `set search_path = ''`, fully-qualified, revoked from public/anon/authenticated. **This migration is well-done.**"*

**Verdict**: *"Ship with fixes. No Critical or High findings. The cryptographic core and server-side enforcement stack are genuinely well-built."*

### game-designer

> Intrinsic framing is largely intact and — in several specific places — unusually well-protected. The bump/downgrade button symmetry is a near-textbook SDT autonomy move... Where the frame is shifting: the Tisikkhā scoring, the rank/character abilities when considered together, and the 18:00 auto-fire all introduce subtle reporting-rewards that the architecture doesn't fully notice because each piece individually passes the sniff test.

**Full report archived verbatim.** Key findings:
- **Concern ×4**: Tisikkhā scoring rewards reporting volume (hindrance-keyword regex is gameable, self-assigned depth-tier); character abilities create passive use-it-or-lose-it obligation; 18:00 auto-fire is soft but still notification re-engagement; `mahapajapati.teamScoreMultiplier` rewards when team shadow high (inverts brahmavihāra intent, worst at cross-user Sangha scale).
- **Observation ×3**: Nine-rank progression well-protected (residual number-goes-up risk); `markArmyDefeated` confirm dialog is exemplary ("Be honest with yourself — Māra's eighth army is hypocrisy"); saved quotes clean (ship as-is); confirm_habit_done calibration correct.

**Dhamma-consistency concerns**: `spendPanna` commodifies wisdom-currency (category-error analogous to Sangha's "metta is not a like"); `restartQuest` banks 30% XP as "lessons remain" (softens punishment but still an RPG-economy concession).

**Verdict**: *"Ship with alternatives above. Concrete PR-sized items: drop hindrance-keyword bonus; delete/preference-gate `maybeTriggerEveningReflection`; rework `mahapajapati.teamScoreMultiplier` trigger; audit every `spendPanna` call site; convert consumable abilities to condition-triggered floors. The core spine — ranks named as pre-attainment scaffolding, rest-path in evening close, bump/downgrade symmetry, no-streak-flame discipline — is load-bearing and working."*

### ux-reviewer

> The visible design language (parchment + amber/gold, three-column Today, Pāli terms kept, `data-component` hooks) is consistent and well-settled; most of the friction I found is at the seams between flows.

**Full report archived verbatim.** Key findings:
- **Blocker**: 6 × unquoted `placeholder=t('...')` instances across element-feedback.js (2), feedback.js, monthly-reflection.js, main.js (2). Same class as v15.11.5; REVIEW.md flags new instances; escalated because five are in a flow the tester literally named.
- **Important**: oneline-phase diagnostic sliders above textarea; returning-user consent re-show per device; feedback banner no safe-area-inset-top; welcome has no product preview; meditation-timer duration picker no "use last"; confirm_habit_done needs per-habit opt-out; meditation-timer sitting phase no "+5 min" extension.
- **Nits**: bell-row clickable-affordance split; sutta-suggestion on done-phase no "close saved" toast; 17:00 locale assumption; `monthly-reflection.js` hardcoded English inside `t()` branch; pause button tap target too small.

**Notable praise** (quoted): *"v15.13.3 bell-overlap fix is well-implemented... This is a model fix."* and *"The `wellbeingAck` 3-option block at the top of Phase A with the crisis resources is genuinely excellent design: honest, dignified, gives a dignified pause path without moralizing."*

**Verdict**: *"Ship with fixes. The five Important items are coherent as one ticket: 'reduce returning-user friction'. Architecture is sound, contemplative-app theory is visible in the code, bell-overlap fix shows you know how to do proper iOS Safari hardening."*

### copy-storyteller

> The catalog is, on the whole, of-a-piece with the canonical exemplars... Zero instances of "awesome," "great job," "crushed it," or "keep going!" in user-facing copy. This is some of the best-tuned app copy I've read — when it's consumed.

**Full report archived verbatim.** Key findings:
- **Blocker**: `tisikkha-explainer.js:12` `const t = mid ? ...` shadows global `t()` — entire modal renders an exception at runtime.
- **Important — inline-English leaks**: teaching-detail.js (4 hindrances + 4 foundations + 3 subtitles + duplicate JS-key bug), rules-card.js (10 bullets), rank-intro.js (3 paragraphs — the weightiest first-introduction surface), rank-announcement.js (2 floor-teachings + 3 labels), setback-recovery.js (2 question bullets), liberation-offer.js (3 bullets), defeat.js (3 keep_* bullets), struggle-suggestion.js (2 framings), evening-reflection.js ("Want to write a response?"), shadow-explainer.js (2), pause-quest.js button/heading reuse, first-guidance.js fallback; welcome.js (4+ strings); settings.js (Account/sync, delete zone, beta-guide tile, bell zone); auth.js (**973 lines, zero `t()` calls**, including DSGVO consent gate).
- **Important — voice register**: auth.js strings are transactional but acceptable; beta-guide uses first-person "— Dirk" maintainer voice — undeclared register.
- **Important — Pāli**: metta/mettā inconsistent in 6+ places (adjacent keys in metta.json differ); paññā capitalization drift; Sakadāgāmi/sakadāgāmī final-vowel variation.
- **Nits**: `setup.welcome.honesty_body` too-long single paragraph; `setup.rec.adjust.tail` redundant; `wisdom.library.expanded_note` word "gatekept" reads platform-speak; `today.bump.body` "grow a little" softens precision; pause-quest.js button label semantic-key reuse.

**Canonical exemplars verified shipping**: `confirm_habit_done.body`, `timer_prompt.flavor_line`, `evening_close.oneline.footer_hint`, `welcome.signin_hint` — all 4 render correctly.

**Verdict**: *"Ship with suggested rewrites. The writing itself is strong — arguably stronger than most apps in this category. No tone reset needed. The voice is the asset; the wiring is what needs the work."*

### dhamma-reviewer

> Adze is, at its skeleton, genuinely Theravāda-anchored... However, there is a tension at the edges: the quote catalog bolts Thich Nhat Hanh and HH the Dalai Lama into the daily-teaching rotation without any framing of lineage difference.

**Full report archived verbatim.** Key findings:
- **Blocker**: `rank_announcement.floor_teaching_5_6` through `_8_9` + `rank-announcement.js:38` hardcoded — declare canonical attainment (stream-entry, once-returner, non-returner, arahant) without scaffolding framing. Exact failure mode the rank architecture was engineered to prevent. Fix pattern exists in `path-ranks.json` note fields and `rank_intro.body_3` — copy that discipline.
- **Important — Pāli**: Karanīya → Karaṇīya (Snp 1.8, en.json:991); Pali → Pāli user-facing (liberation.js:110 etc.); metta → mettā UI consistency (6+ places).
- **Important — citations**: AN 8.1 → AN 11.15/11.16 (eleven benefits of mettā — metta tutorial); MN 26 (closing) → MN 70 / AN 2.5 (the Bodhi-tree vow — wisdom scroll w9); SN 22.45 wisdom-as-acala citation misattributed (likely SN 48).
- **Important — rank usage**: `main.js:665` tooltip "The end goal — Arahant — is Rank 9" contradicts path-ranks.json rank 9 (Pariyosāna) explicit scaffolding disclaimer.
- **Important — cross-tradition**: 6 of 27 quotes from non-Theravāda lineages (4 Thich Nhat Hanh Plum Village Zen, 3 Dalai Lama Gelug Vajrayāna) with no lineage-tag in schema. Either add `tradition` field or restrict default rotation.
- **Important — translation**: Dalai Lama quotes weakly sourced (interview-era; not primary teaching texts).
- **Nits**: Mahā Kassapa vs Mahākassapa spacing; bell preset named `goenka` (teacher-as-key); Dhamma Sukha single-teacher endorsement in liberation.js teacher-list; meditation.json ending attributes phrasing to "Tibetan teachers" in a Theravāda tutorial.

**Notable praise** (quoted): *"The SN 22.101 adze-simile handling in wisdom scroll w_prologue is teacher-caliber writing... The Padhāna Sutta ten armies rendering matches the canonical list faithfully. Excellent."* and *"The path-ranks.json rank 9 note — 'The canonical language for complete liberation — arahatta — is used nowhere as the rank name, because no app can claim that territory.' — Exemplary."*

**Verdict**: *"Ship with Pāli/citation fixes. Would survive a living Theravāda teacher's review once the rank-announcement Blocker is fixed and the MN 26 / AN 8.1 / SN 22.45 citations are corrected. The engineering intent of the rank architecture is exactly what a senior bhikkhu would want. Would NOT recommend teacher-consultation-before-shipping — the architecture is teacher-review-ready once the Blocker is fixed."*

---

## Verification / post-fix testing plan

After each Blocker lands, the fleet should re-review the changed surface:

| Blocker | Post-fix re-review |
|---|---|
| A5 DPA archive | dsgvo-lawyer checks TIA + DPAs match processors named in VVT |
| 6 placeholder bugs | ux-reviewer on-device check (iPhone Safari) |
| Sync-lifecycle trio | senior-engineer + security-reviewer (concurrency testing, data-loss scenarios) |
| Rank-announcement fix | dhamma-reviewer (scaffolding-pattern fidelity) + copy-storyteller (tonal match) |
| tisikkha-explainer shadow | copy-storyteller (render verification) |
| ADR-7 written | senior-engineer confirms text matches the projection rule |
| authSignOut residue | security-reviewer + dsgvo-lawyer (both originally flagged) |

Before `ADZE_PUBLIC_SIGNUP_ENABLED=true`, run the full fleet one more time on the then-current diff (`/ultrareview` plus the agent fleet in parallel).

---

## Appendix — cross-checks that would add confidence

These disputed or adjacent findings would benefit from a second-opinion pass, not performed in this run:

1. game-designer's "tisikkhā scoring rewards reporting" → ask dhamma-reviewer: does this also violate the traditional framing of the three trainings?
2. game-designer's "18:00 auto-fire is still a notification" → ask ux-reviewer: is the 17:00 passive tile actually sufficient alone?
3. security-reviewer's "allowlist email-enumeration" → ask dsgvo-lawyer: lawful even with the generic-message fix, or does it still leak too much?
4. senior-engineer's "passphrase-unlock overwrites local edits" → ask security-reviewer: does the fix have any crypto implications (e.g. merging an unsigned delta)?
5. copy-storyteller's "auth.js as an undeclared register" + dhamma-reviewer's "cross-tradition quotes unframed" → ask all-three-content-agents: should a `register` or `tradition` tag be a first-class schema field?

These are optional follow-ups. The consolidated action list above is the complete tonight-actionable set.
