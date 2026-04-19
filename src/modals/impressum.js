// ============================================================================
// src/modals/impressum.js
// ----------------------------------------------------------------------------
// § 5 DDG legal notice (Impressum). Required for every publicly-served
// website operated from Germany. Linked from the welcome footer.
//
// Body content lives in src/content/strings/en.json under impressum.* and is
// stored as ready-to-render HTML — German legal text doesn't translate well
// across paragraph boundaries.
// ============================================================================

function renderImpressumModal(m) {
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-3xl mb-1">📜</div>
        <h2 class="text-lg font-bold gold-text">${t('impressum.heading')}</h2>
        <p class="text-[11px] text-amber-100/60 italic mt-1">${t('impressum.subtitle')}</p>
      </div>
      <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40 max-h-[60vh] overflow-y-auto scrollbar text-sm text-amber-100/90 leading-relaxed serif">
        ${t('impressum.body_html')}
      </div>
      <div class="flex justify-end">
        <button class="btn btn-gold" onclick="closeModal()">${t('impressum.close_button')}</button>
      </div>
    </div>
  `;
}
