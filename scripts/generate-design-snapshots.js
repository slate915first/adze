#!/usr/bin/env node
/**
 * scripts/generate-design-snapshots.js
 *
 * Produces a drop-in folder at docs/design-snapshots/ that contains
 * everything a design reviewer (human or Claude Design) needs to
 * propose polish on Adze without having to clone, install, or boot
 * the app. Output:
 *
 *   docs/design-snapshots/
 *     ├── README.md              ← brief + index + the review prompt
 *     ├── styles.css             ← fresh copy of src/styles/styles.css
 *     ├── theme-calm.css         ← fresh copy of src/styles/theme-calm.css
 *     ├── welcome-classic-desktop.png
 *     ├── welcome-classic-mobile.png
 *     ├── welcome-calm-desktop.png
 *     ├── welcome-calm-mobile.png
 *     └── post-auth-capture.md   ← instructions for manual post-auth shots
 *
 * Welcome is automated because it renders without auth. Post-auth
 * surfaces (Today, Path, Settings, modals) need real state — captured
 * manually using the instructions in post-auth-capture.md. Low-effort
 * for Dirk (he's already signed in on his device) and keeps the
 * deliverable trustworthy (no fake seeded state that the designer
 * then critiques).
 *
 * Run with:
 *   node scripts/generate-design-snapshots.js
 * or (after the package.json script is wired):
 *   npm run snapshots
 */

const { chromium } = require('@playwright/test');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs', 'design-snapshots');
const PORT = 8765; // non-default to avoid collision with dev server on 8000

const THEMES = ['classic', 'calm'];
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 390, height: 844 },
};

async function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn(
      'python3',
      ['-m', 'http.server', String(PORT), '--directory', SRC],
      { stdio: 'ignore' }
    );
    server.on('error', reject);
    // Give it a moment to bind.
    setTimeout(() => resolve(server), 800);
  });
}

async function captureWelcome(browser) {
  for (const theme of THEMES) {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({
        viewport: vp,
        deviceScaleFactor: 2, // retina quality
      });
      // Seed the theme before first paint so the screenshot captures
      // the actual rendered state.
      await ctx.addInitScript((mode) => {
        try { localStorage.setItem('adze_theme', mode); } catch (_) {}
      }, theme);
      const page = await ctx.newPage();
      await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
      // Let the breath animation settle on a natural phase.
      await page.waitForTimeout(600);
      const outPath = path.join(OUT, `welcome-${theme}-${vpName}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
      console.log('  ✓', path.relative(ROOT, outPath));
      await ctx.close();
    }
  }
}

function copyCss() {
  fs.copyFileSync(
    path.join(SRC, 'styles', 'styles.css'),
    path.join(OUT, 'styles.css')
  );
  fs.copyFileSync(
    path.join(SRC, 'styles', 'theme-calm.css'),
    path.join(OUT, 'theme-calm.css')
  );
  console.log('  ✓ docs/design-snapshots/styles.css (copied)');
  console.log('  ✓ docs/design-snapshots/theme-calm.css (copied)');
}

function readAppVersion() {
  const loaders = fs.readFileSync(path.join(SRC, 'data', 'loaders.js'), 'utf8');
  const m = loaders.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
  return m ? m[1] : 'unknown';
}

function writeReadme() {
  const version = readAppVersion();
  const timestamp = new Date().toISOString().slice(0, 10);
  const content = `# Adze · design-review drop-in folder

Generated **${timestamp}** from Adze **v${version}**.
Re-run with \`npm run snapshots\`.

This folder is the complete context a designer (human or Claude Design)
needs to propose polish on Adze. Drop the whole folder in.

---

## What's in the box

| File | What |
|---|---|
| \`README.md\` | This file — brief + index + the review prompt. |
| \`styles.css\` | Current state of \`src/styles/styles.css\`. The \`:root\` block at the top is the **entire theme vocabulary** (~50 tokens across color, duration, radius, typography). |
| \`theme-calm.css\` | The Calm theme overlay. Shows the override pattern: \`:root[data-theme="calm"] { --token: newvalue; }\`. A third theme is a new file in this shape. |
| \`welcome-classic-desktop.png\` | Welcome page, 1280×900, classic (default) theme. Retina. |
| \`welcome-classic-mobile.png\` | Welcome page, 390×844 (iPhone 13-sized), classic. |
| \`welcome-calm-desktop.png\` | Welcome page, 1280×900, Calm theme. |
| \`welcome-calm-mobile.png\` | Welcome page, 390×844, Calm. |
| \`post-auth-capture.md\` | Instructions for capturing post-auth surfaces (Today, Path, Settings, modals). Manual — takes ~5 min on the live site. |

## What Adze is

A Theravāda meditation practice journal — a daily sit-and-reflect app
rooted in the early Buddhist canon. Three layers: a practice journal,
a diagnostic, and a gentle game scaffolding (Māra's ten armies, ranks,
shadow bar) to keep practice alive when discipline is fragile.

Live at **https://adze.life**. Closed beta.

## Theme system

Two themes ship today:

- **Classic** (default): dark violet radial-gradient base, parchment-gold
  accents, red-for-Māra, Georgia serif. Dramatic, lotus-glow, ambient
  motion (breath, shimmer, pulse-glow).
- **Calm** (\`:root[data-theme="calm"]\`): warm unfinished-teak surfaces,
  dusty amber path, oxidized-iron (not fire-red) Māra, robed indigo-grey
  sangha, forest-moss released. Ambient motion suppressed; breath survives
  because it IS the practice.

Both themes ship from the same codebase via token overrides. Nothing
engine-driven is hidden in Calm — the shadow bar, Next Step CTA, and
banners all still render. Only the theatrical amplification is dimmed.

## Token surface (~50 tokens)

Everything a theme can change lives in the \`:root\` block at the top
of \`styles.css\` (lines ~10–120):

- **Color** (~30 tokens): \`--surface-*\`, \`--path-*\`, \`--parchment-*\`,
  \`--mara-*\`, \`--sangha-rgb\`, \`--released-rgb\`, \`--ember\`,
  \`--dread-rgb\`. Opaque tokens as hex; alpha families as RGB triplets
  used via \`rgba(var(--foo-rgb), 0.5)\`.
- **Motion** (13 tokens): \`--dur-fast/medium/slow\`, \`--dur-tooltip\`,
  \`--dur-stage\`, \`--dur-scroll-reveal\`, \`--dur-float-up\`,
  \`--dur-pulse-glow\`, \`--dur-breath\`, \`--dur-ember\`,
  \`--dur-shimmer-fast/slow\`, \`--dur-danger-pulse\`. Stored in \`ms\`;
  rule bodies reference via \`var(--dur-*)\`.
- **Radius** (6): \`--radius-pill/xs/sm/md/card/fab\`.
- **Typography** (2): \`--font-serif\`, \`--font-sans\`.
- **Dials** (2): \`--dread-weight\`, \`--shadow-overlay-weight\` —
  multipliers on the body::before / body::after overlays so a calm
  theme can keep the shadow bar honest while dimming the full-screen
  darkening.

## Prompt for the reviewer

Paste this above your attachment:

> Attached: the current \`styles.css\`, \`theme-calm.css\`, and screenshots
> of the welcome page in both themes (desktop + mobile). This is a
> Theravāda meditation journal in closed beta. Classic is the existing
> dark-violet look (preserve visually unchanged); Calm is a
> forest-tradition overlay that ships today. Review for POLISH only:
>
> 1. Contrast ratios (WCAG AA minimum) in Calm — the warm teak + amber
>    combination needs verification.
> 2. Typographic hierarchy on Welcome — chip weight vs legal links vs
>    primary CTA.
> 3. Chip visual weight (footer "Visual · Classic · Calm") — quiet
>    enough that a first-time user's eye goes to the CTA, findable
>    enough that a returning user spots it. Nail or break?
> 4. Whether Calm successfully conveys *passaddhi* (Pāli: tranquility)
>    without becoming a sage-and-linen wellness skin. The distinction
>    matters — Adze is not Headspace.
> 5. Token-level suggestions only — give me a list of
>    \`--token-name: new-value;\` lines I can paste into styles.css or
>    theme-calm.css. Do not propose layout changes, new components,
>    or renamed classes — the architecture is settled.
>
> Keep response under 15 short bullets. Prioritize by impact.

## Viewport notes

- Desktop (1280×900) is representative of a laptop. Adze has a
  \`max-w-md mx-auto\` content cap for most surfaces, so the actual
  content width is similar on desktop and mobile.
- Mobile (390×844) matches iPhone 13 / 14. The welcome footer chip row
  is the tightest spacing constraint — it must not wrap into a second
  row at this width.
`;
  fs.writeFileSync(path.join(OUT, 'README.md'), content);
  console.log('  ✓ docs/design-snapshots/README.md');
}

function writePostAuthInstructions() {
  const content = `# Capturing post-auth surfaces

The automated script in this folder captures the welcome page because
it renders without sign-in. The other surfaces (Today, Path, Settings,
modals) need a real user state — seeding it artificially would produce
screenshots that look subtly wrong, and a designer critique of wrong
screenshots is worse than no screenshots.

Take these manually. **Expected time: 5 minutes.** Do it once per theme,
so 10 minutes total.

## Setup

1. Open Adze in a browser where you're signed in.
   - Production: \`https://adze.life\`
   - Local dev: \`cd src && python3 -m http.server 8000\` then \`http://localhost:8000\`
2. Settings → 🪷 Visual intensity → **Classic** (start here).

## Capture list — shoot each in both themes (6 shots × 2 = 12)

For each surface, use the browser's full-page screenshot:

- **macOS Safari**: \`File → Export as PDF\` or \`Cmd+Shift+4, Space, click window\`
- **macOS Chrome**: DevTools → \`Cmd+Shift+P\` → type "full size screenshot"
- **Firefox**: right-click page → "Take Screenshot" → "Save full page"

Save each with this naming: \`<surface>-<theme>-<viewport>.png\`
(e.g. \`today-classic-desktop.png\`, \`today-calm-mobile.png\`).

| # | Surface | How to get there | What to capture |
|---|---|---|---|
| 1 | Welcome (already automated) | Sign out first | — |
| 2 | Today tab | Tap the 🧭 tab | Full page — banner stack + three-column grid visible |
| 3 | Path tab | Tap the 🌸 Path tab | Full page — character block + rank badge + any army cards visible |
| 4 | Reflection tab | Tap the 🪞 Reflection tab | Full page — evening-close CTA + any badges |
| 5 | Settings tab | Tap the ⚙️ Settings tab | Scroll to the 🪷 Visual intensity card; capture a chunk that shows Points card + Theme card |
| 6 | A modal | Tap "Evening close" from Today or Reflection | Capture with the modal open |

Shoot desktop viewport (~1280 wide) first. Then resize to mobile
(~390 wide) and repeat. Or use DevTools' device-toolbar iPhone mode.

## Then

Switch Settings → Visual intensity → **Calm**, and repeat every capture.

## Drop it in

When all 24 PNGs are in this folder, the drop-in is complete. The
designer (or Claude Design) gets: welcome (auto) + 10 more surfaces
× 2 themes + both CSS files + the README brief. ~27 files total.
`;
  fs.writeFileSync(path.join(OUT, 'post-auth-capture.md'), content);
  console.log('  ✓ docs/design-snapshots/post-auth-capture.md');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  console.log('Copying CSS sources…');
  copyCss();

  console.log('Writing README + capture instructions…');
  writeReadme();
  writePostAuthInstructions();

  console.log(`Starting local server on :${PORT}…`);
  const server = await startServer();

  try {
    console.log('Launching headless Chromium…');
    const browser = await chromium.launch();
    try {
      console.log('Capturing welcome-page screenshots (4 total)…');
      await captureWelcome(browser);
    } finally {
      await browser.close();
    }
  } finally {
    server.kill();
  }

  console.log('\nDone. Drop-in folder is ready:');
  console.log(`  ${OUT}\n`);
  console.log('Next: capture post-auth surfaces per docs/design-snapshots/post-auth-capture.md');
  console.log('Then send the whole folder to Claude Design with the prompt in README.md.\n');
}

main().catch((e) => {
  console.error('\n✗ generate-design-snapshots failed:', e.message);
  process.exit(1);
});
