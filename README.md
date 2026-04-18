# Adze · The Path of Awakening

A small web app for keeping a daily meditation practice. Rooted in the Theravāda tradition — the early Buddhist canon, the five hindrances the Buddha named under the Bodhi tree. Listens before it recommends, recommends before it teaches.

🪷 **Live:** [https://adze.life](https://adze.life)
🔒 **Privacy:** end-to-end encrypted. Your reflections never leave your browser unencrypted. Even the maintainer cannot read your data on the server.
🧪 **Status:** closed beta — invitation only. Email [hello@adze.life](mailto:hello@adze.life) to request access.

---

## What it is

Three layers, woven:

- **A practice journal** — daily reflections, what came up, what you noticed.
- **A diagnostic** — a short, honest self-assessment that shapes what the engine surfaces for you.
- **A game scaffolding** — Māra's ten armies, characters from the Buddha's circle, ranks along the path. The game is there to keep practice alive when discipline is fragile. When it stops being useful, set it down.

A curated sutta library underpins all of it. New suttas land most weeks.

## How it's built

Static web app, no build step. Served from `src/` directly.

- **Frontend** — vanilla JavaScript loaded as 57 ordered `<script>` tags from `src/index.html`. Tailwind via CDN. No npm, no bundler.
- **Layers** — `src/engine/` (pure functions), `src/systems/` (stateful modules), `src/render/` (view rendering), `src/modals/` (modal UIs), `src/content/` (suttas + JSON config + strings).
- **Data** — anonymous mode keeps everything in `localStorage`. Optional sync stores AES-GCM-256 ciphertext (PBKDF2-SHA256 @ 600k iters) in a Supabase `user_state` row scoped by Postgres row-level-security policies. The encryption passphrase never leaves your browser.
- **Hosting** — Cloudflare Workers via `wrangler.toml` with `[assets]` pointing at `./src` and SPA fallback to `index.html`. Auto-deploys on push to `main`.
- **Email** — Resend for outbound (Supabase auth via custom SMTP). Cloudflare Email Routing for inbound.

## Run it locally

```bash
cd src && python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). No build, no install, no dependencies.

## Documentation

- [`docs/ROADMAP.md`](docs/ROADMAP.md) — current focus, stages, open items.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — architectural decision records (ADRs).
- [`docs/VERSIONING.md`](docs/VERSIONING.md) — release workflow and version policy.
- [`docs/CHIP-INTERPRETATION.md`](docs/CHIP-INTERPRETATION.md) — how the chip-based diagnostic interpretation maps to factor bumps and flags.
- [`docs/BETA-GUIDE.md`](docs/BETA-GUIDE.md) — for beta testers.
- [`docs/REVIEW.md`](docs/REVIEW.md) — production-readiness audit.
- [`docs/POSTMORTEMS.md`](docs/POSTMORTEMS.md) — honest record of bugs that reached users and the practices we adopted to stop them recurring.
- [`CHANGELOG.md`](CHANGELOG.md) — what shipped in each release.

## Contributing

Adze is a one-maintainer project. If you'd like to contribute (a sutta translation, a bug fix, a teaching idea) — open an issue first to talk through fit before opening a pull request. The `docs/DECISIONS.md` file is a good first read; nothing in the project is accidental, and most decisions have a written reason.

## Reporting a security issue

See [`SECURITY.md`](SECURITY.md). Please do not open a public issue for security findings — write to security@adze.life directly.

## License

[MIT](LICENSE). Use freely; the practice is the point.

---

> *"Whatever your tradition or teacher, this is a complement, not a replacement. If your practice is already deep, use this lightly. If you are beginning, use this as a companion — but the real teacher is the sit itself."*
