# `docs/COMPLIANCE/` — Adze DSGVO compliance archive

Internal working folder. Some contents are committed; some are gitignored.

## What's here

| Path | Committed? | Purpose |
|---|---|---|
| `README.md` | ✓ | This file — folder rationale. |
| `TIA.md` | ✓ | Transfer Impact Assessment per Schrems II. Describes architecture + risk-mitigation for each US processor under SCCs Module 2. Produced on request from the Sächsischer Datenschutz- und Transparenzbeauftragter. |
| `DPA/*.pdf` | ✗ (gitignored) | Signed DPAs (Auftragsverarbeitungsverträge) per Art. 28 Abs. 3 DSGVO, one per processor (Supabase, Cloudflare, Resend). Business-contract PDFs — kept out of the public repo. |
| `incidents/*.md` | ✗ (gitignored) | Future breach-investigation files produced under the `docs/INCIDENT-RESPONSE.md` runbook. Will contain affected-user details, so gitignored from creation. |

## Why the split

Compliance *infrastructure* (what we promise, how we'd respond, which processors we use, why the transfer is legal) benefits from version control and disaster recovery — a regulator asking "when was this last reviewed?" gets a precise answer from git history.

Compliance *artefacts* (signed contracts, user-specific incident data) are sensitive documents that should live only on operator-local machines + encrypted backups.

## Companion documents outside this folder

- `docs/VVT.md` — Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) ← committed, no sensitive content
- `docs/INCIDENT-RESPONSE.md` — 72-hour breach runbook ← committed
- `docs/DATA-SUBJECT-REQUESTS.md` — Art. 15–22 runbook ← committed
- `docs/COMPLIANCE-LOG.md` — Track A/B/C action list ← committed

## When to update

- `TIA.md` — reviewed on any material change to processors, data categories, retention windows; annually otherwise.
- `DPA/*.pdf` — re-download if a processor updates their DPA; retain superseded copies until the old version is older than the retention window for any data processed under it.
- `incidents/*.md` — one file per incident; keep until statute-of-limitations + 1 year.
