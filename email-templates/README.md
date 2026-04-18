# Adze email templates

Custom email templates that replace Supabase's default blank emails. All three use the same parchment/gold aesthetic, single CTA, and mindful tone.

| File                     | Purpose                                                                 | Supabase template slot |
| ------------------------ | ----------------------------------------------------------------------- | ---------------------- |
| `invite.html`            | Sent when you click "Invite user" in the Supabase dashboard            | **Invite user**        |
| `confirm-signup.html`    | Sent after a self-signup (only fires if public signup is re-enabled)   | **Confirm signup**     |
| `reset-password.html`    | Sent when a user requests a password reset                              | **Reset password**     |
| `*.txt`                  | Plain-text fallback for non-HTML mail clients (same-named HTML file)   | *(pasted alongside)*   |

## Prerequisites — Supabase SMTP via Resend

The templates below rely on Supabase sending through **your** Resend account (so the From address is `beta@adze.life` and mail gets through deliverability checks on your verified domain). One-time setup:

1. **Resend dashboard** → API Keys → **Create API Key** → name it e.g. `Supabase Auth (adze.life)` → scope: Full access → copy the key.
2. **Supabase dashboard** → Project Settings → **Authentication → SMTP Settings** → toggle **Enable Custom SMTP**.
3. Fill in:
   - Sender email: `beta@adze.life`
   - Sender name: `Adze`
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: *(paste the Resend API key)*
4. Save.

Once Supabase is sending through Resend, every auth email goes out from `beta@adze.life`.

## Installing each template

Supabase dashboard → **Authentication → Email Templates** → pick the template from the dropdown.

### Invite user (`invite.html`)

- Subject: `You're invited to Adze — The Path of Awakening`
- HTML body: paste `invite.html` contents.
- Save.

### Confirm signup (`confirm-signup.html`)

- Subject: `Welcome to Adze — confirm your email to begin`
- HTML body: paste `confirm-signup.html` contents.
- Save.

*(Only relevant if you re-enable public signup later. Safe to install now as a defensive default.)*

### Reset password (`reset-password.html`)

- Subject: `Reset your Adze password`
- HTML body: paste `reset-password.html` contents.
- Save.

## Test each template

Use Supabase's **Send test email** button if available, or trigger the real flow:

- **Invite:** Authentication → Users → Invite user → enter your own email.
- **Confirm signup:** Only fires if public signup is on; otherwise the Invite flow covers the same ground.
- **Reset password:** After the user flow exposes a "Forgot password?" link, click it. (Not yet wired into Adze's sign-in modal — coming.)

Check rendering in Gmail, Apple Mail, and on mobile. Each client renders differently; the table-based layout keeps it stable but fonts and spacing can shift a bit.

## Template variables

`invite.html` and `reset-password.html` use a custom prefetch-resistant URL built from `{{ .TokenHash }}` rather than Supabase's default `{{ .ConfirmationURL }}`. The custom URL points at adze.life — Adze itself becomes the landing page, and the token is only verified client-side after the user taps a button. This keeps gmail / proxy / link-scanner prefetches from consuming the single-use token before the human gets there.

`confirm-signup.html` still uses `{{ .ConfirmationURL }}` (defensive default for the public-signup case, which is currently disabled).

If you need to change the URL format, also update `auth.js` `authInit()` — it reads `?invite_token=…&type=…` from the URL.

## Design principles (for when you edit)

- **Inline styles only.** No `<style>` blocks — Gmail strips them in many contexts.
- **Table-based layout.** Outlook still parses CSS grid/flex unpredictably.
- **Max-width 560px.** Wider breaks on narrow mobile viewports.
- **Serif font stack.** `Georgia, 'Crimson Text', 'Times New Roman', serif` matches the app's parchment feel and is installed on every mail client.
- **One CTA per email.** Scanning testers should see the button in 0.5 seconds.
- **Preheader.** The hidden first `<div>` is the inbox-preview line. Keep ≤ 90 chars.
- **Dark-mode friendly.** Dark background + gold accent works in both light- and dark-mode shells.
- **Mindful, not corporate.** Write the way a teacher-practitioner would talk — warm, direct, honest about tradeoffs (no recovery of the passphrase). Don't say "Dear user" or "Thanks for signing up".

## Future templates

- `magic-link.html` — only if you ever enable passwordless magic-link signin.
- `change-email.html` — only if users can edit their account email (currently they can't).

When adding a template, keep it in its own file — don't merge them, they're easier to tune individually.

## Deliverability

You already have Resend's DNS records (SPF, DKIM, DMARC) on `adze.life`. That takes care of authentication. If testers still report Adze emails in spam:
- Check the Resend dashboard for per-email delivery status.
- Ask the tester to mark the first email as "Not spam" to train their client.
- Make sure your sender name is consistent (`Adze`, not varying).
- Add a plain-text fallback alongside the HTML body in Supabase if that option appears.
