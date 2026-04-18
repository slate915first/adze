# Security policy

Adze handles authentication and stores end-to-end encrypted user data. If you find a security issue, thank you for taking the time to look — and please report it before disclosing publicly.

## How to report

Email **security@adze.life** with:

- A description of the issue.
- Steps to reproduce, if you have them.
- Your assessment of impact (data exposure, account takeover, etc.).
- Whether you'd like to be credited in the fix announcement.

I will:

- Acknowledge receipt within **7 days**.
- Triage and respond with a plan within **14 days**.
- Fix critical issues as soon as possible (typically within 1–2 weeks).
- Credit you in the changelog if you'd like, by name or pseudonym.

I won't:

- Pursue legal action against good-faith security research.
- Share your report publicly without your permission.

## Scope

In scope:

- The hosted app at `https://adze.life`.
- The Supabase backend's RLS policies, schema, and Edge Functions (when added).
- The Cloudflare Worker configuration (`wrangler.toml`, `_headers`).
- The encryption flow: passphrase derivation, AES-GCM key handling, ciphertext storage.

Not in scope (please don't report):

- Third-party services Adze depends on (Supabase, Cloudflare, Resend) — report those to the respective vendors.
- Social engineering of the maintainer or testers.
- DDoS / rate-limit testing without prior coordination.
- Issues requiring physical access to a tester's unlocked device.

## Known limitations

Adze is a small project run by a single maintainer in good faith. It has not been audited by an external security firm. The encryption design uses standard primitives (AES-GCM, PBKDF2 with OWASP-recommended iteration counts), but the *integration* hasn't been independently reviewed. Read the source: `src/systems/crypto.js` and `src/systems/passphrase.js`. If you spot a flaw — please tell me.

## Public disclosure

After a fix ships, the issue + fix may be discussed in `CHANGELOG.md` with the level of detail that's safe to share. Sensitive details remain private.
