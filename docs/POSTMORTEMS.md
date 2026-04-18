# Postmortems & learning log

Honest account of bugs that reached the live site, why they got there, and the working practices we adopted to stop the same class from returning. Appended to over time. Written for future maintainers (and future Claude) to actually learn from, not to assign blame.

Each entry: **symptom** → **root cause** → **contributing factors** → **fix** → **preventive practice**.

---

## Working practices (current)

These exist because a real bug slipped past the previous version of our process. Don't drop them without a replacement.

1. **Grep after semantic changes.** Every time you relax or change a constant (regex, number, enum value, copy keyword), search the repo for the *old* form before committing. *"6-digit code"* survived in user-facing copy for a release after we relaxed the regex from `^\d{6}$` to `^\d{4,10}$` — invisible at the code level, painful at the user level.
2. **Run `npm run test:e2e:live` after every deploy.** Not just when you remember. Localhost Playwright doesn't apply Cloudflare `_headers`, so CSP / header / redirect bugs only appear against live. Seven releases shipped with a broken CSP because nobody ran against live.
3. **Copy-sensitive e2e assertions.** For any user-facing string that carries real semantics ("6-digit", "closed beta", "Check your inbox"), assert it exactly in at least one e2e test. Catches copy drift automatically.
4. **When a server-side error message is ambiguous, pull actual logs before speculating.** Supabase's "token has expired or is invalid" is returned for (a) real expiry, (b) wrong token type, (c) wrong email. Two hours of guessing ≠ one minute of `mcp__supabase__get_logs`.
5. **Live Supabase behavior ≠ stubbed Supabase behavior.** The e2e stubs pass flags our real server wouldn't. Any new auth flow gets at least one manual round-trip against real Supabase before it goes into the release notes as "tested".
6. **Single hardcoded value that must match an external spec = risk.** If the value comes from a third party (Supabase OTP length, email template variable format, a Cloudflare header behavior), design the client to be tolerant of the range, not rigid on a specific value.

---

## 2026-04-18 · CSP blocked every `onclick` for seven releases

**Symptom.** Every user reported "buttons don't respond." The page rendered fine. Buttons had handlers written in HTML (`onclick="..."`). Nothing fired.

**Root cause.** The `_headers` CSP I added in v15.3 specified `script-src 'self' 'unsafe-eval' https://cdn.tailwindcss.com https://cdn.jsdelivr.net`. Missing: `'unsafe-inline'`. Browsers refuse to execute inline event handlers without that keyword. Every button in the app relies on inline handlers. The whole app was un-interactive on live for ≈7 releases (v15.3 through v15.10).

**Contributing factors.**
- The per-PR e2e suite runs against `python3 -m http.server` on localhost, which doesn't emit `_headers`. Local tests green, live dead.
- No user reported it clearly at first; symptoms got conflated with the concurrent invite-flow bugs.
- I kept shipping new features on top of a broken base instead of diagnosing.

**Fix.** Added `'unsafe-inline'` to `script-src`. Immediate.

**Preventive practice.** Added `tests/e2e/_live-diag.spec.js` that runs against `https://adze.life` directly, asserts zero CSP / JS console errors and that the Begin button is actually clickable. Run after every deploy via `npm run test:e2e:live`. This test would have caught the CSP regression in five seconds.

---

## 2026-04-18 · Path-viewer parse error hidden by CSP

**Symptom.** Welcome page rendered, but some modals silently failed to work. Investigation needed.

**Root cause.** `src/modals/path-viewer.js` had an orphan `}` at line 462, left over when code was extracted out of the function into `main.js` weeks earlier. Browsers parsed up to that brace, hit `return content;` at top-level scope, threw "Illegal return statement". The file's own function failed to define. Users of `path_viewer` modals saw nothing.

**Contributing factors.**
- No unit test for modal renderers (they require DOM).
- No e2e test covering `renderPathViewerModal` specifically.
- The CSP bug above masked the problem — nothing was clickable anyway.

**Fix.** Deleted the orphan brace. Verified via `node --check` on every JS file.

**Preventive practice.** `tests/e2e/welcome.spec.js` asserts zero console errors on first paint. Any future top-level parse error surfaces immediately. `_live-diag.spec.js` does the same on live deploy.

---

## 2026-04-18 · Invite-link flow — three different failure modes stacked

**Symptom.** Li May clicked the invite link. Landed on welcome with three confusing options. None responded. Frustration ensued.

**Root causes (three, layered):**
1. **Email prefetchers consumed the token.** Gmail / corporate proxies / link-scanners fetch URLs in emails for preview or safety checks. Supabase's invite link goes straight to `/auth/v1/verify?token=X&type=invite`, which consumes the single-use token on any GET. By the time the human clicked, the token was dead.
2. **Wrong `verifyOtp` type.** After a user already exists (which happens after clicking a confirm-signup link once), `signInWithOtp` for that email routes as `recovery`, not `email`. My `verifyOtp({ type: 'email' })` returned "token expired or is invalid" for a valid token — misleading error message.
3. **CSP blocked the modal's `onclick`.** Even if tokens had been fine, the landing page's button didn't respond.

**Fix.** Replaced the whole pattern with magic-link + database allowlist (v15.11). No clickable link = no prefetch to consume. Retries `email → magiclink → recovery → signup` types in the client. (And CSP fixed separately.)

**Preventive practice.**
- Always pull Supabase logs (`mcp__supabase__get_logs`) when an auth error message is ambiguous. Two hours of speculation were avoided in the next round once we did this.
- Any new server-assumption code (token format, type, length) gets a real-Supabase round-trip before the release is tagged.

---

## 2026-04-18 · 6-digit copy outlived 6-digit code

**Symptom.** v15.11.2 relaxed the OTP length regex from `^\d{6}$` to `^\d{4,10}$` to accept Supabase's real 8-digit codes. The UX copy on the magic-link request screen still said *"We'll send a 6-digit code to your inbox"* — because I only changed the regex, not the copy.

**Root cause.** Change split across layers (validation vs. copy) not caught. I relaxed a rigid constraint in one file, left the hardcoded description in another.

**Fix.** Copy now says "a code" (no number).

**Preventive practice.** Grep-after-semantic-change is now rule 1 in the working-practices list above. When I relax a specific value, I `grep -r` for the old value's textual form across the repo before committing. A missing copy update is immediately visible.

---

## 2026-04-18 · First-user passphrase routing sent to "unlock" instead of "setup"

**Symptom.** User completed magic-link sign-in for the first time. Got dropped into the "unlock your passphrase" modal, typed a passphrase, received "no encrypted data on server" error. Felt broken.

**Root cause.** Bootstrap unconditionally opened the passphrase-unlock modal for any authed-but-locked session. Fresh users have no remote ciphertext; there's nothing to unlock. They should see the setup modal.

**Fix.** Bootstrap now `await`s `passphraseRemoteExists()` before choosing unlock vs. setup. Row present → unlock, row absent → setup.

**Preventive practice.**
- Async checks at boot aren't free, but they avoid guessing at user intent from client-side signals alone.
- When a flow has a "first time vs. returning" branch, the server is the source of truth. Don't infer.

---

## 2026-04-18 · Magic-link email arrived but wrong template sent

**Symptom.** User typed email, expected 6-digit code, got the "Welcome. Confirm your email" template (clickable link, no code).

**Root cause.** Supabase has `Confirm email` toggled on for the project. When `signInWithOtp` is called for a brand-new email, Supabase's default path is: create a pending user → send "Confirm signup" template → require email-confirmation before letting them in. The "Magic Link" template (which contains `{{ .Token }}` for the 6-digit code) only fires when email confirmation is off OR the user already exists.

**Fix.** Documented in CHANGELOG that `Confirm email` must be **off** in Supabase for the magic-link flow to send the right template. Allowlist trigger at DB level is a stricter gate than email confirmation — so email confirmation is redundant.

**Preventive practice.** Any flow that depends on a Supabase dashboard toggle gets that toggle documented in the CHANGELOG entry + in `docs/VERSIONING.md` or a dedicated `docs/SUPABASE-CONFIG.md`.

---

## Template for future entries

```markdown
## YYYY-MM-DD · Short title

**Symptom.** What the user saw.

**Root cause.** The one true reason.

**Contributing factors.** Process / tooling gaps that let it ship.

**Fix.** What changed in the code or config.

**Preventive practice.** What we do differently from now on, phrased as a rule added to the "Working practices" list at the top.
```
