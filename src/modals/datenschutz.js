// ============================================================================
// src/modals/datenschutz.js
// ----------------------------------------------------------------------------
// Formal GDPR Art. 13 disclosure (Datenschutzerklärung). The companion to
// modals/privacy-detail.js — that one is the friendly plain-language note,
// this one is the structured legal text.
//
// Reachable from welcome footer, Settings → Privacy, and the "Detailed legal
// notice" button at the bottom of privacy_detail.
//
// Currently English; German translation tracked in COMPLIANCE-LOG.md as a
// follow-up. The Impressum stays German because § 5 DDG demands German legal
// text; the Datenschutzerklärung is acceptable in the language the app
// otherwise uses, with translation a quality improvement.
// ============================================================================

function renderDatenschutzModal(m) {
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-3xl mb-1">📋</div>
        <h2 class="text-lg font-bold gold-text">${t('datenschutz.heading')}</h2>
        <p class="text-[11px] text-amber-100/60 italic mt-1">${t('datenschutz.subtitle')}</p>
      </div>
      <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40 max-h-[60vh] overflow-y-auto scrollbar text-sm text-amber-100/90 leading-relaxed serif">
        <p class="mb-3">${t('datenschutz.para_controller')}</p>
        <p class="mb-3">${t('datenschutz.para_purposes')}</p>
        <p class="mb-3">${t('datenschutz.para_recipients')}</p>
        <p class="mb-3">${t('datenschutz.para_transfers')}</p>
        <p class="mb-3">${t('datenschutz.para_retention')}</p>
        <p class="mb-3">${t('datenschutz.para_rights')}</p>
        <p class="mb-3">${t('datenschutz.para_complaint')}</p>
        <p class="mb-3">${t('datenschutz.para_required')}</p>
        <p class="mb-3">${t('datenschutz.para_no_automated')}</p>
        <p class="mb-3">${t('datenschutz.para_cookies_position')}</p>
        <p class="mb-3">${t('datenschutz.para_source')}</p>
        <p class="mb-3">${t('datenschutz.para_effective')}</p>
        <p class="text-xs text-amber-100/65 italic mt-4">${t('datenschutz.footer')}</p>
      </div>
      <div class="flex justify-end">
        <button class="btn btn-gold" onclick="closeModal()">${t('datenschutz.close_button')}</button>
      </div>
    </div>
  `;
}
