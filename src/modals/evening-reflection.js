// ============================================================================
// src/modals/evening-reflection.js
// ----------------------------------------------------------------------------
// Legacy renderer. Since v15.15.2 the 18:00 auto-fire and the multi-member
// sangha switch both route into the merged Evening reflection flow (via
// openEveningClose → phase 'oneline'), which now renders the diagnostic
// sliders + daily question inline. This file is kept so any serialized
// view.modal = { type: 'evening_reflection' } that might still come in —
// saved state, external callers, migration edge cases — renders coherently
// instead of blanking.
//
// Fix applied in v15.15.2: the `placeholder=t('daily_reflection.textarea_placeholder')`
// attribute was unquoted (same bug class as v15.11.5 and the oneline-journal
// fix). Fixed here even though this renderer is effectively unreachable.
// ============================================================================

function renderEveningReflectionModal(m) {
  const daily = getCurrentDailyQuestion();
  const diagQs = getDailyDiagnosticQuestions();
  const memberId = view.currentMember;
  const alreadyDiag = hasDailyDiagnosticToday(memberId);
  const expanded = !!m.expanded;
  return `
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
            <textarea id="daily-answer" rows="4" placeholder="${t('daily_reflection.textarea_placeholder')}"></textarea>
            <p class="text-[10px] text-amber-100/40 italic mt-1">${t('daily_reflection.privacy_note')}</p>
          </div>
        ` : `
          <button class="text-xs text-amber-300/80 hover:text-amber-200 mt-2" onclick="toggleReflectionExpand()">
            ${t('evening_reflection.want_response')}
          </button>
        `}
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost text-xs" onclick="dismissEveningReflection()">${t('evening_reflection.not_tonight_button')}</button>
        <button class="btn btn-gold" onclick="submitEveningWithDiagnostic()">${expanded ? t('daily_reflection.save_complete_button') : t('daily_reflection.complete_button')}</button>
      </div>
    </div>
  `;
}
