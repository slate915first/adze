// ============================================================================
// src/modals/rules-card.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch.
// Branch type: 'rules_card'
//
// The dispatch in renderModal() now calls renderRulesCardModal(m) for this m.type.
// All user-facing strings pass through t() from engine/i18n.js and resolve
// at build time from src/content/strings/en.json.
// ============================================================================

function renderRulesCardModal(m) {
  let content = '';

    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">📖</div>
          <h2 class="text-xl font-bold gold-text">${t('rules_card.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('rules_card.subtitle')}</div>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('rules_card.sila_earn.eyebrow')}</div>
          <ul class="text-[11px] text-amber-100/80 space-y-1 ml-2">
            <li>• ${t('rules_card.sila_earn.item_standard')}</li>
            <li>• ${t('rules_card.sila_earn.item_deep')}</li>
            <li>• ${t('rules_card.sila_earn.item_open')}</li>
            <li>• ${t('rules_card.sila_earn.item_walking')}</li>
          </ul>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('rules_card.samadhi_earn.eyebrow')}</div>
          <ul class="text-[11px] text-amber-100/80 space-y-1 ml-2">
            <li>• ${t('rules_card.samadhi_earn.item_sit')}</li>
            <li>• ${t('rules_card.samadhi_earn.item_walking')}</li>
            <li>• Deep & open reflections build samādhi by closing the day attentively</li>
          </ul>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border border-emerald-700/40">
          <div class="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-2">${t('rules_card.panna_earn.eyebrow')}</div>
          <ul class="text-[11px] text-amber-100/80 space-y-1 ml-2">
            <li>• ${t('rules_card.panna_earn.item_sit')}</li>
            <li>• ${t('rules_card.panna_earn.item_oneline')}</li>
            <li>• ${t('rules_card.panna_earn.item_hindrance')}</li>
            <li>• ${t('rules_card.panna_earn.item_standard')}</li>
            <li>• ${t('rules_card.panna_earn.item_deep')}</li>
            <li>• ${t('rules_card.panna_earn.item_open')}</li>
            <li>• ${t('rules_card.panna_earn.item_sutta')}</li>
          </ul>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border border-purple-700/40 bg-purple-950/15">
          <div class="text-[10px] uppercase tracking-wider text-purple-300/90 mb-2">${t('rules_card.panna_permanent.eyebrow')}</div>
          <p class="text-[11px] text-amber-100/85 leading-relaxed serif italic">${t('rules_card.panna_permanent.body')}</p>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('rules_card.shadow_raises.eyebrow')}</div>
          <ul class="text-[11px] text-amber-100/80 space-y-1 ml-2">
            <li>• Missed scheduled sit (after the time has passed)</li>
            <li>• Day with low practice score and key habits missed</li>
            <li>• Hindrance composite spiking in the daily diagnostic</li>
            <li>• Reaching for suttas above your current rank (small tick)</li>
            <li>• Multi-day silence from the practice</li>
          </ul>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('rules_card.shadow_recedes.eyebrow')}</div>
          <ul class="text-[11px] text-amber-100/80 space-y-1 ml-2">
            <li>• Completed sit</li>
            <li>• Walking meditation</li>
            <li>• Reflection written</li>
            <li>• Hindrance named precisely</li>
            <li>• A day where the gate's three legs hold</li>
          </ul>
        </div>

        <div class="parchment rounded-xl p-3 mb-3 bg-amber-950/30 border border-amber-900/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('rules_card.shadow_floor.eyebrow')}</div>
          <p class="text-[11px] text-amber-100/80 leading-relaxed italic">${t('rules_card.shadow_floor.body')}</p>
        </div>

        <div class="parchment rounded-xl p-3 mb-3 bg-amber-950/30 border border-amber-900/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('rules_card.decay.eyebrow')}</div>
          <p class="text-[11px] text-amber-100/80 leading-relaxed italic">${t('rules_card.decay.body')}</p>
        </div>

        <div class="flex justify-end">
          <button class="btn btn-gold" onclick="closeModal()">${t('technique_teaching.close_button')}</button>
        </div>
      </div>
    `;

  return content;
}
