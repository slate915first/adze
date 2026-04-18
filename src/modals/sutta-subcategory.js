// ============================================================================
// src/modals/sutta-subcategory.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'sutta_subcategory'.
// The dispatch now calls renderSuttaSubcategoryModal(m). All strings resolve via t().
// ============================================================================

function renderSuttaSubcategoryModal(m) {
  let content = '';

    const sub = SUTTA_SUBCATEGORIES.find(s => s.id === m.subId);
    if (!sub) { content = `<div class="text-center"><p class="text-amber-100/70 mb-3">${t('sutta_subcategory.not_found')}</p><button class="btn btn-gold" onclick="closeModal()">Close</button></div>`; }
    else {
      const suttas = suttasBySubcategory(sub.id);
      const mid = view.currentMember;
      const myRank = mid ? computeMemberRank(mid) : 0;
      content = `
        <div class="fade-in">
          <div class="text-center mb-3">
            <div class="text-4xl mb-1">${sub.icon}</div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('sutta_subcategory.eyebrow')}</div>
            <h2 class="text-lg font-bold gold-text">${sub.label}</h2>
          </div>
          <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40">
            <p class="serif text-sm text-amber-100/90 leading-relaxed italic">${sub.teaser}</p>
          </div>
          ${suttas.length === 0 ? `
            <div class="parchment rounded-xl p-4 mb-3 text-center">
              <p class="text-sm text-amber-100/70 italic">${t('sutta_subcategory.empty_body')}</p>
            </div>
          ` : `
            <div class="space-y-2 mb-3">
              ${suttas.map(s => {
                const ready = myRank >= s.minRank;
                const read = mid ? hasReadSutta(mid, s.id) : false;
                const hasQuestions = !!SUTTA_QUESTIONS[s.id];
                const srsInfo = (mid && hasQuestions) ? srsCardsForSutta(mid, s.id) : null;
                const stateLabel = read
                  ? (srsInfo && srsInfo.due > 0 ? `✓ read · ${srsInfo.due} cards due` : t('sutta_subcategory.state_read'))
                  : ready ? `ready (rank ${s.minRank}+)`
                  : `above rank — needs ${getRankInfo(s.minRank).pali}`;
                const stateColor = read
                  ? (srsInfo && srsInfo.due > 0 ? 'text-amber-300' : 'text-emerald-300')
                  : ready ? 'text-amber-200/70'
                  : 'text-purple-300/70';
                return `
                  <button onclick="openSutta('${s.id}')" class="parchment rounded-lg p-3 w-full text-left hover:parchment-active transition border border-amber-700/20 ${read && !(srsInfo && srsInfo.due > 0) ? 'opacity-85' : ''}">
                    <div class="flex items-start justify-between gap-2 mb-1">
                      <div class="flex-1 min-w-0">
                        <div class="text-[12px]"><b class="text-amber-100">${s.ref}</b> <span class="text-amber-200">${s.name}</span></div>
                        <div class="text-[10px] text-amber-100/55 italic">${s.english}</div>
                      </div>
                      <div class="text-[10px] ${stateColor} shrink-0 italic whitespace-nowrap">${stateLabel}</div>
                    </div>
                    <p class="text-[11px] text-amber-100/75 leading-relaxed">${s.summary}</p>
                    ${hasQuestions ? `<div class="text-[9px] text-emerald-300/70 mt-1 italic">${t('sutta_subcategory.study_cards_available', {n: (SUTTA_QUESTIONS[s.id] || []).length})}</div>` : ''}
                  </button>
                `;
              }).join('')}
            </div>
          `}
          <div class="flex justify-end">
            <button class="btn btn-gold" onclick="closeModal()">Close</button>
          </div>
        </div>
      `;
    }

  return content;
}
