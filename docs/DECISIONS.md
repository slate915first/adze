# Decisions (ADR-lite)

One entry per architectural decision. Lightweight Architecture Decision Record format: **Context** → **Choice** → **Why** → **Consequences**. Numbered, append-only; supersede by adding a new entry that references the old one.

---

## ADR-1 · Separate E2E passphrase from account password (2026-04-17)

**Context.** Initial Stage 2 design used the Supabase account password *as* the E2E encryption key. OAuth (Apple, Google) was incompatible with this: OAuth sign-in has no password to derive a key from.

**Choice.** Two independent secrets: a Supabase account password (resettable by email) and a separate E2E passphrase (not recoverable). OAuth users will hit a forced passphrase-setup step on first sign-in.

**Why.** Preserves E2E privacy while unblocking OAuth. Email-based recovery of the E2E passphrase would break E2E; making them separate keeps the account usable after a passphrase loss (user wipes and resets the ciphertext).

**Consequences.** Users must remember two things. UI copy must make the "lose passphrase = lose synced data" contract unmissable.

---

## ADR-2 · Encryption primitives (2026-04-17)

**Context.** Stage 2 requires client-side E2E encryption of practice data before it leaves the browser.

**Choice.** PBKDF2-SHA256 @ 600,000 iterations (OWASP 2026 guidance) derives a non-extractable AES-GCM-256 key from passphrase + 16-byte random salt. IV (12 bytes) is generated per encryption and prepended to the ciphertext; the whole blob is base64-encoded for transport. Web Crypto API only; zero third-party dependencies.

**Why.** Industry-standard primitives; spec-compliant; available natively in every modern browser. Non-extractable keys mean even the page's own JS cannot exfiltrate the key.

**Consequences.** Cannot change iteration count without a migration (old ciphertext would be unreadable). Must bump iteration count periodically as hardware improves (OWASP recommends re-evaluating at least every ~2 years).

---

## ADR-3 · No cloud LLM for user text in Stages 2–3 (2026-04-18)

**Context.** Adze's privacy story is load-bearing: Li May and other beta testers are writing personal reflections, diagnostic answers, and optional text about physical concerns / anxieties. Interpreting that text with a cloud LLM would send it outside the user's device, contradicting the E2E narrative.

**Choice.** No cloud LLM calls on user text in Stages 2–3. If ever introduced in Stage 4+, it must be a clearly gated opt-in with a "this text leaves your device" disclosure.

**Why.** The privacy story is not a side-feature — it is the product's fundamental stance. Sending reflections to OpenAI/Anthropic/etc. logs would make that claim false.

**Consequences.** Interpretation of user input must be local. See ADR-4.

---

## ADR-4 · Chip-based local interpretation for optional setup questions (2026-04-18)

**Context.** Phase 2 optional questions (physical concerns, nervousness, what stopped practice) were free-text only. Engine did not interpret them, which is both honest and a missed opportunity for personalized guidance.

**Choice.** Replace free-text with curated **suggestion chips** per question, each mapped to a known diagnostic dimension (e.g. "knees" → `physical_concern.lower_body`; "forgetting" → `habit_friction.memory`; "not doing it right" → `doubt_diagnostic.competence`). An optional free-text "other" field is kept but not interpreted, just stored for the user's own reflection. Interpretation runs locally and deterministically.

**Why.** Chips are easier to engage than a blank text box, produce structured data the engine can actually use, keep interpretation local, and avoid the LLM privacy tradeoff (ADR-3).

**Consequences.** Requires designing the chip taxonomy up-front. Adds a mapping layer in `engine/` or `systems/diagnostics.js`. Translations (de, ms) must include the chip labels.

---

## ADR-5 · Cloudflare Workers (not Pages) for deploy (2026-04-18)

**Context.** Cloudflare merged the Pages product into the Workers flow; there is no longer a separate Pages UI in newer accounts. Deployment for a static-only site now goes through `wrangler deploy`.

**Choice.** Commit a minimal `wrangler.toml` to the repo root with `[assets]` pointing at `./src` and `not_found_handling = "single-page-application"`.

**Why.** Matches the path Cloudflare is steering all users onto. SPA fallback lets any client-side route resolve to `index.html`.

**Consequences.** Adze is technically a "Worker" now rather than a "Pages project"; configuration lives in `wrangler.toml` rather than Cloudflare's dashboard. Build command is empty (no bundler).

---

## ADR-6 · Public GitHub repo (2026-04-18)

**Context.** Privacy claims are load-bearing; beta testers should be able to verify them.

**Choice.** Public repo at https://github.com/slate915first/adze. Supabase anon key remains in `src/systems/auth.js` (it is publishable by design — RLS policies protect data).

**Why.** Transparency. Anyone can read the crypto code and verify that the passphrase never leaves the browser.

**Consequences.** `.claude/` and `.mcp.json` live in `.gitignore` to avoid leaking workspace metadata. Commit author email is the GitHub noreply alias (`277129594+slate915first@users.noreply.github.com`) to keep the real email off public commits.

---

## ADR-7 · Server-side user data is a projection, never a source of truth (2026-04-19)

**Context.** The Sangha design work (2026-04-19 three-lens review in `docs/SANGHA-DESIGN.md` + `docs/COMPLIANCE-LOG.md`) surfaced a class of architectural hazard: introducing Supabase tables that store un-encrypted personal data *about* a user would create a second source of truth next to the E2E-encrypted `user_state` ciphertext. Every subsequent feature then has to keep the two in sync, and any drift becomes a silent data-integrity bug or — worse — a privacy leak where the server sees what the passphrase was supposed to hide. The same concern had been implicit since Stage 2 but was never written down, so `REVIEW.md`, `.claude/agents/senior-engineer.md`, and `docs/COMPLIANCE-LOG.md` (Track B1) all cite a rule that had no canonical source. This ADR is that source.

**Choice.** Server-side unencrypted user data is **always a write-through projection of the encrypted state**, never a source of truth read by the owning client for own-rendering.

Concretely:
- The authoritative copy of any practice data, preference, reflection, quote-save, diagnostic answer, or character-state is the AES-GCM-encrypted `user_state.ciphertext` blob. The owning client reads from the decrypted blob.
- If a future feature needs *other users* (or the server itself) to read some subset of a user's data, that subset is **projected** to a separate table (e.g. the hypothetical `sangha_profiles` if Sangha ever unparks). The projection is populated only via a write-through pipeline keyed off successful `passphrasePushState`. The client never reads its own data back from the projection — the encrypted blob remains the source.
- Server-side metadata that is not about a user (provider logs, aggregate counters, rate-limit records) is out of scope and can be stored straightforwardly.

**Why.**
1. **Privacy**: the E2E contract — "only the user can read their reflections" — is load-bearing. A second unencrypted copy silently breaks the contract the moment it exists.
2. **Data integrity**: two sources of truth mean divergence is a when, not an if. Projection-only means the encrypted blob is always authoritative and the projection can always be rebuilt.
3. **Reversibility**: a projection table can be dropped without losing user data. A source-of-truth table cannot.
4. **Compliance**: DSGVO Art. 17 (right to erasure) is trivial on a projection (`drop row`). On a shared source of truth it becomes an audit.

**Consequences.**
- **Any new Supabase table that stores user-identifiable content is a violation** unless its design explicitly names itself as a projection, names the write-through trigger, and documents how it rebuilds from the encrypted blob.
- `REVIEW.md` escalates violations of this rule to **Important** severity; `senior-engineer` and `security-reviewer` agents are instructed to flag them.
- If Sangha ever unparks, the design in `docs/SANGHA-DESIGN.md` — which introduces `sangha_profiles` / `sangha_bonds` / `sangha_events` — is only compatible with ADR-7 if those tables are **strictly** projections populated through a write-through pipeline, never read back by the owning client for its own rendering. The agent briefs for the Sangha rollout already bake this in.
- The Edge Function `delete-account` is idiomatic under this rule: it mirrors the client-side deletion pattern (allowlist → auth.users cascade → user_state gone) without needing to know the projection's shape.
- `cleanup_inactive_users` (pg_cron) is also idiomatic: it operates on `auth.users.last_sign_in_at` + `user_state.updated_at` and cascades cleanly; there is no separate projection to reconcile.
