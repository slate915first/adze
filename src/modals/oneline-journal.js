// ============================================================================
// src/modals/oneline-journal.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'oneline_journal'.
// The dispatch now calls renderOnelineJournalModal(m). All strings resolve via t().
// ============================================================================

function renderOnelineJournalModal(m) {
  let content = '';

    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">✍️</div>
          <h2 class="text-xl font-bold gold-text">${t('oneline_journal.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('oneline_journal.subtitle')}</div>
        </div>
        <div class="parchment rounded-xl p-4 mb-3">
          <textarea id="oneline-input" class="w-full bg-amber-950/30 border border-amber-700/40 rounded-lg p-3 text-sm text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-500" rows="3" placeholder=t('oneline_journal.textarea_placeholder') maxlength="500" oninput="view.modal.text = this.value"></textarea>
          <p class="text-[10px] text-amber-100/55 italic mt-2">${t('oneline_journal.hindrance_hint')}</p>
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('oneline_journal.cancel_button')}</button>
          <button class="btn btn-gold" onclick="saveOnelineJournal(document.getElementById('oneline-input').value)">${t('oneline_journal.save_button')}</button>
        </div>
      </div>
    `;

  return content;
}
