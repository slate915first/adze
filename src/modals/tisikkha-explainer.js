// ============================================================================
// src/modals/tisikkha-explainer.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'tisikkha_explainer'.
// The dispatch now calls renderTisikkhaExplainerModal(m). All strings resolve via t().
// ============================================================================

function renderTisikkhaExplainerModal(m) {
  let content = '';

    const mid = view.currentMember;
    // v15.15.3 — was `const t = ...` which shadowed the global t() i18n
    // function and broke every t('tisikkha.*') lookup in this file. Local
    // renamed to `tk` so the global t() is reachable; property accesses
    // (tk.sila, tk.samadhi, tk.panna, tk.pannaTotal) are the only ones
    // that should go through the local tisikkha object.
    const tk = mid ? getTisikkha(mid) : { sila: 0, samadhi: 0, panna: 0, pannaTotal: 0 };
    const rk = mid ? computeMemberRank(mid) : 0;
    const nextRank = rk < 9 ? rk + 1 : null;
    const nextRi = nextRank !== null ? getRankInfo(nextRank) : null;
    const thresh = nextRank !== null ? getTisikkhaThresholds(nextRank) : null;
    const togo = (cur, max) => Math.max(0, max - cur);
    const nextThreshRow = (cur, threshVal, color) => {
      if (nextRank === null) return `<div class="text-[10px] text-amber-100/55 italic">${t('tisikkha.threshold.endpoint')}</div>`;
      if (threshVal === 0) return `<div class="text-[10px] text-amber-100/55 italic">${t('tisikkha.threshold.not_required', {pali: nextRi.pali})}</div>`;
      const met = cur >= threshVal;
      return `<div class="text-[10px] ${met ? 'text-emerald-300' : 'text-amber-100/65'} mt-1">→ ${met ? '<b>met</b>' : `<b>${togo(cur, threshVal)}</b> to go`} for ${nextRi.pali} <span class="text-amber-100/45">(threshold ${threshVal})</span></div>`;
    };

    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">⚖️🪷💡</div>
          <h2 class="text-xl font-bold gold-text">${t('tisikkha.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('tisikkha.subtitle')}</div>
        </div>
        <div class="parchment rounded-xl p-4 mb-3">
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-3">${t('tisikkha.intro_para')}</p>
          <p class="text-[11px] text-amber-100/70 italic leading-relaxed">${t('tisikkha.intro_note')}</p>
        </div>

        <div class="space-y-2 mb-3">
          <div class="parchment rounded-lg p-3 border border-amber-700/40">
            <div class="flex items-baseline justify-between mb-1">
              <div><span class="text-base">⚖️</span> <b class="text-amber-200">${t('tisikkha.sila.name')}</b> <span class="text-amber-100/60 text-[11px]">${t('tisikkha.sila.english')}</span></div>
              <div class="text-amber-300 text-sm"><b>${tk.sila}</b></div>
            </div>
            <p class="text-[11px] text-amber-100/75">${t('tisikkha.sila.body')}</p>
            ${thresh ? nextThreshRow(tk.sila, thresh.sila, 'amber') : ''}
          </div>
          <div class="parchment rounded-lg p-3 border border-amber-700/40">
            <div class="flex items-baseline justify-between mb-1">
              <div><span class="text-base">🪷</span> <b class="text-amber-200">${t('tisikkha.samadhi.name')}</b> <span class="text-amber-100/60 text-[11px]">${t('tisikkha.samadhi.english')}</span></div>
              <div class="text-amber-300 text-sm"><b>${tk.samadhi}</b></div>
            </div>
            <p class="text-[11px] text-amber-100/75">${t('tisikkha.samadhi.body')}</p>
            ${thresh ? nextThreshRow(tk.samadhi, thresh.samadhi, 'amber') : ''}
          </div>
          <div class="parchment rounded-lg p-3 border border-emerald-700/40 bg-emerald-950/15">
            <div class="flex items-baseline justify-between mb-1">
              <div><span class="text-base">💡</span> <b class="text-emerald-200">${t('tisikkha.panna.name')}</b> <span class="text-amber-100/60 text-[11px]">${t('tisikkha.panna.english')}</span></div>
              <div class="text-emerald-300 text-sm"><b>${tk.panna}</b> <span class="text-[10px] text-emerald-100/55">${t('tisikkha.panna.lifetime_suffix', {total: tk.pannaTotal})}</span></div>
            </div>
            <p class="text-[11px] text-amber-100/75 mb-1">${t('tisikkha.panna.body_spendable')}</p>
            <p class="text-[11px] text-emerald-100/85 italic">${t('tisikkha.panna.body_lifetime')}</p>
            ${thresh ? nextThreshRow(tk.panna, thresh.panna, 'emerald') : ''}
          </div>
        </div>

        <div class="parchment rounded-lg p-3 mb-3 bg-amber-950/30 border border-amber-900/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('tisikkha.decay.eyebrow')}</div>
          <p class="text-[11px] text-amber-100/80 leading-relaxed italic">${t('tisikkha.decay.body')}</p>
        </div>

        <div class="flex items-center justify-between">
          <button class="text-[11px] text-amber-300/80 hover:text-amber-200 underline" onclick="openRulesCard()">${t('shadow.modal.all_rules_link')}</button>
          <button class="btn btn-gold" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;

  return content;
}
