# Transfer Impact Assessment — Adze

Schrems II documentation for third-country processor transfers. Internal compliance artefact; produced on request from the competent supervisory authority (Sächsischer Datenschutz- und Transparenzbeauftragter) or the data subject.

---

## 1. Parties

**Controller** (Verantwortlicher):
Dirk Sauerstein
Bischofstr. 2 A, 04179 Leipzig, Germany
Contact: hello@adze.life

**Processors** (Auftragsverarbeiter), all headquartered in the United States:
1. **Supabase Inc.** — auth + Postgres hosting + Edge Functions.
2. **Cloudflare Inc.** — web hosting (Workers static assets) + edge logs + Email Routing.
3. **Resend** — outbound e-mail delivery for magic-link OTPs (via Supabase custom SMTP).

---

## 2. Legal framework

**Art. 28 Abs. 3 DSGVO** — signed data processing agreements (DPAs / AVVs) in place for all three processors. Archived in `docs/COMPLIANCE/DPA/` (gitignored).

**Art. 46 Abs. 2 lit. c DSGVO** — transfers to the US are based on Standard Contractual Clauses (EU Implementing Decision 2021/914, **Module 2 — controller to processor**). The SCCs are embedded in the respective DPAs and activated on acceptance.

**Schrems II** (CJEU C-311/18, Data Protection Commissioner v. Facebook Ireland) — requires the controller to assess whether the SCCs, in combination with any supplementary technical and organisational measures, provide "essentially equivalent protection" to EU-internal processing. This document is that assessment.

---

## 3. Per-processor assessment

### 3.1 Supabase Inc.

| Dimension | Detail |
|---|---|
| Role | Primary backend: auth + Postgres + Edge Functions |
| Data categories transferred | Email address, AES-GCM-256 ciphertext (encrypted user practice state), per-user 16-byte salt, `updated_at` timestamp, auth logs (IP + user-agent + timestamp + OTP action outcome) |
| Retention (per VVT) | Email + ciphertext until account deletion or 24-month inactivity auto-delete (pg_cron job `adze-cleanup-inactive-users`); auth logs ~90 days (Supabase default) |

**Technical measures mitigating third-country risk**

- **Client-side E2E encryption** is the primary mitigation. The AES-GCM-256 key is derived via PBKDF2-SHA256 with 600,000 iterations (OWASP 2023 recommendation) from a passphrase held only on the user's device. The derived key is non-extractable (Web Crypto `CryptoKey` with `extractable=false`) and lives only in the tab's memory. Supabase receives opaque ciphertext bytes + per-user salt + `updated_at` timestamp — never plaintext. Any FISA 702 / Executive Order 12333 / CLOUD Act compelled-disclosure demand against Supabase can only produce what Supabase has: **encrypted blobs + email addresses + auth metadata**, not practice content.

- **Row-level security** (RLS) on `public.user_state`: `select` / `insert` / `update` policies scope all operations by `auth.uid() = user_id`. Even a malicious authenticated user cannot access another user's ciphertext. Enforced at the database layer, not at the application layer.

- **Minimal-privilege Edge Function pattern**: `delete-account` Edge Function verifies the caller's JWT, derives user identity from the JWT (never from the request body), uses the service-role key only for the privileged deletes. See `supabase/functions/delete-account/index.ts`.

- **Service-role key isolation**: held only in the Edge Function environment (Deno runtime, Supabase-managed secret). Never referenced in client code.

**Residual risk**

Compelled disclosure can expose: the email address used for sign-up, account-creation timestamp, last-sign-in timestamp, approximate session frequency (via auth logs). For practitioners using a privacy-relay email alias (Apple / DuckDuckGo / SimpleLogin), even the email is indirection-protected.

**Processor privacy posture**

- Self-certified under the **EU-US Data Privacy Framework** (verifiable at https://www.dataprivacyframework.gov).
- Publishes transparency reports quarterly (government-request volumes).
- Has challenged overbroad government requests in US federal court.

**Conclusion**

For Adze practice content, **essentially equivalent protection is achieved** via E2E encryption — the SCCs cover the metadata tier, the encryption covers the content tier. The residual-risk surface (email + auth metadata) is minimisable by the data subject's own choice of email alias, and is disclosed in the Datenschutzerklärung (Art. 13) so the user can make an informed choice.

---

### 3.2 Cloudflare Inc.

| Dimension | Detail |
|---|---|
| Role | Web hosting (Workers with static assets), edge logs, Email Routing for feedback@adze.life |
| Data categories transferred | Visitor IP address, User-Agent header, request path + timestamp (edge logs); inbound e-mail headers + body for the feedback-routing path |
| Retention (per VVT) | Edge logs ~30 days (Cloudflare default); no retention extension configured |

**Technical measures mitigating third-country risk**

- **No user practice content transits Cloudflare** for the hosting path. Cloudflare Workers serves static assets (HTML, vendored JS, CSS, content JSON). All user data flow goes directly to Supabase via HTTPS; Cloudflare is out of that path.

- **Vendored third-party JavaScript** (Tailwind Play CDN runtime, Supabase JS SDK) — self-hosted under `src/vendor/` since v15.12.0 precisely to avoid visitor-IP transfer to third-party CDNs. Content-Security-Policy `script-src 'self'` enforces this at the browser.

- **Email Routing path** (feedback@adze.life → operator ProtonMail inbox): Cloudflare handles inbound MTA routing. Message bodies contain whatever the user typed in the in-app mailto draft + basic device context (version, viewport, stage, shadow) that the user could see and edit before clicking send in their own mail client. No silent data extraction.

- **No CDN cache of sensitive responses**: the service worker explicitly excludes `*.supabase.co` from the cache layer (see `src/sw.js`).

**Residual risk**

Cloudflare can, over any 30-day window, read: visitor IPs visiting adze.life, User-Agent strings, request paths (HTTP 1.1 visibility — HTTPS protects body + query but reveals path). No practice content is visible at any layer.

**Processor privacy posture**

- Self-certified under the **EU-US Data Privacy Framework**.
- Publishes quarterly transparency reports.
- Has a documented history of challenging government requests, including winning an NSL-gag-order case in 2017 (EFF partnership).
- Offers **EU Data Boundary** as an add-on on Business+ plans. **Follow-up action**: evaluate whether Adze's Cloudflare plan tier supports enabling EU Data Boundary; if yes, enable it to narrow the transfer surface further.

**Conclusion**

**Essentially equivalent protection is achieved** for practice content (zero content transfer). For visitor-metadata transfer, the 30-day retention + no-content-access posture + Cloudflare's transparency record means the residual risk is bounded and proportionate.

---

### 3.3 Resend

| Dimension | Detail |
|---|---|
| Role | Outbound e-mail delivery for magic-link OTPs |
| Data categories transferred | Recipient e-mail address, OTP code (in transit only — single-use, ~1-hour expiry), delivery-status metadata (bounce, opened, etc.) |
| Retention (per VVT) | Per Resend's standard policy; recipient address retained for delivery-log purposes, OTP content is transient |

**Technical measures mitigating third-country risk**

- **Ephemeral content**: OTPs are single-use and expire after ~1 hour (Supabase Auth default). An OTP intercepted by any party is worthless after that window.

- **No practice content** (reflections, journal entries, diagnostic answers, saved quotes) ever passes through Resend. Only transactional sign-in codes.

- **TLS in transit** throughout (Supabase → Resend API → recipient SMTP server). Modern ciphers only.

**Residual risk**

Resend retains: recipient email addresses + delivery metadata + bounce status. Over time this accumulates into a "has signed into Adze" roster keyed by email. Mitigated for practitioners using privacy-relay emails.

**Processor privacy posture**

- Younger company (founded 2023). EU-US Data Privacy Framework certification: **verify and archive current status with the DPA download** (follow-up action).
- SCCs Module 2 explicitly referenced in the Resend DPA.

**Conclusion**

**Essentially equivalent protection is achieved.** The data flow is minimal (email addresses + transient OTPs), the content is ephemeral by design, and no practice content is in scope.

---

## 4. Overall conclusion

Transfers to Supabase, Cloudflare, and Resend under SCCs Module 2 + the technical and organisational measures documented above **provide essentially equivalent protection** to EU-internal processing for the purposes of Art. 46 DSGVO and Schrems II.

The architectural spine is **encryption-first**: practice content is encrypted on the user's device before it ever leaves, and the three processors collectively see only metadata (email + session metadata + IP + timestamp). This means that in the worst-case scenario of a US government compelled-disclosure demand against any of the three processors, the scope of compelled disclosure is bounded to:
- a list of email addresses registered for Adze (Supabase, Resend),
- approximate session/access patterns per email (Supabase auth logs + Resend delivery logs),
- anonymised visitor IP ranges per calendar window (Cloudflare edge logs),

and **never** to the reflections, journals, or diagnostic answers that constitute the sensitive practice content. This architectural property is not cosmetic — it is the load-bearing reason the transfers are lawful under Schrems II.

---

## 5. Review schedule + change log

This TIA is reviewed:
- On any **material architectural change**: adding a new processor, changing the role of an existing one, introducing a new category of transferred data, changing a retention window, or losing a mitigating measure (e.g. if E2E encryption were ever weakened).
- On any **relevant new ECJ ruling** or EDPB / DSK guidance that affects the Schrems II equivalence analysis.
- **Annually** on 2027-04-19 regardless.

### Change log

| Date | Reviewer | Change |
|---|---|---|
| 2026-04-19 | Dirk (solo operator) | Initial draft. Covers Supabase, Cloudflare, Resend under current architecture (de7beb0). |
