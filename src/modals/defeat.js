// ============================================================================
// src/modals/defeat.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'defeat'.
// The dispatch now calls renderDefeatModal(m). All strings resolve via t().
// ============================================================================

function renderDefeatModal(m) {
  let content = '';

    // v11.1 — softened. Not "defeat" in a dramatic sense. The Buddha did not
    // lose when he walked away from Āḷāra Kālāma; he saw that the teaching
    // had taken him as far as it could. A shadow-rollover in the game is
    // just that: the current attempt has accumulated enough missed sits
    // that the old scaffolding has fallen. The rebuilding is the practice.
    content = `
      <div class="text-center fade-in">
        <div class="text-6xl mb-3">🌑</div>
        <h2 class="text-2xl font-bold text-amber-200 mb-2">${t('defeat.heading')}</h2>
        <p class="text-amber-100/80 italic mb-4 text-sm">${t('defeat.subtitle')}</p>
        <div class="parchment rounded-xl p-5 mb-4 text-left">
          <p class="text-amber-100 leading-relaxed text-sm mb-3 serif italic">
            ${t('defeat.sn22_101_quote')}
          </p>
          <p class="text-[11px] text-amber-300/60 text-right mb-4">${t('defeat.sn22_101_attribution')}</p>
          <p class="text-xs text-amber-100/75 leading-relaxed mb-3">${t('defeat.preamble')}</p>
          <p class="text-xs text-amber-100/75 leading-relaxed mb-2"><strong class="text-amber-200">${t('defeat.keep_label')}</strong></p>
          <ul class="text-xs text-amber-100/70 space-y-1 ml-4 mb-3">
            <li>• All ${state.wisdomCollected.length} wisdom scrolls collected</li>
            <li>• 30% of this attempt's XP carried into your permanent total</li>
            <li>• Your character, your sangha, your reflections — all preserved</li>
          </ul>
          <p class="text-xs text-amber-100/75 leading-relaxed">${t('defeat.begins_again')}</p>
        </div>
        <button class="btn btn-gold" onclick="restartQuest()">${t('defeat.button')}</button>
      </div>
    `;

  return content;
}
