# Data Subject Requests (DSR) Runbook

How Adze handles user requests under **Art. 15–22 DSGVO**. Internal working document.

The legal floor: respond within **30 days** of receiving the request (Art. 12 (3)). Extensible by another 60 days for complex cases, but you must inform the user within the original 30.

**Last updated:** 2026-04-19

---

## 1. Identity verification

Before processing any request, verify the requester is who they claim to be. For Adze:

- **Default**: the request must come from the e-mail address on the account, OR be cryptographically signed via in-app action (the `delete-account` flow is the only user-driven DSR action today).
- **If in doubt**: ask one verifying question whose answer is visible to the account owner via the app — e.g. "what character did you create first?" or "what's your current rank in Adze?" — and that an attacker would not know.
- **Don't** demand a passport copy or other heavy ID. The e-mail-on-file standard is what the BfDI accepts for low-risk online services.

## 2. The rights, in Adze terms

For each right: what the user can ask for + how Adze fulfills it + what's automated vs. manual today.

### Art. 15 — Right of access (Auskunft)

**What they can ask**: a copy of all personal data we hold about them, plus categories/purposes/recipients metadata (much of which is in the Datenschutzerklärung already).

**How to fulfill**:
1. Confirm identity (§ 1).
2. Use the in-app **Settings → Backup & Share → Export** link (works locally without authentication — they generate it themselves on their device).
3. Pull server-side metadata via SQL (account row + activity timestamps):
   ```sql
   -- Replace <email> with the requester's e-mail.
   select id, email, created_at, last_sign_in_at, raw_app_meta_data
     from auth.users where lower(email) = lower(<email>);
   select user_id, salt, updated_at, length(ciphertext) as ciphertext_len
     from public.user_state where user_id = <user_id_from_above>;
   select email, added_at, note
     from public.beta_allowlist where lower(email) = lower(<email>);
   ```
4. Send back: the SQL excerpts (formatted) + a note that the ciphertext content can be exported by them via the in-app Export (we cannot decrypt it).
5. Include the standard Art. 15 (1) (b)–(h) information by reference to the Datenschutzerklärung.

**Automated**: the in-app Export covers most of the practical content.
**Manual**: the SQL excerpts above.

### Art. 16 — Right to rectification (Berichtigung)

**What they can ask**: correction of inaccurate personal data.

**How to fulfill**:
- **Practice content**: the user can edit anything in the app and re-sync. No support needed.
- **E-mail address change**: requires manual SQL today (Supabase doesn't expose a clean UI):
  ```sql
  update auth.users set email = <new_email> where id = <user_id>;
  -- Supabase will mark the new e-mail as unconfirmed; user re-verifies via magic-link.
  ```
- Confirm via reply-e-mail when done.

### Art. 17 — Right to erasure (Löschung)

**What they can ask**: delete their data.

**How to fulfill**:
- **Self-service**: the user can hit Settings → Reset Everything → Delete account. This calls the `delete-account` Edge Function which (as of v15.12.3):
  1. Reads the user's e-mail from the JWT.
  2. Deletes from `public.beta_allowlist`.
  3. Calls `auth.admin.deleteUser` — this cascades to `public.user_state` via the FK.
- **Operator-driven** (when the user can't sign in for some reason): SQL fallback:
  ```sql
  -- Order matters: collect the email first, delete allowlist, then auth.
  with target as (select id, email from auth.users where lower(email) = lower(<email>))
  delete from public.beta_allowlist
   where lower(email) = lower((select email from target));
  -- Then via Supabase admin API or SQL:
  -- supabase.auth.admin.deleteUser(<id>);
  ```
- Confirm by replying to the requester within 30 days that deletion is complete.

**Note on encrypted ciphertext**: deleting an unreadable AES-GCM ciphertext is the same kind of "erasure" as deleting any other row — the cascade handles it. We do NOT need to overwrite or zero-fill it.

**Note on logs**: Cloudflare edge logs (~30 days) and Supabase auth logs (~90 days) age out automatically; we do not extract or persist them. If the user explicitly asks, we acknowledge the retention windows in the Datenschutzerklärung (Art. 6 (1) f legitimate interest — operational security).

### Art. 18 — Right to restriction of processing (Einschränkung)

**What they can ask**: pause processing of their data without deleting it (e.g. while accuracy is being contested).

**How to fulfill**:
- Manual: temporarily remove their `beta_allowlist` row + revoke their refresh tokens (`auth.admin.signOut`). This blocks new sessions but preserves data.
- Document the restriction reason + start date here (in this doc's log, § 4).
- Lift when the underlying issue is resolved.

Rare in practice for Adze; document if it happens.

### Art. 20 — Right to data portability (Datenübertragbarkeit)

**What they can ask**: their data in a structured, commonly-used, machine-readable format that they can take to another service.

**How to fulfill**:
- **In-app Export** (Settings → Backup & Share → Export) emits JSON. That's the deliverable.
- For the e-mail address itself + account metadata: the SQL from Art. 15 above.

This right applies only to data the user provided AND that we process based on consent or contract — covers the entire Adze dataset.

### Art. 21 — Right to object (Widerspruch)

**What they can ask**: stop processing based on legitimate interest (Art. 6 (1) f) or for direct marketing (we don't do marketing).

**How to fulfill**:
- The two Adze processing activities under (1) f are **beta allowlist** (abuse prevention) and **server logs** (operational security). For both, "stop processing" means "delete the account": removing the allowlist row + the auth row resolves both.
- If they want to keep the account but stop logs processing: not technically possible (Cloudflare/Supabase log everything by default; we don't have selective opt-out). Honest answer: the only way to stop log processing is to stop using the service.

### Art. 7 (3) — Withdrawal of consent

The only consent-based processing today is **bug-report e-mails**. Withdrawal = the user just stops sending them. Already-received e-mails sit in the inbox until natural retention (24 months, see VVT.md § 2.5). User can ask for older e-mails to be deleted; do it manually.

The age + Datenschutz consent at sign-up (v15.12.4) is a confirmation, not a DSGVO Art. 7 consent — withdrawing it = deleting the account.

## 3. Response templates

### 3a. Acknowledgement (send within 48 h of receiving the request)

```
Subject: Re: [user's subject line]

Hi,

Thanks for your message. I'm treating this as a request under Article
[15/16/17/...] of the GDPR. I will respond fully within 30 days
(by [date 30 days from today]).

If I need more information from you to verify your identity or to
process the request, I'll write again within the next few days.

Dirk
hello@adze.life
```

### 3b. Identity verification (only if needed)

```
Subject: Re: [...]

Hi,

To make sure I'm fulfilling your request to the right person, can you
confirm one of the following from your Adze account:
- The character name of the first member you created, OR
- Your approximate sign-up date (month + year is enough).

If you can't recall either, that's OK — let me know and I'll find another
way to confirm.

Dirk
```

### 3c. Fulfillment (Auskunft example)

```
Subject: Re: Your data — Adze

Hi,

Below is the personal data Adze holds about you and how we process it.

Account record (from auth.users):
  id:           <uuid>
  email:        <email>
  created_at:   <ts>
  last_sign_in: <ts>

Encrypted state (from public.user_state):
  user_id:      <uuid>
  updated_at:   <ts>
  ciphertext_len: <bytes>
  (Content is encrypted with your passphrase; we cannot read it. To get
  the readable content, use Settings → Backup & Share → Export in the app.)

Beta allowlist:
  email:        <email>
  added_at:     <ts>
  note:         <note or null>

Categories of recipients, lawful bases, retention windows, and your
other rights are described in the Datenschutzerklärung
(https://adze.life — link in the welcome footer).

If you want any of this corrected, restricted, or deleted, let me know.

Dirk
```

### 3d. Refusal (rare; only when legitimate)

A request can be refused if it is "manifestly unfounded or excessive" (Art. 12 (5)) — extremely rare. Document the reasoning here in § 4 if it ever happens.

## 4. Request log

Per Art. 5 (2) accountability principle, keep a record. **Privacy hygiene**: this log lives in this committed file with **abbreviated content only** (date, right invoked, outcome). Detailed correspondence (emails, identity verification messages) lives in your e-mail and is not committed.

| Date received | Right (Art.) | Requester (anon) | Outcome | Closed by |
|---|---|---|---|---|
| _(no requests yet)_ | | | | |

When a request comes in, add a row. Use an anonymous identifier ("user-A", "user-B") here; the mapping is in your private notes.

## 5. References

- BfDI guidance on data-subject requests: https://www.bfdi.bund.de
- EDPB Guidelines 01/2022 on data subject rights — right of access
- Adze internal: `docs/VVT.md` (what we process), `docs/INCIDENT-RESPONSE.md` (separate runbook for breaches)
