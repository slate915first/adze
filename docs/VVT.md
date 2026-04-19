# VVT · Verzeichnis von Verarbeitungstätigkeiten

Adze processing register per **Art. 30 DSGVO**. Internal working document — not for publication.

This file is committed to the public repo intentionally: it contains no personal data of users, only the controller's own published address and a description of how Adze processes data. The DPA archive (Auftragsverarbeitungsverträge) lives separately under `docs/COMPLIANCE/` and is gitignored.

**Last updated:** 2026-04-19
**Update trigger:** any change to processing activities, processors, retention windows, or lawful bases. Bump the date and add a row to "Change log" at the bottom.

---

## 1. Controller (Verantwortlicher)

| Field | Value |
|---|---|
| Name | Dirk Sauerstein |
| Address | Bischofstr. 2 A, 04179 Leipzig, Germany |
| Contact | hello@adze.life |
| DSB (Data Protection Officer) | None — not required under § 38 BDSG (single-person operation, no regular Art. 9 processing). Reassessed when scope changes. |

## 2. Processing activities

Each row = one processing activity. Aim: be concrete enough that an auditor can verify each claim against the code or the live system.

### 2.1 Authentication (magic-link sign-in)

| Field | Value |
|---|---|
| Purpose | Allow users to sign in for cross-device sync |
| Categories of data subjects | Beta-allowlisted Adze users |
| Categories of personal data | E-mail address; one-time magic-link code |
| Categories of recipients | Supabase Inc. (USA) — auth backend; Resend (USA) — outbound e-mail delivery |
| Lawful basis | Art. 6 (1) b GDPR (contract — providing the sign-in service) |
| Third-country transfer | USA. Mechanism: Art. 46 (2) c SCCs (Implementing Decision 2021/914, Module 2). |
| Retention | E-mail: until account deletion; one-time codes: ≤24 hours (Supabase default expiry) |
| Technical measures | TLS in transit; magic-link codes expire after one use or 1 hour; rate-limited at Supabase |

### 2.2 Cross-device sync (encrypted state)

| Field | Value |
|---|---|
| Purpose | Sync the user's practice state across devices |
| Categories of data subjects | Authenticated Adze users |
| Categories of personal data | AES-GCM-256-encrypted ciphertext; per-user salt; updated_at timestamp. **Plaintext content cannot be read by Adze or by Supabase** (passphrase-derived key never leaves the user's browser). |
| Categories of recipients | Supabase Inc. (USA) — Postgres + RLS |
| Lawful basis | Art. 6 (1) b GDPR (contract) |
| Third-country transfer | USA. Mechanism: Art. 46 (2) c SCCs. Practical risk bounded — processor cannot decrypt. |
| Retention | Until account deletion (in-app delete-account button cascades through `auth.users` → `user_state` → `beta_allowlist`); 24-month-inactivity auto-delete cron is queued (Track A10), not yet implemented |
| Technical measures | PBKDF2-SHA256 @ 600k iter; AES-GCM-256 with per-save random IV; non-extractable key in tab memory only; RLS scoped to `auth.uid()` |

### 2.3 Beta access control (allowlist)

| Field | Value |
|---|---|
| Purpose | Restrict closed-beta sign-up to invited testers |
| Categories of data subjects | Invited beta testers |
| Categories of personal data | E-mail address; added_at timestamp; optional note |
| Categories of recipients | Supabase Inc. (USA) — `public.beta_allowlist` table |
| Lawful basis | Art. 6 (1) f GDPR (legitimate interest — preventing abuse during closed beta). Also (1) a where the invitee has separately consented in writing. |
| Third-country transfer | USA. Mechanism: SCCs as above. |
| Retention | Until public sign-up launches OR until the invitee asks for removal OR until the user deletes their account (post-v15.12.3 the delete-account Edge Function cleans the allowlist row in the same transaction) |
| Technical measures | RLS read/write by service-role only; insert trigger blocks unallowed e-mails at the auth layer |

### 2.4 Service security (hosting + auth logs)

| Field | Value |
|---|---|
| Purpose | Operational security; abuse detection; debugging |
| Categories of data subjects | Visitors and authenticated users |
| Categories of personal data | IP address; user-agent string; request timestamp; URL; for auth logs also OTP action type and outcome |
| Categories of recipients | Cloudflare Inc. (USA — edge logs); Supabase Inc. (USA — auth logs) |
| Lawful basis | Art. 6 (1) f GDPR (legitimate interest — operational security) |
| Third-country transfer | USA. SCCs. |
| Retention | Cloudflare: ~30 days (provider default); Supabase: ~90 days (provider default). We do not extract or archive these. |
| Technical measures | Provider-managed; we have no direct write access |

### 2.5 Bug reports / feedback (mailto: drafts)

| Field | Value |
|---|---|
| Purpose | Receive bug reports and feedback from beta testers |
| Categories of data subjects | Users who voluntarily send a feedback e-mail |
| Categories of personal data | Whatever the user puts in the draft. Pre-filled by the app: app version, current screen, basic device info (user agent, viewport, language), abridged app state (rank, member count). The user can edit or delete any of this before sending. |
| Categories of recipients | Operator's e-mail inbox (ProtonMail via Cloudflare Email Routing) |
| Lawful basis | Art. 6 (1) a GDPR (consent — given by clicking Send in the user's mail client) |
| Third-country transfer | None for the inbox (ProtonMail = Switzerland, adequacy decision by EU Commission). Cloudflare Email Routing transits via Cloudflare (USA) — SCCs. |
| Retention | 24 months in the inbox; archived/deleted afterward |
| Technical measures | The user always sees the draft before sending; no silent transmission |

## 3. Cross-cutting technical and organisational measures (Art. 32)

- End-to-end encryption of practice content (see 2.2)
- Strict CSP (`script-src 'self'` + `'unsafe-eval'` for the vendored Tailwind runtime; no third-party origins)
- HSTS (1 year), X-Frame-Options DENY, nosniff, restrictive Permissions-Policy
- Service worker never caches Supabase domains
- All third-party scripts vendored under `src/vendor/` (no runtime IP leak)
- Single-maintainer estate plan (see `docs/INCIDENT-RESPONSE.md` § Continuity)

## 4. Change log

| Date | Change | Why |
|---|---|---|
| 2026-04-19 | Initial draft | DSGVO Track A7 — Art. 30 obligation |
