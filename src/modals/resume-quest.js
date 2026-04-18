// ============================================================================
// src/modals/resume-quest.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'resume_quest'.
// The dispatch now calls renderResumeQuestModal(m). All strings resolve via t().
// ============================================================================

function renderResumeQuestModal(m) {
  let content = '';

    const p = state.questPaused;
    const sinceDate = p ? new Date(p.since) : null;
    const daysPaused = p ? Math.max(1, Math.round((Date.now() - sinceDate.getTime()) / 86400000)) : 0;
    const reasonLabel = p ? (
      p.reason === 'retreat' ? t('resume_quest.reason_retreat') :
      p.reason === 'illness' ? t('resume_quest.reason_illness') :
      p.reason === 'travel' ? t('resume_quest.reason_travel') : t('resume_quest.reason_other')
    ) : t('resume_quest.reason_other');
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">▶</div>
          <h2 class="text-xl font-bold gold-text">${t('resume_quest.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${daysPaused} day${daysPaused === 1 ? '' : 's'} ${reasonLabel}</div>
        </div>
        <div class="parchment rounded-xl p-4 mb-3">
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-2">${t('resume_quest.body_para1')}</p>
          <p class="text-[11px] text-amber-100/70 italic leading-relaxed">${t('resume_quest.body_para2')}</p>
        </div>

        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost" onclick="closeModal()">${t('resume_quest.stay_paused_button')}</button>
          <button class="btn btn-gold" onclick="confirmResumeQuest()">${t('resume_quest.confirm_button')}</button>
        </div>
      </div>
    `;

  return content;
}
