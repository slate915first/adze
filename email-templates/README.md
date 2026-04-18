# Adze email templates

Custom email templates that replace Supabase's default blank emails. Current:

| File                     | Purpose                                           | Supabase template slot |
| ------------------------ | ------------------------------------------------- | ---------------------- |
| `confirm-signup.html`    | Sent after signup; CTA confirms the email address | **Confirm signup**     |
| `confirm-signup.txt`     | Plain-text fallback for non-HTML mail clients     | *(pasted alongside)*   |

## How to install in Supabase

1. Supabase dashboard → **Authentication → Email Templates**.
2. Pick **Confirm signup** from the template dropdown.
3. Set the subject line to:
   ```
   Welcome to Adze — confirm your email to begin
   ```
4. Paste the contents of `confirm-signup.html` into the **Message body (HTML)** field.
5. (If your Supabase plan exposes a plain-text field:) paste `confirm-signup.txt` there. If it doesn't, leave it; the HTML version has fallback text baked in.
6. Click **Save changes**.
7. Send yourself a test signup to verify the styling renders in your real mail clients (Gmail, Apple Mail, Outlook — each renders differently).

## Template variables used

- `{{ .ConfirmationURL }}` — the one-time verification link Supabase generates per-signup. **Do not hard-code or modify the URL format** — Supabase injects it.

## Design principles (for when you edit these)

- **Inline styles only.** No external stylesheets or `<style>` blocks in the `<head>` survive Gmail's rewrites cleanly. Everything that matters is on the element.
- **Table-based layout.** Outlook still parses CSS grid/flex unpredictably; nested tables are ugly but universal.
- **Max-width 560px.** Anything wider breaks on narrow mobile.
- **Serif font stack.** `Georgia, 'Crimson Text', 'Times New Roman', serif` — matches the app's parchment/classical feel. Email clients strip custom fonts, so list real installed fonts.
- **One call-to-action.** If a user scans for 0.5 seconds, they should see the button.
- **Preheader.** The first `<div>` is the inbox-preview line. Keep it under 90 chars.
- **Dark-mode friendly.** Dark background + gold accent works in both light- and dark-mode mail client shells.
- **Mindful, not corporate.** Write how a practitioner would talk — warm, direct, honest about the tradeoff (no recovery of passphrase). Do NOT write "dear user" / "thanks for signing up".

## Future templates to add

When we turn on the corresponding Supabase features:

- `reset-password.html` — for the "Reset password" slot. Needed before public launch if we let users recover account passwords by email.
- `magic-link.html` — only if we ever enable passwordless magic-link signin.
- `change-email.html` — only if users can edit their account email.

Keep each template in its own file. Do not merge them — they're easier to tune individually.

## Deliverability

If testers report Adze emails going to spam: add SPF / DKIM records for your sending domain in Supabase settings (dashboard → Authentication → Email Settings → SMTP). Supabase's shared sender works for low volume; once we pass ~100 users/month we should configure a custom SMTP (e.g. Resend, Postmark) to stay out of spam.
