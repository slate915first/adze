// ============================================================================
// src/modals/evening-reflection.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'evening_reflection'.
// The dispatch now calls renderEveningReflectionModal(m). All strings resolve via t().
// ============================================================================

function renderEveningReflectionModal(m) {
  let content = '';

    const daily = getCurrentDailyQuestion();
    const diagQs = getDailyDiagnosticQuestions();
    const memberId = view.currentMember;
    const alreadyDiag = hasDailyDiagnosticToday(memberId);
    const expanded = !!m.expanded;
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-4xl mb-2">🌙</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${t('evening_reflection.eyebrow')}</div>
          <h2 class="text-lg font-bold gold-text mt-1">${t('evening_reflection.heading')}</h2>
        </div>
        ${alreadyDiag ? '' : `
        <div class="parchment rounded-xl p-4 mb-3">
          <p class="text-[10px] text-amber-100/50 italic mb-2">${t('evening_reflection.sliders_intro')}</p>
          ${diagQs.map(q => renderDiagnosticSlider(q, 5, `diag-${q.id}`)).join('')}
        </div>
        `}
        <div class="parchment rounded-xl p-4 mb-3 border-amber-700/30">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/60 mb-1">${t('evening_reflection.tonight_label')}</div>
          <p class="serif text-sm text-amber-100/90 leading-relaxed">${daily.q}</p>
          ${expanded ? `
            <div class="mt-3 pt-3 border-t border-amber-900/30">
              <textarea id="daily-answer" rows="4" placeholder=t('daily_reflection.textarea_placeholder')></textarea>
              <p class="text-[10px] text-amber-100/40 italic mt-1">${t('daily_reflection.privacy_note')}</p>
            </div>
          ` : `
            <button class="text-xs text-amber-300/80 hover:text-amber-200 mt-2" onclick="toggleReflectionExpand()">
              Want to write a response? →
            </button>
          `}
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost text-xs" onclick="dismissEveningReflection()">${t('evening_reflection.not_tonight_button')}</button>
          <button class="btn btn-gold" onclick="submitEveningWithDiagnostic()">${expanded ? t('daily_reflection.save_complete_button') : t('daily_reflection.complete_button')}</button>
        </div>
      </div>
    `;

  return content;
}
