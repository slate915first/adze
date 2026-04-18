// ============================================================================
// src/modals/setback-recovery.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'setback_recovery'.
// The dispatch now calls renderSetbackRecoveryModal(m). All strings resolve via t().
// ============================================================================

function renderSetbackRecoveryModal(m) {
  let content = '';

    const setback = m.setback;
    const habit = setback.habit;
    const memberName = state.members.find(x => x.id === setback.memberId)?.name || '';
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🪕</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${t('setback_recovery.eyebrow')}</div>
          <h2 class="text-xl font-bold gold-text mt-1">${habit.name}</h2>
          <p class="text-xs text-amber-100/60 italic mt-1">${t('setback_recovery.duration_sub', {days: setback.brokenStreak})}</p>
        </div>
        <div class="parchment rounded-xl p-5 mb-4 border-amber-700/40">
          <p class="serif text-sm text-amber-100/90 leading-relaxed">${t('setback_recovery.an6_55_para1')}</p>
          <p class="serif text-sm text-amber-100/90 leading-relaxed mt-3">${t('setback_recovery.an6_55_para2')}</p>
        </div>
        <div class="parchment rounded-xl p-4 mb-4">
          <p class="text-sm text-amber-100/90 leading-relaxed">${t('setback_recovery.reflection_intro')}</p>
          <ul class="text-sm text-amber-100/80 mt-2 ml-4 space-y-1">
            <li>• Was the commitment too tight for what your life actually contains right now?</li>
            <li>• Is there a smaller version of this you could keep, without fail, starting tomorrow?</li>
          </ul>
        </div>
        <div class="flex flex-col gap-2">
          ${habit.slot ? `<button class="btn btn-gold" onclick="recommitSmaller()">${t('setback_recovery.smaller_button')}</button>` : ''}
          <button class="btn btn-ghost" onclick="dismissSetbackRecovery()">${t('setback_recovery.hold_button')}</button>
        </div>
      </div>
    `;

  return content;
}
