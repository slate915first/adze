// ============================================================================
// src/modals/rank-intro.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'rank_intro'.
// The dispatch now calls renderRankIntroModal(m). All strings resolve via t().
// ============================================================================

function renderRankIntroModal(m) {
  let content = '';

    // v13.6 — first-time introduction to the path-rank system. Fires once,
    // before the normal rank_announcement modal, when a practitioner reaches
    // any rank ≥ 1 for the first time. Dirk feedback: the Kalyāṇa-puthujjana
    // announcement appeared without context after the first reflection and
    // was disorienting. This explains the system before it starts surfacing.
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-5xl mb-2">☸️</div>
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('rank_intro.eyebrow')}</div>
          <h2 class="text-xl font-bold gold-text mt-1">${t('rank_intro.heading')}</h2>
        </div>
        <div class="parchment rounded-xl p-4 mb-3 text-left border-amber-700/40">
          <p class="text-sm text-amber-100/90 serif leading-relaxed mb-3">
            The Theravāda tradition names stages a practitioner moves through. The canonical names — <b>puthujjana</b> (worldling), <b>sotāpanna</b> (stream-enterer), <b>sakadāgāmī</b>, <b>anāgāmī</b>, <b>arahant</b> — describe what has fallen away from the mind, not what has been achieved. Before these, commentaries describe finer sub-stages: <b>andha-puthujjana</b> (the uninstructed worldling), <b>kalyāṇa-puthujjana</b> (the well-trained worldling who has heard the teaching and begun sīla), and so on.
          </p>
          <p class="text-sm text-amber-100/90 serif leading-relaxed mb-3">
            This tool will, from time to time, reflect back a rank based on your telemetry — sits held, reflections written, hindrance averages, gate conditions met. <b class="text-amber-200">This is descriptive, not an attainment claim.</b> The game says "you currently look like a well-trained worldling in the phase of establishing concentration"; it cannot say whether a fetter has fallen away, and it will not try.
          </p>
          <p class="text-sm text-amber-100/90 serif leading-relaxed">
            ${t('rank_intro.body_3')}
          </p>
        </div>
        <div class="parchment rounded-xl p-3 mb-3 text-left border-amber-700/30 bg-amber-950/15">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('rank_intro.shadow_eyebrow')}</div>
          <p class="text-xs text-amber-100/80 serif leading-relaxed">
            As your rank rises through the first five stages, Māra's pressure (what the game calls the Shadow) also rises — not as a punishment, but because the practice is working and his territory is being threatened. The Shadow floor peaks just before stream-entry — <i>"most practitioners give up here"</i> — and then falls with each noble stage. You may feel hindrances more strongly in the middle of the path; that is the design. The announcement cards will explain each transition when it happens.
          </p>
        </div>
        <p class="text-[11px] text-amber-100/55 italic mb-4 text-center">${t('rank_intro.caveat_note')}</p>
        <div class="text-center">
          <button class="btn btn-gold" onclick="acknowledgeRankIntro()">${t('rank_intro.acknowledge_button')}</button>
        </div>
      </div>
    `;

  return content;
}
