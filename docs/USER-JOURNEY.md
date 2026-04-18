# User journey · the first 30 days

What a beta tester's experience looks like, hour by hour and day by day, and what each milestone is *designed to make them feel*. The whole engine — recommendation, content selection, retention — should aim at these moments.

If a milestone below has no defined "magic moment," that's a gap. Fill it before the moment passes silently.

---

## Day 1 — invite click → first sit

**Target:** ≤ 5 minutes from email click to first 5-minute sit completed.

| Step | Time | Magic moment |
| --- | --- | --- |
| Click invite link | 0:00 | "It's actually pretty." (visual hits before any friction) |
| Set password | +0:30 | "OK, this is real. Two secrets, fine." |
| Set encryption passphrase | +1:00 | "They mean it about privacy. Even *they* can't read this." |
| Onboarding intro | +1:30 | "This isn't going to talk down to me." |
| Phase A wellbeing + diagnostic | +2:30 | "Nobody asked me this before." |
| Phase B beginner / experienced | +3:30 | "These chips name things I've felt." |
| Phase C one-question-per-step | +4:30 | "Slow on purpose. I appreciate that." |
| Recommendation card | +5:00 | "It saw me. It's not a generic plan." |
| First sit | +5:30 → +10:30 | "The bell is warm. The 5 minutes are honest. I can do this." |
| First reflection | +10:45 | "The question is specific to what just happened." |
| Beta guide modal (one-time) | +11:00 | "Now I see what to expect — and how to talk back." |

**Single highest-impact tuning target:** the post-sit reflection prompt. If it's generic ("How was your sit?"), the magic vanishes. It should reference what was just chosen — the focus, the duration, the time of day.

**Drop-off risk:** if anything between +1:00 and +5:00 errors, the tester won't return. The v15.1.1 chip-array crash was exactly this — the test for it should run on every PR.

---

## Day 2–6 — the thread

**Target:** 5 of the next 6 days, the tester completes a sit. (≥ 80% adherence in the first week is the strongest predictor of 30-day retention in habit research.)

Each day is ~2 minutes total: open the app → tap the morning sit → 5-minute timer → one-line reflection. That's it.

**Magic moment:** by day 4, the tester notices that the daily question subtly changes based on what they're surfacing. Not random; not predictable; *responsive.*

**Failure mode:** the daily question pool feels recycled. Fix by ensuring the question rotation honors the diagnostic + chip flags + recent reflection content, not just a round-robin.

**Recovery hook:** after 24 hours without a sit, the app shows (on next open) a single line: *"Two minutes is a complete sit."* No nag, no streak warning, no manipulation.

---

## Day 7 — first weekly summary

**Target:** the tester opens the app on day 7, sees a synthesis of their week.

**Magic moment:** "Huh — I didn't realize I sat 4 mornings out of 7. That's actually a lot." The summary names patterns honestly: which factors moved, what the tester named in reflections, what's emerging. **Avoid** rankings, percentages, or comparison to other practitioners. The framing is *internal*, not competitive.

**Content unlock (if story mode):** the first sutta from the curriculum surfaces. The framing is gentle: *"This is the one many practitioners begin with. Read it on a calm screen, not in a hurry."*

**Failure mode:** the weekly summary feels like a stats dashboard. It should feel like a teacher noticing things on your behalf.

---

## Day 8–14 — deepening or quitting

This is the make-or-break window. Two things happen:

1. The novelty has worn off. The app needs to *earn* opening every day.
2. A tester who's been showing up will start wanting *more* — depth, longer sits, harder questions.

**Magic moment (around day 10):** the recommendation card subtly shifts. "Based on what you've named in reflections, this week try…" — and the suggestion is grounded in what they actually wrote, not a calendar-driven prompt.

**Failure mode (around day 12):** the app suggests the same content tier all week. Tester feels they're plateauing.

**Drop-off recovery:** at day 14 with no activity, send *one* email: *"The thread is here. Pick it up wherever you can. No streaks to repair."* No second email. Don't pursue.

---

## Day 14 — first "graduation"

**Target:** the tester reaches a small milestone — a rank advance, a character ability unlocking, a sutta mastery, *something* that says "you're not a beginner anymore."

**Magic moment:** the app names the change in language that respects the practitioner. **Not** "Level up! +50 XP!" — that's casino. Try *"Two weeks of practice. The first floor of the path is steady under you. There's a quiet shift the sangha would notice."*

**Failure mode:** the unlock feels arbitrary. Fix by tying it to *behavior* (5+ days of sits) rather than calendar (it's been 14 days regardless).

---

## Day 15–28 — the integration

Daily flow stabilizes. Sits get marginally longer if the diagnostic supports it. The tester starts treating Adze as a *companion* rather than a *novelty*.

**What the app should be doing in the background:**

- Adapting question difficulty based on reflection depth.
- Surfacing suttas at the user's rank, not above.
- Quietly tracking which prompts get genuine answers vs. "fine" / "ok" — a signal that the question wasn't landing.
- Detecting if a tester is using the app *less* even though they show up — opening but not sitting. That's a different drop-off pattern; treat differently from absence.

**Magic moment (around day 21):** the tester notices that a teaching surfaced today *exactly* addresses what they reflected on yesterday. That's the chip-flag → content connection working as designed.

---

## Day 28–30 — first monthly reflection

**Target:** the tester completes a longer reflection ritual. ~15 minutes.

**Magic moment:** the app reflects back to them what *they* have been writing — not analytics, but actual phrases. "You mentioned 'restless' six times this month. The third week you started writing 'softening' instead. Worth noticing."

**Permission to slow down:** for testers who've been intense, the monthly screen explicitly offers *"You can slow the pace if it would serve."* The app's job is not to maximize sit-minutes; it's to support practice.

**Failure mode:** the monthly ritual feels like the weekly summary, just longer. Should feel qualitatively different — closer to a sit-with-a-teacher than a check-in.

---

## What success looks like (ship-defining)

A tester who, on day 30:

- Has sat at least 20 of the 30 days.
- Has reported at least one piece of feedback through the FAB.
- Can name one thing the app *helped them notice* about their practice.
- Says — when asked directly — "I'd be sad if this disappeared."

If three out of five of your testers reach all four by day 30, the closed beta is working.

---

## What this document is *not*

This is the design intent. It's not a feature list, it's not a release plan, it's not a promise to testers. The engine + content together either produce these moments or they don't. When they don't, this doc is the place to come back and ask "where did the magic moment fail to land — and which engine input was wrong?"
