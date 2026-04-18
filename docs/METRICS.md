# Beta success metrics

The 4 numbers that decide whether the closed beta is working. Manually tracked, fortnightly. No analytics scripts, no third-party tools — pull from Supabase via the dashboard or via SQL queries you can run against the `auth.users` and `public.user_state` tables.

When these numbers improve, you're on track. When they don't, the next sprint targets whatever's lagging.

---

## The 4 numbers

| # | Metric | What it tells us | Target by week 8 of beta |
| --- | --- | --- | --- |
| 1 | **Onboarding completion rate** | What share of invited testers reach the main app (not the welcome screen). Measured: count(users with `state.setupComplete = true`) / count(invited users). | ≥ 80% |
| 2 | **Day-7 retention** | Of testers who completed onboarding ≥ 7 days ago, what share has done *something* (a sit, a reflection, a settings change) in the last 7 days. | ≥ 60% |
| 3 | **Day-30 retention** | Same as above but for ≥ 30-day-old accounts. The bigger predictor. | ≥ 40% |
| 4 | **Reports per active tester per week** | Total feedback reports received, divided by active testers. Active = did *anything* in the last 7 days. | ≥ 0.5 |

Why these specifically:

- **#1** isolates onboarding pain from product-fit. If onboarding completion is < 50%, the recommendation card is worth nothing.
- **#2 and #3** distinguish "tried it once" from "made it part of practice." The week-7 to week-30 fall-off is the most diagnostic single signal a beta has.
- **#4** measures *engagement with the project*, not just usage. A silent tester teaches us nothing.

---

## How to pull each

### #1 Onboarding completion rate

Once daily/encrypted state lookup isn't possible from the server side (E2E encryption hides `setupComplete`), use a proxy: of invited users, what share has at least one ciphertext push to `user_state`?

```sql
-- run in Supabase SQL Editor, fortnightly
WITH invited AS (
  SELECT id, email, created_at FROM auth.users
),
synced AS (
  SELECT user_id FROM public.user_state
)
SELECT
  COUNT(invited.id) AS invited_count,
  COUNT(synced.user_id) AS reached_main_count,
  ROUND(100.0 * COUNT(synced.user_id) / NULLIF(COUNT(invited.id), 0), 1) AS pct
FROM invited
LEFT JOIN synced ON synced.user_id = invited.id;
```

Caveat: a user who completes onboarding in anonymous mode (no sync) won't show up. For closed beta most invitees will sync, so the proxy is good enough.

### #2 and #3 Retention

```sql
-- Day-N retention from updated_at on user_state
SELECT
  CASE
    WHEN updated_at >= now() - interval '7 days' THEN 'active_7d'
    WHEN updated_at >= now() - interval '30 days' THEN 'active_30d'
    ELSE 'inactive'
  END AS bucket,
  COUNT(*)
FROM public.user_state
GROUP BY 1;
```

### #4 Reports per active tester

Reports arrive via email at `feedback@adze.life`. Count them manually for the period. Divide by active testers from #2.

---

## Tracking template

Add a new section to `docs/FEEDBACK.md` once a fortnight, or keep a separate `docs/METRICS-LOG.md`. Either way, this format:

```markdown
## 2026-MM-DD · Week N of beta
- Invited:                  __ (delta: +__)
- Onboarding completion:    __ % (delta: +/-__)
- Day-7 retention:          __ % (delta: +/-__)
- Day-30 retention:         __ % (n/a if too early)
- Reports / active / wk:    __
- Notable: [one or two qualitative observations from the period]
```

A 2-minute exercise. Don't skip the qualitative line — the numbers without context lose half their signal.

---

## What to do when a number is bad

| If this is low | The first hypothesis is | The first fix is |
| --- | --- | --- |
| Onboarding completion | The flow is too long, or breaks somewhere | Watch a tester's session live; pinpoint the drop step |
| Day-7 retention | The first three days lacked a "magic moment" | Audit what the app does on days 2–4; tune reflection prompts |
| Day-30 retention | Practice plateaus around day 14 | Audit what changes (or doesn't) between day 7 and day 21; add depth |
| Reports per active tester | Testers don't know feedback is wanted, or the FAB is hidden | Re-prompt: send a personal email asking "what's been off this week" |

---

## When to add more numbers

Resist. Four numbers manually tracked are more useful than 40 numbers in a dashboard nobody reads. Add a fifth only when an existing one stops being informative.

If beta grows past ~30 testers, consider adding:

- **Time-to-first-sit** (median minutes from invite click to first reflection submit).
- **Reflection depth** (median characters per reflection — proxy for engagement).

Until then, the four above are sufficient.

---

## Exit criteria — when does Adze leave beta?

- **#1 ≥ 80%** for two consecutive fortnights.
- **#2 ≥ 60%** for two consecutive fortnights.
- **#3 ≥ 40%** with at least 4 weeks of data on it.
- **Zero unresolved HIGH-severity bug reports for 4 weeks.**
- **Service worker shipped, password reset working, account deletion working.**

When all five are true: drop the "Closed beta · by invitation" pill in the welcome screen, open public signups (with Cloudflare Turnstile gating). Leaving beta is a deliberate event, not a drift.
