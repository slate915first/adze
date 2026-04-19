# Agent reference — Adze review fleet

Your human reference for the review agents defined in `.claude/agents/*.md`. Each agent is a review lens with its own expertise, register, and scope. Claude Code auto-loads them; you don't install anything.

## How to invoke

**1. Implicit (recommended default).** Just describe what you want reviewed in plain language. Claude picks the matching agent from the `description` in its frontmatter.

> *"Dhamma-check the new rank copy before I commit."*
> → invokes `dhamma-reviewer`.

> *"Is the pg_cron function safe against privilege escalation?"*
> → invokes `security-reviewer`.

> *"Does this reflection flow have stuck-in-modal risk?"*
> → invokes `ux-reviewer`.

**2. Explicit.** Name the agent directly when you want a specific lens.

> *"Run the game-designer agent on the new quest-completion modal."*

**3. Parallel.** Ask for multiple lenses at once; Claude fan-outs them.

> *"Have the dsgvo-lawyer and dhamma-reviewer both look at the new Datenschutzerklärung — I want the legal read and the teaching-accuracy read."*

**Important**: agents are **read-only**. They produce findings and suggestions; Claude (the main assistant) does the actual edits + commits after you review the findings.

## Not the same as slash commands

- `/ultrareview`, `/review`, `/security-review` — **slash commands**, typed with `/`, run as native Claude Code features, compare against main branch.
- The agents below — **persona invocations** via the Task tool, ride along inside a normal conversation, no `/` prefix.

You can do both. Use `/ultrareview` for branch-level comprehensive review (expects a feature branch with uncommitted / unmerged diff); use these agents for targeted lens reviews on anything — committed, uncommitted, just a file, just a paragraph of copy.

## The fleet (as of 2026-04-19)

### Tier 1 — general-purpose reviewers

| Agent | When to use | Register | Primary outputs |
|---|---|---|---|
| **`dsgvo-lawyer`** | New personal-data processing, consent flows, retention changes, legal-text modals, processor additions, user-rights handling | Bavarian-auditor strict; cites DSGVO/BDSG/TDDDG articles | Findings list with article cites + severity + required fix |
| **`senior-engineer`** | Architecture, migrations, cross-file refactors, new systems, performance, rollout + rollback plans | Staff/principal-engineer; pattern-matches against project ADRs | Fit-with-architecture read + issue list + rollout paragraph + missing-coverage flags |
| **`security-reviewer`** | Auth flows, crypto handling, RLS, Edge Functions, CSP, secrets, input validation | AppSec-reviewer; threat-modeled (malicious client / stolen JWT / RLS regression) | Threat-model read + findings with attack vector + impact |
| **`game-designer`** | Rank progression, abilities, quests, habit-completion, streaks, notifications — anything that shapes practitioner behaviour over weeks | SDT-literate; anti-wellness-app-anti-patterns | Motivational read + anti-pattern list + dhamma-consistency read |
| **`ux-reviewer`** | Any modal / flow / tile / form / notification change | Mobile-first iOS-Safari-aware interaction designer | Friction audit (low-stakes / high-stakes) + first-time vs returning paths + iOS Safari risks |
| **`copy-storyteller`** | Any new or changed string in `en.json` or inline UI text | Theravāda-adjacent content designer; "wise friend who reads the suttas" voice | Tonal read + per-string rewrites + Pāli diacritics audit |

### Tier 2 — Adze-specific

| Agent | When to use | Register | Primary outputs |
|---|---|---|---|
| **`dhamma-reviewer`** ← **the asymmetric one** | Any teaching content: suttas, quotes, rank copy, Pāli terminology, brahmavihāra framings, hindrance attributions, anything that cites the canon | Theravāda practitioner with Pāli literacy; fetches SuttaCentral for citations | Tradition-fidelity read + Pāli audit + sutta-citation audit + rank-usage audit + "needs teacher consultation" flag |

## Pairing — which agents work well together

For a substantial feature, fan out multiple:

| Change type | Recommended fleet |
|---|---|
| New Supabase migration + Edge Function | `senior-engineer` + `security-reviewer` |
| New legal-text modal | `dsgvo-lawyer` + `copy-storyteller` |
| New teaching quote / sutta-study card | `dhamma-reviewer` + `copy-storyteller` |
| New reflection / habit-completion flow | `ux-reviewer` + `game-designer` + `copy-storyteller` |
| New rank-unlock mechanic | `game-designer` + `dhamma-reviewer` + `copy-storyteller` |
| Pre-public-launch pass | all seven, parallel, then `/ultrareview` on top |

## When NOT to invoke an agent

- **One-line copy tweak** — over-engineering. Just change it.
- **A typo** — fix it, don't review it.
- **Renaming a local variable** — no review needed.
- **Deleting commented-out code** — no review needed.

Reviews cost time + token budget. Reach for the fleet when something is *substantive*: new mechanic, new legal surface, new architectural seam, teaching content, user-facing flow change. For everything else, ship first, review the batch.

## Tier 3 — not yet built, spawn ad-hoc when needed

Spawn a `general-purpose` agent with a focused brief for:

- **Performance auditor** — when bundle size / render path / battery concerns surface.
- **i18n translator** — DE / Malay translations (big batched passes, not incremental).
- **Persona-walker** — simulates different tester personas walking through flows (one-shot before public launch).
- **DB migration specialist** — covered loosely by `senior-engineer` + `security-reviewer`.

Before public launch, consider adding **`accessibility-reviewer`** (WCAG 2.2 AA — becomes legally required under the EU Accessibility Act 2025-06-28), **`tester-feedback-triage`** (once feedback volume scales), and **`ios-safari-specialist`** (where your bugs concentrate). These are queued in the roadmap but not yet written.

## Adding new agents

1. Create `.claude/agents/<name>.md` with frontmatter: `name`, `description`, `tools`, `model`.
2. Write a tight system prompt — ~60–150 lines. Cover: the agent's frame, what it checks, Adze-specific conventions to respect, output format, stay-in-lane boundaries, reference materials.
3. Commit it. The `.gitignore` is configured so `.claude/agents/` travels with the repo while per-developer workspace state stays ignored.
4. Add a row to this table.

Good agent descriptions are specific: *"Invoke when touching X, Y, or Z"* beats *"Reviews things"*. Claude uses the description to auto-select — vague descriptions = missed invocations.

## Editing / tuning agents

After a few invocations you'll notice patterns:

- Agent flags something as Blocker that's actually project-idiomatic → add a "Conventions to respect" bullet.
- Agent misses a class of bug → add a "What you check" item.
- Agent drifts into another lens's territory → tighten the "Stay in lane" section.

Edit the `.md` file, commit with a prefix like `docs(agents): tune dhamma-reviewer — add Visuddhimagga reference`. The project history of agent tuning is itself valuable context.

## Current agent invocations I expect

- `dhamma-reviewer` — weekly, as new suttas / quotes / teaching copy lands.
- `copy-storyteller` — most UI-copy commits.
- `ux-reviewer` — any modal or flow change.
- `senior-engineer` — any feature branch before merge.
- `security-reviewer` — any auth / crypto / migration touch.
- `game-designer` — rare but high-stakes (new mechanics, ability changes).
- `dsgvo-lawyer` — compliance passes (pre-launch heavy, then quarterly).
