// ============================================================================
// src/modals/beta-guide.js
// ----------------------------------------------------------------------------
// v15.0 — A six-card swipeable modal shown once to every new beta tester
// after they finish onboarding. Re-openable anytime from Settings → "About
// Adze · Beta guide".
//
// Same content as docs/BETA-GUIDE.md (the long-form version), broken into
// six bite-sized cards for first-run reading. Mirrors the parchment-gold
// visual language so it doesn't feel "out of game" — but the eyebrow
// "Closed beta · for testers" makes it clear this is meta-content.
//
// State: seenBetaGuide (boolean) on state. Set to true on dismiss. Migrated
// to false in state.js for users predating this modal.
// ============================================================================

const BETA_GUIDE_CARDS = [
  {
    icon: '☸️',
    title: 'What Adze is',
    body: `
      <p class="mb-3">A meditation companion rooted in the Theravāda tradition. The early Buddhist canon, the Pāli suttas, the five hindrances the Buddha named under the Bodhi tree.</p>
      <p class="mb-2">Three things, layered:</p>
      <ul class="space-y-1 list-disc pl-5 text-amber-100/85">
        <li><b>A practice journal</b> — daily reflections.</li>
        <li><b>A diagnostic</b> — short, honest self-assessment that shapes what's surfaced for you.</li>
        <li><b>A game scaffolding</b> — Māra's armies, the eightfold path, characters from the Buddha's circle. Useful in the early days; set it down when it stops being.</li>
      </ul>
    `
  },
  {
    icon: '🛠️',
    title: "What's still rough",
    body: `
      <p class="mb-3">This is closed beta. Three honest expectations:</p>
      <ol class="space-y-2 list-decimal pl-5 text-amber-100/90">
        <li><b>You will find bugs.</b> Some obvious; some only because you use the app your way. Both equally useful.</li>
        <li><b>The recommendations are early.</b> The engine is rule-based and small. Your push-back is the main way it gets better.</li>
        <li><b>Content is being added weekly.</b> Suttas, teaching quotes, diagnostic copy — all under active editing.</li>
      </ol>
      <p class="mt-3 text-[12px] text-amber-100/65 italic">See what shipped between sessions: <a href="https://github.com/slate915first/adze/blob/main/CHANGELOG.md" target="_blank" class="text-amber-300 underline">CHANGELOG.md</a>.</p>
    `
  },
  {
    icon: '💬',
    title: 'How to give feedback',
    body: `
      <p class="mb-3">Bottom-right of every screen: the <b>💬 button</b>. Two modes:</p>
      <ol class="space-y-2 list-decimal pl-5 text-amber-100/90">
        <li><b>General feedback</b> — a form. Bug, idea, asking for help, praise. Opens a draft in your mail app.</li>
        <li><b>Element feedback</b> — toggle on. Every interactive thing gets a dashed outline. Click the exact element your reaction is about. The form pre-fills with its location.</li>
      </ol>
      <p class="mt-3">Or just reply to any email I send you, or write to <a href="mailto:hello@adze.life" class="text-amber-300 underline">hello@adze.life</a>.</p>
    `
  },
  {
    icon: '🎯',
    title: 'Test the recommendations',
    body: `
      <p class="mb-3">The most useful thing you can do.</p>
      <p class="mb-3">Adze will recommend a duration, a focus, a first sutta. <b>None of these are sacred.</b> They come from a small set of rules and will sometimes be wrong for you.</p>
      <p class="mb-2">What helps:</p>
      <ul class="space-y-1 list-disc pl-5 text-amber-100/90">
        <li><b>Try different "experience" levels</b> in setup — see what surfaces for "Never sat" vs. "Years of practice". Which feels right? Which mismatches?</li>
        <li><b>Push back on suggestions that feel off</b> with the 💬 button on that exact element. Tell me <i>why</i> — too advanced, too basic, wrong tradition, tone-deaf?</li>
        <li><b>Notice what's missing.</b> If a recommendation didn't speak to where you actually are, that gap is the real signal.</li>
      </ul>
      <p class="mt-3 text-[12px] text-amber-100/65 italic">You are more authoritative than the heuristics in the engine.</p>
    `
  },
  {
    icon: '🌱',
    title: "You're shaping this",
    body: `
      <p class="mb-3">Three reasons your feedback matters more than you think:</p>
      <ul class="space-y-2 list-none pl-0 text-amber-100/90">
        <li><b class="text-amber-200">Variety —</b> Each tester finds friction nobody else does. Your particular setup uncovers a path nobody else has walked. The bug you find is one I'd otherwise ship.</li>
        <li><b class="text-amber-200">Direct loop —</b> I read every report personally. Most get a reply within a day or two. Many shape the next release.</li>
        <li><b class="text-amber-200">Significance —</b> Five to fifteen people deciding what this is. Without your push-back, Adze stays my private project. With it, it becomes ours.</li>
      </ul>
      <p class="mt-3 text-[12px] text-amber-100/65 italic">A single line — "this felt wrong" with a screenshot — is more valuable than polite silence.</p>
    `
  },
  {
    icon: '🔒',
    title: 'Privacy, and how to reach me',
    body: `
      <p class="mb-3">Your reflections, your diagnostic answers, anything you've typed — all encrypted in your browser before it leaves your device. The passphrase never leaves your browser. <b>Even I cannot read your data on the server.</b></p>
      <p class="mb-3">Full technical details: <i>Settings → Account &amp; sync → "How encryption works"</i>.</p>
      <p class="mb-3"><b>If you forget the passphrase, your synced data is unrecoverable.</b> The account survives, but the encrypted blob is gone. Write the passphrase down somewhere safe.</p>
      <p class="mt-4">For anything — bugs, questions, frustrations, just to say hello — <a href="mailto:hello@adze.life" class="text-amber-300 underline">hello@adze.life</a>.</p>
      <p class="mt-3 text-amber-200">— Dirk</p>
    `
  }
];

function openBetaGuide() {
  view.modal = { type: 'beta_guide', cardIdx: 0 };
  renderModal();
}

function renderBetaGuideModal(m) {
  const idx = Math.max(0, Math.min(BETA_GUIDE_CARDS.length - 1, m.cardIdx || 0));
  const card = BETA_GUIDE_CARDS[idx];
  const total = BETA_GUIDE_CARDS.length;
  const isLast = idx === total - 1;
  const isFirst = idx === 0;
  const dots = BETA_GUIDE_CARDS.map((_, i) => {
    const cls = i === idx
      ? 'bg-amber-300 ring-2 ring-amber-200/40'
      : (i < idx ? 'bg-amber-400/70' : 'bg-amber-800/60');
    return `<span class="inline-block w-2 h-2 rounded-full ${cls}"></span>`;
  }).join('<span class="inline-block w-1"></span>');

  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-[10px] uppercase tracking-widest text-amber-300/70 mb-1">Closed beta · for testers</div>
        <div class="text-4xl mb-1">${card.icon}</div>
        <h2 class="text-xl font-bold gold-text">${card.title}</h2>
      </div>

      <div class="parchment rounded-xl p-4 mb-4 text-sm text-amber-100/90 serif leading-relaxed">
        ${card.body}
      </div>

      <div class="flex items-center justify-between mb-3">
        <div class="text-[10px] tracking-widest text-amber-300/65">${idx + 1} · ${total}</div>
        <div>${dots}</div>
      </div>

      <div class="flex items-center justify-between gap-2">
        <button class="btn btn-ghost text-sm ${isFirst ? 'opacity-30 pointer-events-none' : ''}" onclick="betaGuidePrev()">← Back</button>
        <div class="flex items-center gap-2">
          ${isLast ? '' : `<button class="btn btn-ghost text-xs" onclick="dismissBetaGuide()">Skip</button>`}
          <button class="btn btn-gold text-sm" onclick="${isLast ? 'dismissBetaGuide()' : 'betaGuideNext()'}">${isLast ? 'Begin practice →' : 'Next →'}</button>
        </div>
      </div>
    </div>
  `;
}

function betaGuideNext() {
  if (!view.modal || view.modal.type !== 'beta_guide') return;
  const next = (view.modal.cardIdx || 0) + 1;
  if (next >= BETA_GUIDE_CARDS.length) return;
  view.modal.cardIdx = next;
  view._resetModalScroll = true;
  renderModal();
}

function betaGuidePrev() {
  if (!view.modal || view.modal.type !== 'beta_guide') return;
  const prev = (view.modal.cardIdx || 0) - 1;
  if (prev < 0) return;
  view.modal.cardIdx = prev;
  view._resetModalScroll = true;
  renderModal();
}

function dismissBetaGuide() {
  if (state) {
    state.seenBetaGuide = true;
    if (typeof saveState === 'function') saveState();
  }
  closeModal();
  if (typeof render === 'function') render();
}

// Trigger from boot or from render(): show the guide once after onboarding.
function maybeShowBetaGuide() {
  if (!state || !state.setupComplete) return;
  if (state.seenBetaGuide) return;
  if (view.modal) return;       // don't stack on top of another modal
  if (view.setupStep != null && view.setupData && view.setupData.mode) return; // mid-setup transition guard
  openBetaGuide();
}
