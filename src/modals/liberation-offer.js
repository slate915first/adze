// ============================================================================
// src/modals/liberation-offer.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'liberation_offer'.
// The dispatch now calls renderLiberationOfferModal(m). All strings resolve via t().
// ============================================================================

function renderLiberationOfferModal(m) {
  let content = '';

    const member = state.members.find(x => x.id === m.memberId);
    content = `
      <div class="fade-in text-center">
        <div class="text-6xl mb-2">☸️</div>
        <div class="text-[10px] uppercase tracking-wider text-purple-300/80">${t('liberation_offer.eyebrow')}</div>
        <h2 class="text-2xl font-bold gold-text mt-1">${t('liberation_offer.heading')}</h2>
        <p class="text-xs text-purple-200/70 italic mb-4">${t('liberation_offer.member_subtitle', {name: member?.name || t('liberation.practitioner_fallback')})}</p>

        <div class="parchment rounded-xl p-4 mb-4 text-left border border-purple-700/40">
          <p class="text-xs text-amber-100/90 leading-relaxed serif mb-3">${t('liberation_offer.body_para1')}</p>
          <p class="text-xs text-amber-100/90 leading-relaxed serif mb-3">${t('liberation_offer.body_intro2')}</p>
          <ul class="text-[11px] text-amber-100/80 leading-relaxed ml-4 space-y-1 mb-3">
            <li>• Generate a final teaching summary — a printed guideline of everything you learned, your practice history, and explicit guidance for continuing without the game</li>
            <li>• Mark your path as complete — no further rank advancements</li>
            <li>• Stop asking things of you</li>
          </ul>
          <p class="text-xs text-amber-100/90 leading-relaxed serif mb-3">${t('liberation_offer.body_summary_note')}</p>
          <p class="text-[11px] text-amber-300/80 italic leading-relaxed">${t('liberation_offer.decline_note')}</p>
        </div>

        <div class="flex gap-2 justify-center">
          <button class="btn btn-ghost text-xs" onclick="declineLiberation()">${t('liberation_offer.decline_button')}</button>
          <button class="btn btn-gold" onclick="acceptLiberation()">${t('liberation_offer.accept_button')}</button>
        </div>

        <p class="text-[10px] text-amber-100/40 italic mt-4 leading-relaxed">${t('liberation_offer.dn16_quote')}<br>${t('liberation_offer.dn16_attribution')}</p>
      </div>
    `;

  return content;
}
