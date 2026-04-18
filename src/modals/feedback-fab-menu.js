// ============================================================================
// src/modals/feedback-fab-menu.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'feedback_fab_menu'.
// The dispatch now calls renderFeedbackFabMenuModal(m). All strings resolve via t().
// ============================================================================

function renderFeedbackFabMenuModal(m) {
  let content = '';

    // v14.2 — menu shown when the floating feedback button is tapped.
    // Offers two paths: the classic long-form feedback modal (for general
    // bug reports, feature ideas), or the new element-feedback mode where
    // tapping any component on screen opens a targeted report with the
    // exact code-path embedded.
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">💬</div>
          <h2 class="text-xl font-bold gold-text">${t('feedback_fab.heading')}</h2>
          <p class="text-[11px] text-amber-100/60 italic mt-1">${t('feedback_fab.subtitle')}</p>
        </div>

        <div class="space-y-3">
          <button onclick="closeModal(); openFeedbackModal('bug')" class="parchment rounded-xl p-4 w-full text-left hover:parchment-active transition border border-amber-700/40">
            <div class="flex items-start gap-3">
              <div class="text-3xl">📮</div>
              <div class="flex-1">
                <div class="text-sm font-bold text-amber-100">${t('feedback_fab.classic_title')}</div>
                <div class="text-[11px] text-amber-100/65 italic mt-1">${t('feedback_fab.classic_description')}</div>
              </div>
            </div>
          </button>

          <button onclick="closeModal(); setFeedbackMode(true);" class="parchment rounded-xl p-4 w-full text-left hover:parchment-active transition border border-amber-700/40">
            <div class="flex items-start gap-3">
              <div class="text-3xl">🎯</div>
              <div class="flex-1">
                <div class="text-sm font-bold text-amber-100">${t('feedback_fab.element_title')} <span class="text-[10px] bg-amber-600/40 text-amber-100 px-1.5 py-0.5 rounded ml-1">${t('feedback_fab.element_beta_badge')}</span></div>
                <div class="text-[11px] text-amber-100/65 italic mt-1">${t('feedback_fab.element_description')}</div>
              </div>
            </div>
          </button>
        </div>

        <div class="flex justify-end mt-4">
          <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('oneline_journal.cancel_button')}</button>
        </div>
      </div>
    `;

  return content;
}
