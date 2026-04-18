// ============================================================================
// src/modals/shadow-explainer.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'shadow_explainer'.
// The dispatch now calls renderShadowExplainerModal(m). All strings resolve via t().
// ============================================================================

function renderShadowExplainerModal(m) {
  let content = '';

    const mid = view.currentMember;
    const rk = mid ? computeMemberRank(mid) : 0;
    const ri = getRankInfo(rk);
    const floor = shadowFloorForRank(rk);
    const cur = state.shadow || 0;
    const aboveFloor = Math.max(0, cur - floor);
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">🌑</div>
          <h2 class="text-xl font-bold gold-text">${t('shadow.modal.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('shadow.modal.subtitle')}</div>
        </div>

        <div class="parchment rounded-xl p-4 mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('shadow.modal.curve_label')}</div>
          ${renderShadowCurveSVG(rk, cur)}
          <div class="grid grid-cols-3 gap-2 mt-3 text-center">
            <div>
              <div class="text-base font-bold text-amber-200">${cur}</div>
              <div class="text-[9px] uppercase tracking-wider text-amber-100/55">current</div>
            </div>
            <div>
              <div class="text-base font-bold text-amber-300">${floor}</div>
              <div class="text-[9px] uppercase tracking-wider text-amber-100/55">${t('shadow.modal.curve_floor', {n: rk})}</div>
            </div>
            <div>
              <div class="text-base font-bold ${aboveFloor > 20 ? 'text-red-400' : aboveFloor > 0 ? 'text-amber-200' : 'text-emerald-300'}">${aboveFloor}</div>
              <div class="text-[9px] uppercase tracking-wider text-amber-100/55">${t('shadow.modal.curve_daily_work')}</div>
            </div>
          </div>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/30">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('shadow.modal.why_floor_label')}</div>
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-2">${t('shadow.modal.why_floor_body_1')}</p>
          <p class="text-sm text-amber-100/90 leading-relaxed serif">${t('shadow.modal.why_floor_body_2')}</p>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/30">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('shadow.modal.two_numbers_label')}</div>
          <div class="space-y-2">
            <div class="flex items-start gap-2">
              <div class="text-base">⛰️</div>
              <div class="flex-1">
                <div class="text-xs"><b class="text-amber-200">${t('shadow.modal.floor_name')}</b> <span class="text-amber-100/65">${t('shadow.modal.floor_desc')}</span></div>
                <div class="text-[11px] text-amber-100/70 italic">${t('shadow.modal.floor_note')}</div>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <div class="text-base">🌊</div>
              <div class="flex-1">
                <div class="text-xs"><b class="text-amber-200">${t('shadow.modal.daily_name')}</b> <span class="text-amber-100/65">${t('shadow.modal.daily_desc')}</span></div>
                <div class="text-[11px] text-amber-100/70 italic">${t('shadow.modal.daily_note')}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="parchment rounded-xl p-3 mb-3 bg-amber-950/30 border border-amber-900/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('shadow.modal.harder_label')}</div>
          <p class="text-[11px] text-amber-100/80 leading-relaxed italic">${t('shadow.modal.harder_body')}</p>
        </div>

        <div class="flex items-center justify-between">
          <button class="text-[11px] text-amber-300/80 hover:text-amber-200 underline" onclick="openRulesCard()">${t('shadow.modal.all_rules_link')}</button>
          <button class="btn btn-gold" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;

  return content;
}
