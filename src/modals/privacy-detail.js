// ============================================================================
// src/modals/privacy-detail.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch.
// Branch type: 'privacy_detail'
//
// The dispatch in renderModal() now calls renderPrivacyDetailModal(m) for this m.type.
// All user-facing strings pass through t() from engine/i18n.js and resolve
// at build time from src/content/strings/en.json.
// ============================================================================

function renderPrivacyDetailModal(m) {
  let content = '';

    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-3xl mb-1">🔒</div>
          <h2 class="text-lg font-bold gold-text">${t('privacy_detail.heading')}</h2>
          <p class="text-[11px] text-amber-100/60 italic mt-1">${t('privacy_detail.subtitle')}</p>
        </div>
        <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40 max-h-[60vh] overflow-y-auto scrollbar text-sm text-amber-100/90 leading-relaxed serif">
          <p class="mb-3">${t('privacy_detail.para_where')}</p>

          <p class="mb-3">${t('privacy_detail.para_not_sent')}</p>

          <p class="mb-3">${t('privacy_detail.para_sync_optional')}</p>

          <p class="mb-3">${t('privacy_detail.para_sync_technical')}</p>

          <p class="mb-3">${t('privacy_detail.para_sync_references')}</p>

          <p class="mb-3">${t('privacy_detail.para_outbound')}</p>

          <p class="mb-3">${t('privacy_detail.para_tailwind')}</p>

          <p class="mb-3">${t('privacy_detail.para_clear')}</p>

          <p class="mb-3">${t('privacy_detail.para_others')}</p>

          <p class="mb-3">${t('privacy_detail.para_gdpr')}</p>

          <p class="mb-3">${t('privacy_detail.para_cookies')}</p>

          <p class="mb-3">${t('privacy_detail.para_export')}</p>

          <p class="mb-3">${t('privacy_detail.para_destroy')}</p>

          <p class="text-xs text-amber-100/65 italic mt-4">${t('privacy_detail.footer')}</p>
        </div>
        <div class="flex justify-between items-center gap-2 flex-wrap">
          <button class="btn btn-ghost text-xs" onclick="openDatenschutz()">${t('privacy_detail.detailed_notice_button')}</button>
          <button class="btn btn-gold" onclick="closeModal()">${t('privacy_detail.understood_button')}</button>
        </div>
      </div>
    `;

  return content;
}
