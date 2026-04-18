// ============================================================================
// src/modals/pause-quest.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'pause_quest'.
// The dispatch now calls renderPauseQuestModal(m). All strings resolve via t().
// ============================================================================

function renderPauseQuestModal(m) {
  let content = '';

    const reasons = [
      { id: 'retreat', icon: '🏔️', label: t('pause_quest.reason.retreat.label'), sub: t('pause_quest.reason.retreat.sub') },
      { id: 'illness', icon: '🤒', label: t('pause_quest.reason.illness.label'), sub: t('pause_quest.reason.illness.sub') },
      { id: 'travel', icon: '✈️', label: t('pause_quest.reason.travel.label'), sub: t('pause_quest.reason.travel.sub') },
      { id: 'other', icon: '🌙', label: t('pause_quest.reason.other.label'), sub: t('pause_quest.reason.other.sub') }
    ];
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">⏸</div>
          <h2 class="text-xl font-bold gold-text">${t('pause_quest.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('pause_quest.subtitle')}</div>
        </div>
        <div class="parchment rounded-xl p-4 mb-3">
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-2">${t('pause_quest.body_para1')}</p>
          <p class="text-[11px] text-amber-100/70 italic leading-relaxed">${t('pause_quest.body_para2')}</p>
        </div>

        <div class="space-y-2 mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('pause_quest.reasons_eyebrow')}</div>
          ${reasons.map(r => `
            <button onclick="setPauseReason('${r.id}')" class="w-full text-left rounded-lg p-3 transition border ${m.reason === r.id ? 'border-amber-500 bg-amber-900/30' : 'border-amber-900/40 parchment hover:parchment-active'}">
              <div class="flex items-center gap-3">
                <div class="text-2xl">${r.icon}</div>
                <div class="flex-1">
                  <div class="text-sm font-bold text-amber-100">${r.label}</div>
                  <div class="text-[11px] text-amber-100/65 italic">${r.sub}</div>
                </div>
                ${m.reason === r.id ? '<div class="text-amber-300">✓</div>' : ''}
              </div>
            </button>
          `).join('')}
        </div>

        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost" onclick="closeModal()">${t('pause_quest.not_yet_button')}</button>
          <button class="btn btn-gold" onclick="confirmPauseQuest()">${t('pause_quest.heading')}</button>
        </div>
      </div>
    `;

  return content;
}
