// ============================================================================
// src/modals/struggle-suggestion.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'struggle_suggestion'.
// The dispatch now calls renderStruggleSuggestionModal(m). All strings resolve via t().
// ============================================================================

function renderStruggleSuggestionModal(m) {
  let content = '';

    const sug = m.suggestion;
    const sutta = sug.sutta;
    const sub = SUTTA_SUBCATEGORIES.find(x => x.id === sug.subId);
    const framing = sug.alreadyRead
      ? `In what you wrote, I heard something the Buddha spoke directly to. You have already read this — sometimes a teaching needs to be returned to. The layer beneath the first reading is often where the answer waits.`
      : `In what you wrote, I heard something the Buddha spoke directly to. If you are ready, here is what he taught.`;
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">${sub?.icon || '📜'}</div>
          <div class="text-[10px] uppercase tracking-wider text-amber-300/90">${t('struggle_suggestion.eyebrow')}</div>
          <h2 class="text-base font-bold gold-text mt-0.5">${sub?.label || t('struggle_suggestion.label_fallback')}</h2>
        </div>
        <div class="parchment rounded-xl p-4 mb-3 border border-amber-600/40 bg-amber-950/15">
          <p class="serif text-sm text-amber-100/90 leading-relaxed italic">${framing}</p>
        </div>
        <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/30">
          <div class="text-[11px] mb-0.5"><b class="text-amber-100">${sutta.ref}</b> <span class="text-amber-200">${sutta.name}</span></div>
          <div class="text-[10px] text-amber-200/70 italic mb-1.5">${sutta.english}</div>
          <p class="text-[11px] text-amber-100/80 leading-relaxed">${sutta.summary}</p>
        </div>
        <div class="flex gap-2 mb-2">
          <button class="btn btn-gold text-xs flex-1" onclick="openSutta('${sutta.id}')">${sug.alreadyRead ? t('struggle_suggestion.button_return') : t('struggle_suggestion.button_open')}</button>
          <button class="btn btn-ghost text-xs" onclick="openSuttaSubcategory('${sug.subId}')">${t('struggle_suggestion.button_more_like_this')}</button>
        </div>
        <div class="flex justify-center">
          <button class="text-[10px] text-amber-100/50 hover:text-amber-200 italic underline" onclick="closeModal()">${t('struggle_suggestion.button_not_now')}</button>
        </div>
        <p class="text-[9px] text-amber-100/35 italic mt-2 text-center">${t('struggle_suggestion.footer_note')}</p>
      </div>
    `;

  return content;
}
