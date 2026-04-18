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

*(empty — no beta reports yet)*

---

## Open

*(Chronological, newest at top.)*

*(empty — no beta reports yet)*

---

## Addressed

*(When a report is fixed/shipped, move it here with a one-line resolution and a commit SHA if applicable.)*

*(empty — no beta reports yet)*

---

## Wontfix / won't-do

*(Entries that were considered and deliberately rejected. Keeping them here avoids relitigating.)*

*(empty)*
