# Chip taxonomy & diagnostic interpretation

How Adze turns the user's multiple-choice answers in Phase 2 of the setup flow into signals that shape the rest of their practice experience.

This document is written to be read by a non-programmer — a dhamma teacher, a sangha member, a careful beta tester — who wants to judge whether the system's assumptions are *skillful*. If any mapping below feels wrong to you, it is a small edit away. Nothing here is load-bearing theology, and everything is deterministic: no machine-learned "intuition", just a table of chip → dimension mappings that you can read, agree with, or rewrite.

## Why chips at all?

A blank text field asks too much of a beginner. "What has stopped a daily practice before?" is a real, tender question — sometimes people genuinely don't know the answer, or the answer is so close to them that they can't name it yet. A chip — **"I fell off after missing a day"** — is easier to recognize than to generate. Recognition is the gentler cognitive act.

More practically: chips produce **structured** data. Free text can only be *stored*; chips can be *acted on*. When the engine knows a user chose "Falling asleep during practice", it can weight their later sloth-and-torpor diagnostic higher, which changes which suttas get surfaced first, which teaching quotes appear on their home screen, and which habit suggestions bubble up. Free text cannot do any of that without sending the text somewhere a person or a model can read it — which Adze explicitly refuses to do (see `docs/DECISIONS.md` ADR-3).

## The diagnostic dimensions (glossary)

These are the factor keys the engine already tracks from the onboarding diagnostic. They come from the five hindrances in early Buddhist teaching, plus practical habit-science dimensions.

| Key                 | Traditional framing                         | What a high value means for Adze            |
| ------------------- | ------------------------------------------- | ------------------------------------------- |
| `energy`            | *viriya* — the energetic faculty            | Good. Low value → recommend shorter sits first |
| `sensual`           | *kāmacchanda* — hindrance of sense-desire   | High → recommend content on desire/restraint |
| `illwill`           | *byāpāda* — hindrance of ill-will           | High → recommend metta practices first       |
| `sloth`             | *thīna-middha* — hindrance of sloth-torpor  | High → morning sits, shorter durations, walking alternative |
| `restless`          | *uddhacca-kukkucca* — hindrance of restlessness | High → breath counting, concentration-first practices |
| `doubt`             | *vicikicchā* — hindrance of doubt           | High → teaching content that addresses doubt directly |
| `purpose`           | sense of meaningful direction                | Low → reinforce purpose copy, story mode recommended |
| `sila`              | *sīla* — ethical steadiness                 | Low → gentle re-anchoring                    |
| `mettaWarmth`       | warmth toward others                        | Low → metta curriculum                       |
| `concentration`     | *samādhi* — collectedness                   | Low → breath-practices, reduce distractions  |

Beyond those, the chips introduce a small number of **practical flags** that aren't hindrance dimensions but matter for recommendation:

| Flag                       | Meaning                                                     |
| -------------------------- | ----------------------------------------------------------- |
| `friction.memory`          | User forgets; needs habit-stacking prompts                  |
| `friction.time`            | User is time-pressured; prefer short default sits           |
| `friction.all_or_nothing`  | User abandons after one miss; needs gentler setback copy    |
| `friction.perfectionism`   | Similar — ties streak self-image to self-worth              |
| `posture.back`             | Lower-back issues; suggest chair + lumbar support           |
| `posture.lower_body`       | Knees / hips; suggest chair or lying-down                   |
| `posture.upper_body`       | Shoulders / neck; posture reminder, not alternative posture |
| `posture.general`          | Chronic pain; walking meditation as primary                 |
| `self_image.nervous`       | User carries imposter feeling; reassurance copy             |

Flags do **not** affect hindrance tallies. They affect content selection and recommendation wording.

## Q1 — "What has stopped a daily practice from sticking before?"

The reflective question. Multi-select. Users can pick zero, one, or several.

| Chip (what the user sees)                        | Engine effect                                 | Why this mapping                                                                                                                                |
| ------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Forgetting to do it                              | `friction.memory`                             | Forgetting is almost always a cue-design problem in habit literature (BJ Fogg, James Clear). Not a hindrance. Engine responds with stacking.    |
| No time / busy life                              | `friction.time`                               | Shortens the default recommendation without making the user ask for it.                                                                         |
| Doubted it was working                           | `doubt +1`                                    | Classic *vicikicchā*. The engine already weights sutta recommendations by doubt level — surfacing AN 10.60 and similar.                         |
| Felt dry, boring                                 | `doubt +1`, `sloth +1`                        | In tradition, boredom is often a blend of doubt-about-value and sloth-about-engagement. Two small bumps, not one big one.                       |
| Fell off after missing a day                     | `friction.all_or_nothing`                     | All-or-nothing framing destroys more beginners than any hindrance. Engine later shows gentler setback copy: "one missed day is one missed day." |
| Physical discomfort                              | `posture.general` flag (not a hindrance bump) | Discomfort ≠ *thīna-middha*; it's physiology, not mind-state. Mislabelling it would direct the user wrong.                                      |
| Mind too busy, couldn't settle                   | `restless +1`                                 | *Uddhacca-kukkucca* in one sentence. Engine responds with concentration-forward techniques.                                                     |
| Uncomfortable feelings came up                   | `illwill +1` with tentative emotion flag      | Weak mapping, flagged for review. Strong emotions in sitting are often grief, shame, or ill-will toward self. Metta / loving-kindness is a safe first response either way. |
| Never really started                             | Baseline (no bump, no flag)                   | "Didn't start" is the absence of friction, not its presence. Treat neutrally.                                                                   |
| Other *(free text, 200 char max, never parsed)*  | Stored only                                   | Honest: the engine *does not* understand free text. Kept for the user's own later reflection. Displayed back to them in Settings → Reflections. |

## Q2 — "Any physical concerns to be aware of?"

Practical, not psychological. Multi-select. Affects posture and sometimes duration recommendations.

| Chip                        | Engine effect                      | Why                                                                 |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| Back pain                   | `posture.back`                     | Direct mapping. Engine surfaces chair + back-support variants.      |
| Knees                       | `posture.lower_body`               | Cross-legged floor sitting probably off the table.                  |
| Hips / sciatica             | `posture.lower_body`               | Same remediation as knees.                                          |
| Shoulders / neck            | `posture.upper_body`               | Doesn't change posture choice; adds a "check your shoulders" line.  |
| Chronic / persistent pain   | `posture.general`                  | Walking meditation becomes the *primary* recommendation, not seated.|
| Sleep issues / low energy   | `sloth +1`                         | *This one is a hindrance bump too*, because ongoing low energy affects mind-state. Also biases toward morning sits. |
| Recovering from injury      | Flag only, no remediation change   | Temporary — the engine surfaces a "keep it short until cleared" line and removes the flag if the user later unchecks it. |
| No concerns                 | Baseline                           | Explicit "none" so the user can affirm the question applies to them but has no input. |
| Other *(free text)*         | Stored only                        | Same as Q1.                                                         |

## Q3 — "Anything about starting a practice that makes you nervous or unsure?"

The **imposter** question. Multi-select. More psychological than Q2, more speculative than Q1.

| Chip                                           | Engine effect                  | Why                                                                                        |
| ---------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------ |
| Am I doing it right?                           | `doubt +1`, `self_image.nervous` | Competence doubt. Engine shows first-guidance content early.                               |
| What if my thoughts won't stop?                | `doubt +1`                     | Technique misconception. Surface the teaching that thoughts aren't the enemy.              |
| Falling asleep during practice                 | `sloth +1`                     | Real signal; tradition handles this under *thīna-middha*.                                  |
| Time commitment                                | `friction.time`                | Overlaps Q1; combined flag just means "really prefer short sits".                           |
| Is this religious / am I committing to a path? | `doubt +1`                     | Framing doubt. Engine shows secular-framing copy prominently on the home screen.           |
| Emotions that might come up                    | Flag + `illwill` *tentative*   | Weak, like Q1's "uncomfortable feelings". Flagged; default response is metta content.      |
| Missing days and feeling like a failure        | `friction.perfectionism`       | Same remediation family as Q1's all-or-nothing. Setback copy + permission to miss.         |
| Not being "spiritual enough"                   | `self_image.nervous`           | Reassurance copy: this practice is not about spiritual performance.                        |
| None really                                    | Baseline                       |                                                                                            |
| Other *(free text)*                            | Stored only                    |                                                                                            |

## Magnitude and stacking

When the same dimension is bumped from multiple chips, bumps stack but are capped.

- Each chip contributes **+1** to its dimension (never more).
- Total contribution from chips to any single dimension is capped at **+3** per onboarding session, so a user who ticks every doubt-related chip doesn't end up pegged at max doubt when the phase-A diagnostic hasn't even run yet. The onboarding diagnostic is always the primary input; chips nudge, they don't dominate.
- Flags (`friction.*`, `posture.*`, `self_image.*`) are boolean — either set or not. Multiple chips that imply the same flag set it once.

## Where the math actually happens

Two files, both plain JavaScript, both readable:

1. `src/systems/chip-interpretation.js` (to be added) — a single exported object that maps chip IDs to `{ factors: {...}, flags: [...] }` tuples. Edit this file to change any mapping above. **No other file needs to change.**
2. `src/systems/diagnostics.js` (existing) — the `applyChipSelections(selectedChipIds)` function reads the mapping and applies the bumps to `state.diagnostics.onboarding.*` and `state.chipFlags`. Called once at the end of Phase 2, not on every chip click.

The chip labels themselves live in `src/content/strings/en.json` under `setup.phase2.q1.chip_*` keys, so translations don't have to touch code.

## How to tell if a mapping is wrong

Three signs we should revisit this doc:
1. A tester completes onboarding and the recommendations feel *misaligned* — e.g., they picked "uncomfortable feelings came up" and got surfaced ill-will content when they really meant grief. That means the mapping for that chip is too confident and should probably be a flag only, no dimension bump.
2. A teacher reads this document and winces at one of the mappings (especially for the tentative ones — "uncomfortable feelings", "emotions that might come up"). Their instinct is stronger than mine here.
3. The `chipFlags` in a user's state accumulate but no content ever references them. That means the engine is reading the flag but never doing anything with it — either delete the flag or wire up real content.

## Honest caveats

- **I am not a teacher.** The three "tentative" mappings above (emotion-related) are the weakest; a sangha member's review will improve them significantly.
- **Western psychology leaks in.** "Perfectionism", "imposter feeling", and "all-or-nothing thinking" are Western habit-and-CBT vocabulary. They describe real states that practitioners experience, but framing them in that vocabulary may miss how the dhamma addresses them. Worth a second pass with someone more grounded in tradition.
- **This is v1.** The goal is to be useful quickly for a small circle of testers, not to produce a perfect diagnostic model on day one. Mappings can and should evolve.
