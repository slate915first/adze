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
