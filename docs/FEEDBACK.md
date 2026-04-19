# Beta Feedback Log

Running log of beta tester feedback. Append-only, reverse-chronological within each section. Meant to scale to ~30 entries; migrate to GitHub Issues or a proper tool if volume outgrows a single markdown file.

## How to add an entry

1. Feedback arrives at `feedback@adze.life` (from the in-app 💬 button) or `hello@adze.life` (direct email).
2. Cloudflare Email Routing forwards it to your ProtonMail inbox.
3. Copy the relevant bits into `## Open` below, as a new dated entry.
4. Tag the entry with one or more labels. Tags come first so a terminal-wide grep (`grep '\[bug\]' docs/FEEDBACK.md`) gives you an instant filtered view.

### Tags

| Tag               | Meaning                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `[bug]`           | Something's broken — visible regression or error                        |
| `[ux]`            | Works, but feels wrong / confusing / slow                               |
| `[feature]`       | Request for something new                                               |
| `[copy]`          | Wording / tone / clarity issue in user-facing text                      |
| `[perf]`          | Performance: slow load, slow render, laggy interaction                  |
| `[content]`       | Sutta / teaching / quote content issue (missing, misattributed, etc.)   |
| `[crisis-safety]` | **Priority tag.** Anything relating to wellbeing-acknowledgment flow, crisis messaging, boundaries of what the app should or shouldn't do. Always address within 48h. |
| `[accessibility]` | Screen reader, keyboard nav, color contrast, font size, reduced motion  |

## Prioritization signals

- **Recurrence:** If three different testers report the same thing, it's a real signal — promote to "Next up" at the top of Open.
- **Severity:** Crash > data-loss risk > broken feature > confusing UX > cosmetic > nitpick.
- **Tester weight:** First-time users see friction the veteran can't. Weight their reports slightly higher for the first two weeks.

## Entry template

```
### YYYY-MM-DD · [tag] · Short title
**Reporter:** First name or initials (honor their privacy — never paste their email).
**Screen / path:** Where in the app.
**What they said:** Exact quote or paraphrase. Keep their words when you can.
**Your interpretation:** One line of what you think the real issue is.
**Next step:** Concrete action, or "waiting on clarification".
```

Once the issue is addressed, move the entry to `## Addressed` with a commit reference or explanation.

---

## Next up

*(Top 1–3 items you'll tackle in the next working session. Promoted from Open when a pattern emerges or a severity demands it.)*

- **Tap-to-complete habit confirmation** — today a single click on a habit card (morning sit, evening sit, etc.) marks it done with zero feedback. Replace with either (a) a confirmation popup "Start sit?" / "Mark this sit as done?" or (b) tap-and-hold to toggle. See 2026-04-19 `[ux]` entry below.
- **Quote save / collection** — "A word from the Buddha" card has no way to save a quote that resonates. Users want a bookmark action + a "saved quotes" screen to revisit or print. See 2026-04-19 entry.
- **Annotate setup-flow elements with `data-component`** — curated paths for element-feedback reports beat derived DOM paths. One pass through render/setup.js + render/diagnostic.js.
- **Audit Phase B / Phase C selects for more missing-re-render bugs** (same class as `currentEdge`).
- **Cross-user Sangha feature** — bond with other practitioners, profile cards with per-field opt-in sharing, metta/quote/nudge actions, champion abilities across bonds. Full design written in [`docs/SANGHA-DESIGN.md`](SANGHA-DESIGN.md). Stage-4 work; 4 implementation stages so we can ship in pieces.

---

## Open

*(Chronological, newest at top.)*

### 2026-04-19 · [bug] Setup summary names a worry the user did not select

**Reporter:** Li May
**Screen / path:** Setup → first-time assessment → recommendation summary card → green-bordered "beginnerCare" panel.
**What they said:** After completing the assessment, the summary's reassurance block led with content about *not stopping thoughts* — which she had not selected as a concern. She had picked two other chips (e.g. time-commitment, missing-days) and not the "thoughts won't stop" chip. She tried to flag it via the in-app feedback element-picker but the summary elements weren't pickable (separate `[ux]` issue — Annotate setup-flow elements with `data-component`, see Next up).
**Your interpretation:** Real engine bug, traced to `src/engine/diagnostic.js:315` (concerns block) and the parallel `:291` (physical block). The intro sentence is hardcoded — *"What you named is common. Thoughts do not stop — they are what the mind does…"* — and fires whenever **any** `concerns` chip is selected, treating every chip selection as if it were the `thoughts_stop` chip. Same anti-pattern in physicalConcerns ("…keep the pain manageable…" appears even if the user only ticked `sleep_energy`). Tests at `tests/unit/engine-diagnostic.test.js:126–182` only assert truthiness, not semantic match — that's the test gap.
**Reproduction:** Setup → Phase A (energy=5, experience="none", dominantHindrance="restless") → Phase B → tick `concerns: time_commit + missing_days` only → finish Phase C → summary's reassurance block leads with the thoughts-not-stopping paragraph.
**Fix sketch:** Replace the hardcoded chip-naming intro with a generic chip-agnostic opener; the targeted bold lines that follow already carry the specific content driven by `chipInterp.flags`. ~3-line diff. Add 6 tests asserting the intro NEVER references a keyword absent from selections. Blast radius: zero (existing tests use `.toBeTruthy()`, none assert intro text).
**Adjacent risks found:** (a) Phase C sliders missing `sloth` even though Phase A allows it as `dominantHindrance`; (b) `hopes: ['hindrance']` is collected but unused; (c) `dominant_hindrance` snake_case vs camelCase fragility between `setup-flow.js:706` write and `hindrances.js:53` read.
**Status:** FIXED in v15.12.1. Three-line copy change in `src/engine/diagnostic.js:291` and `:315` (intros now chip-agnostic; bold lines below unchanged). Added 6 vitest cases under `beginnerCare intro must not name an unselected chip` — guards against regression. The 3 adjacent risks remain logged here for later attention (not blockers).

### 2026-04-19 · [bug] Add-custom-habit placeholder shows `t('add_habit.name_placeholder')` literally

**Reporter:** Dirk
**Screen / path:** Settings → Habit config → Add Custom Habit modal.
**What they said:** Screenshot shows the Name input placeholder rendered as the literal string `t('add_habit.name_placeholder')` rather than "e.g. Read 20 minutes".
**Your interpretation:** `src/modals/add-habit.js:14` had `placeholder=t('add_habit.name_placeholder')` (no `${}` wrap, no quotes). Template literal never interpolated; browser read the literal text as an unquoted HTML attribute value. Fixed.
**Status:** FIXED in v15.11.5.

### 2026-04-19 · [ux] Add-custom-habit modal is generic — no sutta-based habit suggestions

**Reporter:** Dirk
**Screen / path:** Habit Manager → Add Custom Habit.
**What they said:** "it needs a total makeover, just give some clickable meaningful based on suttas habits, either key stone as recommendation or supportive, but this interface is not great."
**Your interpretation:** The modal asks the user to compose a habit from scratch (name + emoji + points + who + keystone flag). For practitioners who don't know what habits to track, this is a blank slate. The modal should lead with a curated set of sutta-backed habits (daily metta, five-precept review, walking meditation, journaling for X minutes, etc.) — one-tap add, with a "Custom" option kept at the bottom for power users.
**Status:** OPEN. Scope: bigger — design + content work. Needs a short habit catalog (~12–18 items, tagged keystone vs. supportive, each with a sutta reference). Then UI becomes a scrollable list of pre-made habits with quick-add buttons.

### 2026-04-19 · [ux] Tap on "add as a habit in settings" link jumps to Habit Manager but context is lost

**Reporter:** Dirk
**Screen / path:** Today tab → Meditation column → "Metta (loving-kindness)" or "Walking meditation" → "add as a habit in settings" link.
**What they said:** "if I press on for example metta to add as a habit, I jump into habit manager, but there is no metta anymore to just add it, and why do I jump there anyway?"
**Your interpretation:** The link is a navigation-without-payload — it changes tab but doesn't carry the specific habit the user wanted. Should either (a) add the habit inline with a confirm toast and stay on Today, or (b) jump to Habit Manager with the Add-Habit modal pre-filled for that specific habit.
**Status:** OPEN. Depends on the habit-catalog work above (so the jump lands on a specific item, not a blank form).

### 2026-04-19 · [ux] One-click habit completion with no confirmation

**Reporter:** Dirk
**Screen / path:** Today → Meditation / Reading / Reflection cards — tap a habit (e.g. Morning sit).
**What they said:** "I can still click with one mouse click on e.g. morning sit or evening sit and the task is just done. I wanted either a popup with the question, if I like to start the task, or if I like to confirm that I sat?"
**Your interpretation:** The tap goes straight to done-state with no intermediate step. For a meditation app specifically, this breaks the mindful moment — the user should confirm they're starting or that they've sat, not fire-and-forget. Options:
  - (a) Tap a meditation habit → opens the sit-timer modal (ritual: commit to the duration, press Start). Completion via timer end (not tap).
  - (b) Tap any habit → small confirmation sheet slides up: "Mark [habit] as done?" with Yes / Cancel.
  - (c) Long-press / swipe to complete.
**Your preference:** (a) for meditation habits (makes the timer the primary affordance); (b) for non-meditation habits (journaling, reading, etc.). This matches the spirit of Adze better than streak-app one-tap-done.
**Status:** OPEN. Promoted to Next up.

### 2026-04-19 · [ux] "One-line journal" vs "Evening close" — are they redundant?

**Reporter:** Dirk
**Screen / path:** Today → Reflection column — two items: "One-line journal · a single sentence about today" and "Evening close · two questions, then go as deep as you have energy for".
**What they said:** "Two things one-line journal and evening close, what the real difference, is this not too much? can this be together as one?"
**Your interpretation:** They ARE different in intent — one-liner = 30-second capture any time of day; evening close = structured end-of-day ritual. But to a new user staring at the Today screen, "two things to write" reads as redundant overhead. Design options:
  - Keep both but visually subordinate one-liner under Evening close (progressive disclosure).
  - Merge: Evening close includes a "what would you keep as one line?" field at the end.
  - Remove one-liner entirely; make Evening close the only daily reflection.
**Status:** OPEN. Game-design decision — worth discussing with you (Dirk) before code change. My instinct: merge, with the one-liner being the *first* prompt inside Evening close, so casual users do just that line and bail; invested users go deeper with the additional questions.

### 2026-04-19 · [ux] [feature] Quote save / collection — let players keep quotes that resonate

**Reporter:** Dirk
**Screen / path:** Today → "A word from the Buddha" card (top right).
**What they said:** "the quotes have no option of saving the quotes as I wanted long ago. I should have the option as a player to save the one who really caught me, and later to collect them and print them out, or re-read them in the game."
**Your interpretation:** Add a 🔖 / ⭐ save button on the quote card. Saved quotes live in `state.savedQuotes = [{ id, text, source, savedAt }]`. New screen (Wisdom tab or under Codex) shows the collection with actions: re-read, copy, print/export (e.g. nicely-formatted HTML or plain text).
**Status:** OPEN. Promoted to Next up. S-effort — small feature, high emotional value for the practitioner journey.

### 2026-04-19 · [ux] "The Codex" — users don't know what it is

**Reporter:** Dirk
**Screen / path:** Wisdom tab — "📜 The Codex — collected teachings" heading.
**What they said:** "What is actually the function now of the codex? As a user I would not understand what it is. Even I don't know… double check the meaning."
**Your interpretation:** The codex heading is jargon for the app (a game-y word for an internal concept). For practitioners not already fluent in the game's vocabulary, "Codex" is opaque. Options:
  - Rename to "Collected teachings" (drop the codex word entirely).
  - Keep the codex framing but add a one-line explanation: "📜 Your Codex — teachings you've encountered this quest".
  - Merge with the quote-collection feature above — Codex = everything the practitioner has touched + bookmarked.
**Status:** OPEN. Needs one-line clarity pass. Could also subsume the quote-save feature (Codex becomes the repository).

### 2026-04-19 · [ux] [bug] Setup Phase B select options give no visual feedback on tap

**Reporter:** Dirk (maintainer, testing as a beta user)
**Screen / path:** Setup → Phase B (experienced branch) → "Where is the edge of your practice right now?" (`currentEdge` select).
**What they said:** "I don't any feedback from the interface, if i selected something. I reported that bug quite a while ago, not sure why it is not fixed."
**Your interpretation:** v15.11.4 hotfix — `setDiagnosticB` had a hardcoded `selectKeys` list that triggered the re-render; `currentEdge` was missing. State updated in memory but UI never re-painted. Fixed by deriving the list dynamically from `__ASSESSMENT` so new select questions in `assessment.json` don't require a mirrored code change.
**Status:** FIXED in v15.11.4. Audit other Phase B / Phase C selects for the same pattern (promoted to Next up).

---

## Addressed

*(When a report is fixed/shipped, move it here with a one-line resolution and a commit SHA if applicable.)*

*(empty — no beta reports yet)*

---

## Wontfix / won't-do

*(Entries that were considered and deliberately rejected. Keeping them here avoids relitigating.)*

*(empty)*
