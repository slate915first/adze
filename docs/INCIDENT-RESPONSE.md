# Incident Response Procedure

Adze runbook for data-protection incidents under **Art. 33 + 34 DSGVO**. Internal working document.

**Single-maintainer reality**: this procedure assumes Dirk is the responder. The continuity section at the bottom covers what happens if Dirk is unavailable.

**Last updated:** 2026-04-19

---

## 1. What counts as an incident

A **data breach** under Art. 4 Nr. 12 DSGVO means a breach of security leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, personal data.

### Classify quickly

| Type | Adze examples | Severity |
|---|---|---|
| **Confidentiality breach** | RLS regression exposes another user's row; CSP regression enables XSS that exfiltrates a session token; Supabase service-role key leaked | High |
| **Integrity breach** | Migration corrupts ciphertext; service-worker serves stale crypto code that produces malformed encrypted blobs | Medium–High |
| **Availability breach** | Supabase outage prevents sign-in for >24 h; Cloudflare worker stuck on a broken deploy | Medium (usually not a notifiable breach unless personal-data-loss results) |
| **Account compromise** | Single user's account taken over (e.g. SIM-swap on the e-mail) | Medium — affects one user |
| **Provider incident** | Supabase / Cloudflare / Resend reports a breach affecting Adze data | Severity depends on provider's classification |

Encrypted-but-unreadable data leaving the system is **not** automatically a breach (Recital 26 + Art. 34 (3) a — the encryption acts as a mitigating control). Document it; assess case-by-case.

## 2. Detection paths

How an incident reaches Dirk:

1. **Automated alerts** (highest priority — set these up):
   - Supabase: dashboard → Organization → Notifications → Email on auth failures spike, RLS errors, project-level alerts.
   - Cloudflare: dashboard → Notifications → Workers errors, deployment failures, sudden traffic anomalies.
   - Resend: bounce/complaint webhooks (set destination = security@adze.life).
2. **User reports**: feedback FAB or e-mail to `hello@adze.life` / `security@adze.life`.
3. **Self-discovery**: while debugging, you notice a data-handling bug.
4. **Provider notification**: Supabase / Cloudflare / Resend e-mails about their own incidents.

**Status of detection setup (2026-04-19):** alerts at Supabase + Cloudflare are NOT yet configured. Action: enable in the next compliance pass.

## 3. The 72-hour clock (Art. 33)

> Art. 33 (1): The controller shall without undue delay and, where feasible, **not later than 72 hours after having become aware** of it, notify the personal data breach to the competent supervisory authority…

The clock starts when you have **reasonable certainty** a breach occurred (not when investigation is complete). Document the awareness moment with a timestamp.

### 24-hour internal triage (target — well inside the 72 h)

Within 24 hours of detection, decide:

1. **Is it a breach?** (Apply the Art. 4 Nr. 12 test above.)
2. **Is reporting required?** Yes unless "the breach is unlikely to result in a risk to the rights and freedoms of natural persons" (Art. 33 (1)).
3. **Is data-subject notification required?** Yes if "high risk to rights and freedoms" (Art. 34 (1)). Encrypted data → Art. 34 (3) a may exempt.
4. **What's the scope?** Number of affected users, categories of data, time window.
5. **Containment status?** Patched, mitigated, or still active?

Record this in `docs/COMPLIANCE/incidents/<YYYY-MM-DD>-<short-title>.md` (gitignored folder — contains user-affecting details).

## 4. Reporting

### 4a. To the supervisory authority (Art. 33)

- **Authority:** Sächsischer Datenschutz- und Transparenzbeauftragter (Saxony, Dirk's place of establishment).
  - Address: Devrientstraße 1, 01067 Dresden, Germany.
  - Online breach-report form: `https://www.saechsdsb.de/datenpannen-melden`.
  - Contact for questions: `https://www.saechsdsb.de/kontakt`.
- **Information to include** (Art. 33 (3)):
  - (a) Nature of the breach: categories + approximate number of data subjects + records concerned.
  - (b) Name + contact of the controller (Dirk; hello@adze.life).
  - (c) Likely consequences.
  - (d) Measures taken or proposed to address the breach + mitigate adverse effects.
- If full information is not available within 72 h, file a preliminary report and supplement (Art. 33 (4) explicitly allows this).

### 4b. To affected data subjects (Art. 34)

Required when **high risk** to rights and freedoms. **Not required** if (Art. 34 (3)):
- (a) Data was rendered unintelligible (e.g. modern encryption — applies to most Adze user data); OR
- (b) Subsequent measures eliminated the high risk; OR
- (c) Disproportionate effort — replace with public communication.

If notification is required, send an e-mail directly to the affected accounts (we have their addresses). Use **clear and plain language** (Art. 34 (2)). See template § 7 below.

## 5. Containment + remediation playbook

Generic order of operations:

1. **Stop the bleeding.** If active exposure: revoke the Supabase service-role key, take the worker offline (`wrangler pages deployment delete` or roll back), or revert the offending commit and force-deploy.
2. **Preserve evidence.** Don't `git reset --hard` your way out of the problem before capturing logs and the offending state. Take screenshots; export Supabase logs to a JSON file.
3. **Patch.** Smallest-scope fix that closes the vulnerability.
4. **Verify.** Re-run the live-RLS test suite; manually probe the patched path.
5. **Rotate any leaked secrets.** Service-role key, JWT secret, anon key (last is least-sensitive but still rotate if Trust Boundary was breached).
6. **Communicate.** Authority notification + (if required) data-subject notification.
7. **Postmortem.** Add to `docs/POSTMORTEMS.md` once the dust settles. No blame; structural lessons only.

## 6. Specific containment by incident type

- **Compromised Supabase service-role key:** rotate via Supabase dashboard → Settings → API → "Reset service role". Re-deploy the `delete-account` Edge Function (it reads the env var). Audit `auth.audit_log_entries` for the key's recent use.
- **Allowlist breach (someone signed up who shouldn't have):** SQL `DELETE FROM public.beta_allowlist WHERE email = ...; DELETE FROM auth.users WHERE email = ...;` Add a defensive trigger if the breach was structural.
- **CSP / XSS regression:** revert the deploy. Check whether any reports of the XSS path reaching the wild exist (Cloudflare logs).
- **Service worker stuck on broken code:** push a no-op deploy that updates the service worker version, forcing re-fetch.
- **Single-user account compromise:** force sign-out for that user (rotate their refresh token via `auth.admin.signOut(userId)`); they re-do magic-link.

## 7. Notification templates

### 7a. To the supervisory authority (e-mail backup if the form is down)

```
Subject: Datenpanne · Adze · [Datum] · [Schweregrad]

Sehr geehrte Damen und Herren,

hiermit melde ich gemäß Art. 33 DSGVO eine Datenpanne im Dienst Adze
(Verantwortlicher: Dirk Sauerstein, Bischofstr. 2 A, 04179 Leipzig).

Zeitpunkt der Kenntnisnahme: [YYYY-MM-DD HH:MM CET]
Art der Verletzung:           [knappe Beschreibung]
Betroffene Datenkategorien:    [E-Mail-Adressen / Ciphertext / ...]
Anzahl betroffener Personen:   [ungefähr X]
Ursache:                       [Root-Cause-Hypothese]
Bereits ergriffene Maßnahmen:  [Patch / Rotation / ...]
Weitere geplante Maßnahmen:    [...]
Kontakt für Rückfragen:        hello@adze.life

Mit freundlichen Grüßen
Dirk Sauerstein
```

### 7b. To affected data subjects

```
Subject: Important security notice about your Adze account

Hi,

We are writing to inform you of a security incident that affected your
Adze account on [date].

What happened:
[plain-language description, no technical jargon]

What this means for you:
[concrete consequences — e.g. "your e-mail address was exposed"]
[NOT consequences that don't apply — e.g. don't say "your journal was
exposed" if it was encrypted and unreadable]

What we have done:
[fix + mitigations]

What you should do:
[concrete actions if any — e.g. "watch for phishing e-mails referencing
Adze". If nothing, say so honestly.]

We have notified the Sächsischer Datenschutz- und Transparenzbeauftragter
about this incident. You can also contact them at saechsdsb.de.

We are sorry for the breach of your trust. Reply to this e-mail with any
questions and we will respond within 24 hours.

Dirk Sauerstein
hello@adze.life
```

## 8. After-action

- File the incident under `docs/COMPLIANCE/incidents/<YYYY-MM-DD>-<short-title>.md` with: timeline, root cause, scope, notifications sent, references (commit SHAs, Supabase log IDs).
- Add a learning to `docs/POSTMORTEMS.md` (public).
- If the incident exposed a class of bug (e.g. all RLS policies of pattern X are vulnerable), open a Track in `docs/COMPLIANCE-LOG.md` for the systematic remediation.

## 9. Continuity (single-maintainer risk)

If Dirk is unreachable for >7 days and a breach is suspected:

- **Trusted contact** with emergency access: [TO FILL — e.g. partner / family member / trusted friend]
  - Has access via 1Password Family / Bitwarden Emergency Access to: Supabase project credentials, Cloudflare account, Resend account, this repo.
- **Their action:** put the worker into maintenance mode (`wrangler pages deployment delete`) and forward all `hello@adze.life` mail to a designated lawyer or back to themselves until Dirk returns.
- **Status:** continuity contact NOT yet designated. Action: nominate within the next compliance pass; record name + contact here (this file is committed but the credentials are not).

## 10. Useful references

- BfDI / DSK templates and guidance: https://www.bfdi.bund.de
- Sächsischer LfDI: https://www.saechsdsb.de
- EDPB Guidelines 9/2022 on personal data breach notification under GDPR
- Adze internal: `docs/POSTMORTEMS.md` (public; debugging lessons), `docs/DATA-SUBJECT-REQUESTS.md` (process for non-incident data requests)
