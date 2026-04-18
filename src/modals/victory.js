// ============================================================================
// src/modals/victory.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'victory'.
// The dispatch now calls renderVictoryModal(m). All strings resolve via t().
// ============================================================================

function renderVictoryModal(m) {
  let content = '';

    content = `
      <div class="text-center fade-in">
        <div class="text-8xl mb-4 breath">☸️</div>
        <h2 class="text-4xl font-bold gold-text mb-2">${t('victory.heading')}</h2>
        <p class="text-xl text-amber-200 italic mb-4">${t('victory.buddha_quote')}</p>
        <p class="text-xs text-amber-300/70 mb-6">${t('victory.buddha_attribution')}</p>
        <div class="parchment rounded-xl p-5 mb-4 text-left">
          <p class="text-amber-100 leading-relaxed mb-3">
            ${t('victory.body_1')}
          </p>
          <p class="text-amber-100/80 leading-relaxed text-sm">
            ${t('victory.body_2')}
          </p>
          <p class="text-amber-100 leading-relaxed mt-3">
            ${t('victory.body_3')}
          </p>
        </div>
        <button class="btn btn-gold" onclick="closeModal();view.tab='today';render()">${t('victory.honor_walk_button')}</button>
      </div>
    `;

  return content;
}
