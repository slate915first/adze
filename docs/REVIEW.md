# Adze — Production Readiness Review

A consolidated audit of what the project still lacks to scale from a 5-person closed beta to a public launch within 3–6 months. Written from four lenses: senior engineer, game/UX designer, project manager, privacy-and-compliance.

The goal isn't perfection. It's **leverage**: which of the missing pieces, if added, would have the biggest impact on whether Adze actually serves the practitioners it's built for. Things that don't move that needle are deprioritized even if they're "best practice" elsewhere.

---

## How to read this document

Each section names what's missing, why it matters *for this project specifically*, and a fix that's been costed in approximate effort (S = ½ day, M = 1–2 days, L = a week or more). At the end, a recommended sequence and a "top 10 if you can only do ten" list.

---

## 1 · Engineering & production readiness

### 1.1 Repository hygiene — HIGH

| Missing | Why it matters | Effort |
|---|---|---|
| **Root `README.md`** | This is the first thing every visitor to the public GitHub sees. Right now they see the file tree and have to guess what Adze is. A 30-second elevator + screenshot + privacy claim + how-to-run is non-negotiable. | S |
| **`LICENSE`** | A public repo without a license is technically all-rights-reserved — anyone reading the code legally cannot reuse anything, and contributors have no clarity. Pick **MIT** for maximum permissiveness or **AGPL-3.0** if you want any forks of the synced/server code to also stay open. | S |
| **`SECURITY.md`** | Security researchers find a vulnerability — where do they write? Without this, they post on Twitter or just leave. One paragraph: "email security@adze.life with details, response within 7 days, won't sue you for responsible disclosure." | S |
| **`CONTRIBUTING.md`** | Future you (and any sangha helper adding a sutta) needs to know: how to add a sutta file, how to translate, how to run locally, the version-bump ritual. | S |

### 1.2 Testing — HIGH

The v15.1.1 chip-array crash made it past every commit. **Adze ships every push to `main` straight to production with no automated check.** Two layers worth adding:

- **One end-to-end smoke test** in Playwright: open `localhost:8000`, click through anonymous → setup → the diagnostic → reach the recommendation card without throwing. Run on every PR. Catches every regression of the v15.1.1 class. (M)
- **Unit tests for the engine layer** — the pure functions in `engine/diagnostic.js`, `engine/srs.js`, `engine/i18n.js`. These are deterministic and testable without a browser. Start with `computeRecommendation` — twelve test cases (one per beginner / experienced experience-level + chip flag combo) would have caught the v15.1.1 crash. (M)

No need for full coverage. The 80/20 is: pure-engine functions + one e2e auth round-trip. That's it.

### 1.3 CI/CD — HIGH

- **`.github/workflows/test.yml`** — runs lint + the e2e smoke test on every PR. (S, once tests exist)
- **Branch protection on `main`** — require the test workflow to pass before merge. Today we push directly to `main`; no review, no checks. (S; GitHub setting)
- **Cloudflare deploy previews on PRs** — Wrangler's GitHub Action gives you a preview URL per PR. You can click and try the change before merging. (S)

### 1.4 Security headers — HIGH

Adze handles auth and stores user-encrypted data. It runs without a single defensive HTTP header. Add a `src/_headers` file that Cloudflare reads automatically:

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; connect-src 'self' https://*.supabase.co
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Stops clickjacking, MIME sniffing, mixed-content downgrades, and silly browser features Adze never asks for. (S)

### 1.5 Auth & account hardening — HIGH

- **Password reset UI** — backend exists (`authResetPassword`), but no "Forgot password?" link in the sign-in modal. First tester who forgets is stuck. (S — one modal step + Supabase email template; we already have `reset-password.html`).
- **Account deletion** — under GDPR, users have a right to be forgotten. Right now there's no "delete my account" button. Add to Settings → Account & sync. Cascade: delete `auth.users` row + delete `user_state` row. Supabase `auth.admin.deleteUser` via an Edge Function or RPC. (M)
- **Password length minimum** — Supabase default is 6 chars; bump to 10 in the dashboard. (S — config only)
- **Session timeout** — currently sessions last forever (rolling refresh). Decide: add a 30-day idle timeout? Decide *before* a tester complaint forces you. (M)

### 1.6 Service Worker + PWA — HIGH (impact-weighted)

Adze is a daily-practice app. Practitioners will want to:
- Open it on a flight without wifi.
- Have it on their home screen like a real app.
- Get a meditation done even when their network is flaky on a meditation retreat.

A static service worker (~150 lines) + `manifest.json` + a few icons unlocks all three. iOS supports it. Android supports it. Cloudflare serves it for free. **This single change does more for the user experience than any other item on this list.**

Approximate plan: cache-first for static assets, network-first for Supabase calls, offline-fallback page for first-load. (M)

### 1.7 Lint + format consistency — MED

Add `.eslintrc.json` + `.prettierrc.json` + a `.husky/pre-commit` that runs `prettier --write` + `eslint --fix` on staged JS. Stops style drift across sessions. (S)

### 1.8 Error monitoring — MED

Right now: an uncaught error in production produces a console error nobody ever reads. Two options:

- **Free / minimal**: a tiny `window.onerror` handler in `bootstrap.js` that POSTs `{message, stack, version, timestamp}` to a Supabase `error_log` table (RLS: insert-only, no read). You can audit it weekly.
- **Off-the-shelf**: integrate Sentry (free tier handles 5k events/month). More features, but adds an external dependency that arguably contradicts the privacy stance.

Recommend the in-house Supabase log for the closed beta; revisit Sentry only if volume grows. (S)

### 1.9 Performance — LOW

57 sequential script tags is technically fine on HTTP/2 but worth measuring. Once Cloudflare Analytics is on, look at LCP and FCP. If LCP > 2.5s on mobile, consider:
- `<link rel="preload">` for `data/loaders.js` and Supabase SDK.
- Self-hosting a Tailwind production build (it's a one-line change to add a `<style>` block at build time).

Don't optimize until the metric forces you. (L if it ever happens)

### 1.10 Observability — MED

Beyond errors: how do you know whether Adze is *working* for testers? Right now: the FAB feedback button. That captures complaints, not patterns. Add — once you're past 20 testers — a small set of privacy-respecting events:

- Onboarding completed (per user, no PII).
- Sit completed (per user, with duration bucket).
- Sync failed (with anonymized error type).

These should land in a Supabase table the user can opt out of. **Do not add Mixpanel / Amplitude / similar** — they read everything. Build it yourself with one POST per event; it's 50 lines. (M)

---

## 2 · Game design & user journey

### 2.1 Map the first 30 days — HIGH (impact-weighted)

What does a tester see on day 1? Day 7? Day 30? **There's no document that answers this.** Without it, the recommendation engine, content scheduling, and progression are all guesses.

Write `docs/USER-JOURNEY.md`:
- **Day 1**: signup → passphrase → 3-min diagnostic → recommendation card → first sit → first reflection. Target: 5 minutes from invite click to first sit.
- **Day 2-6**: morning sit → micro-reflection. Same flow daily, varies only in suggested-sutta and the daily question. Target: ≤2 min per check-in.
- **Day 7**: weekly summary with patterns named. Surface the first sutta from the curriculum.
- **Day 14**: first "graduation" moment — the rank changes, a new character ability unlocks, OR a teaching moment surfaces.
- **Day 30**: monthly reflection. Permission to slow down or take a break. The hardest beta milestone — most habit apps lose >50% of users by day 30.

Each milestone should have *one moment* designed to make the practitioner feel "this is helping me." If you can't name that moment, the engine isn't doing its job. (S to write the doc; the building it implies is a separate stream)

### 2.2 Define what "first magic" means — HIGH

A meditation app's first session magic is rarely the recommendation — it's the **first sit itself feeling held**. Things that contribute:

- A clean transition from the recommendation card to the timer (no friction).
- A bell sound that's chosen for warmth, not novelty (Adze already has 5 variants — good).
- A post-sit reflection prompt that's *specific*, not generic ("How was your sit?" is bad; "What did you notice when the mind wandered?" is better).
- An honest stat: "5 minutes done. Tomorrow this gets easier." — not "+10 XP, level up!"

Audit the post-sit flow specifically. Time it. Ask Li May to talk-aloud through her first three sits. (S audit; M tuning)

### 2.3 Reward and progression loop — MED

The Māra-armies / character / rank scaffolding is rich, but the *cadence* of unlocks isn't visible to me. Are unlocks predictable (every 7 days)? Tied to behavior (every 5 sits)? Random? Beta testers will either feel under-rewarded (drop off) or over-rewarded (feel manipulated). Pick one model, document it in `docs/PROGRESSION.md`, tune from there. (M)

### 2.4 Drop-off recovery — MED

The setback-recovery code in `bootstrap.js` is good — it surfaces the lute-strings teaching when a habit's broken. Two more recovery moments worth designing:

- **Day-3 silence**: tester signed up, did one sit, hasn't been back. Send a *single* gentle email: "If today is too much, two minutes is a complete sit." No nag, no streak guilt, no hooks.
- **Returning after 14+ days**: no shame, no "you broke your streak" copy. A specific welcome: "The thread is here. Pick it up wherever you can." (M for the email + state hook)

### 2.5 Onboarding length — MED

Setup currently takes 3-5 minutes. That's fine for a contemplative tool but long for a beta tester evaluating an app. Two paths:

- **Speed run**: a "quick start" option that skips the diagnostic, picks a sensible default (5 min morning sit), and lets the tester explore. They can complete the full diagnostic in Settings later.
- **Stay long**: keep the current flow as the only path. Document why ("the diagnostic's recommendation is the product").

I'd lean toward keeping the long flow but adding a **progress indicator** that shows how much is left (you have it for Phase A/B/C — extend it across the full setup). Helps testers commit. (S)

---

## 3 · Project management & process

### 3.1 Tester success metrics — HIGH

You currently know: how many testers are signed up. You don't know: how many are coming back, how many are completing setup, how many are logging a sit, how many are reporting feedback. Decide the 3-4 numbers that matter for *this beta phase*:

- Completion rate for onboarding.
- Day-7 retention (% of signups who do something on day 7).
- Day-30 retention.
- Reports per active tester per week.

You don't need a dashboard for this — a fortnightly check in `docs/METRICS.md` (manually pulled from Supabase) is enough. (S to start; ongoing)

### 3.2 Tester journey doc — HIGH

Already started by `docs/BETA-GUIDE.md`, but the mirror is missing: *your* version. What do you do when a new tester signs up? When one goes silent? When one hits a major bug? Write `docs/TESTER-OPS.md`:
- New tester checklist (what email to send, what to verify after they sign up).
- Silent-tester ping schedule (one nudge at day 3, one at day 14, then leave).
- Bug-triage flow (severity rules, how to communicate while fixing).

This is the boring side of beta but it makes the difference between "five testers I lost track of" and "five testers who feel personally cared for". (S)

### 3.3 Public roadmap — MED

`docs/ROADMAP.md` is internal. Consider a public version: a single GitHub Issue pinned to the repo titled "Public roadmap" with 3-5 themes for the next 3 months. Lets testers see where you're headed and gives them a way to upvote what matters. (S)

### 3.4 Release cadence — MED

You now have versioning (good). But what's the rhythm? Weekly v15.x bumps? Monthly v16.x major? Without a public expectation, testers don't know when to expect changes. Document in `docs/VERSIONING.md` — already have the file — add a "Release cadence" section: "Roughly weekly during beta; aim for Friday cuts." Then *do* it. (S)

### 3.5 Definition of done for "leave beta" — MED

When does Adze stop being beta? Without an answer, beta lasts forever. Write down the exit criteria: "30 active testers for 4 consecutive weeks", "<1 critical bug per week", "service-worker offline mode shipping", "password reset working". Reach those → drop the "Closed beta" pill, open public signups. (S; an hour with yourself)

---

## 4 · Privacy & compliance

### 4.1 Update the GDPR paragraph — HIGH

`privacy_detail.para_gdpr` currently says: *"Because no data is processed by any third party and the app has no operator handling your data, there is no data controller in the GDPR sense."*

This was true in v14.x (no sync). With v15.x, it is **factually wrong**: you are the data controller, Supabase is the data processor, the user has GDPR rights against both. Update copy to honestly describe the current state:

> "Adze stores everything locally by default. If you opt into sync, Adze acts as the data controller and Supabase (Inc., USA, EU SCCs in place) processes the encrypted blob. The blob is encrypted with your passphrase before it leaves the browser, so neither Adze nor Supabase can read the contents. Your rights under GDPR — access, rectification, erasure, portability, restriction — apply. To exercise any of them, write to hello@adze.life."

(S — copy edit)

### 4.2 Terms of Service — MED

Required when a service has user accounts. A short ToS covering:
- The service is provided as-is (no warranty).
- Beta status (things break, you'll fix in good faith but no SLA).
- Acceptable use (don't try to break it; don't impersonate).
- Account termination conditions.
- Governing law (your jurisdiction).

Use a simple template (e.g., from termly.io or a lawyer-prepared boilerplate). 1-2 pages. Link from the footer. (S–M)

### 4.3 Account deletion (also under GDPR right-to-be-forgotten) — HIGH

Same item as 1.5 but mentioned again: this is a *legal requirement* under GDPR for EU users, not just a nice-to-have.

### 4.4 Cookie / storage notice — LOW

You set no cookies. localStorage is technically not subject to the EU cookie banner directive (case law debated). A one-line note in the footer ("We don't use cookies. Your data lives in this browser's localStorage.") is more than enough. (S)

---

## 5 · The mindfulness lens (project-specific)

This is what separates Adze from a generic habit app. Three things a senior advisor *who knows the dharma* would notice:

### 5.1 The "tool listens first" promise

The setup intro reads "the app listens first, recommends second, teaches third." Audit whether this is *actually true* in the post-onboarding daily flow. After day 3, does the app still listen? Or does it become a task list with a meditation theme? If the latter, the daily flow needs reflection prompts that the engine then *responds to* — not just records.

### 5.2 The teacher gap

Adze repeatedly says "your real teacher is your real teacher." But there's no way to mark "I have a teacher." Adding a single setting — "Are you working with a teacher or sangha?" — would let the engine adjust tone (more pointing-back-to-teacher when the tester says yes; more self-sufficient framing when no). (S — one preference + a few content branches)

### 5.3 The setback gentleness

Most habit apps frame missed days as failure. Adze's current copy is mostly good ("a five-minute thread is stronger than a seven-day intensive that breaks") but the streak visualization may still feed shame. Audit every place where streaks are shown. Replace "streak broken" framing with continuity framing ("23 sits over 28 days — strong"). (S audit; M tuning)

---

## Top 10 if you can only do ten — recommended sequence

1. **Root `README.md`** — first impression of the public repo (S).
2. **`LICENSE`** — pick MIT or AGPL, settle the legal question (S).
3. **`_headers` file with CSP + the rest** — close the open security flank (S).
4. **Update GDPR paragraph + write ToS** — legal hygiene, you have EU users (S).
5. **Account deletion flow** — GDPR + tester right-to-leave (M).
6. **Password reset UI** — completes the auth flow (S).
7. **Service worker + PWA manifest** — the single highest user-experience leverage on this list (M).
8. **One e2e auth smoke test + GitHub Actions** — stops the next v15.1.1-class regression (M).
9. **Map the 30-day journey + define "first magic"** — the design work that makes the rest land (S to write).
10. **Tester success metrics + bi-weekly check** — answers "is this working" so you can decide what to build next (S to set up; ongoing).

Total work: ~2-3 weeks of focused effort if you do them in sequence. None of these requires hiring or external dependencies. All of them survive into the post-beta product.

---

## What I'd skip (or defer indefinitely)

- **CAPTCHA, complex rate limiting** — Supabase defaults are enough at your scale.
- **Build step / minification / tree-shaking** — the no-build architecture is a feature; LCP isn't slow enough to matter.
- **Sentry / Mixpanel / Amplitude** — privacy contradiction; build small things in-house instead.
- **Multi-language launch** — wait for monolingual product to hit 100 users first.
- **Custom subdomain on Workers** — `adze.life` already works; cosmetic.
- **GitHub issue templates, CODEOWNERS** — premature for a solo project.

These will come up in industry-standard reviews. Skip them anyway. They eat time without moving the needle for *your* users.

---

*Reviewed against the goal: a meditation tool that treats its practitioners with the same care the dhamma asks them to bring to their own minds. The closer the product is to that, the easier every other decision becomes.*
