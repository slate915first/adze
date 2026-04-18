// ============================================================================
// src/modals/sutta-study.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch.
// Branch type: 'sutta_study'
//
// The dispatch in renderModal() now calls renderSuttaStudyModal(m) for this m.type.
// All user-facing strings pass through t() from engine/i18n.js and resolve
// at build time from src/content/strings/en.json.
// ============================================================================

function renderSuttaStudyModal(m) {
  let content = '';

    const mid = view.currentMember;
    const sutta = SUTTA_LIBRARY.find(s => s.id === m.suttaId);
    if (!sutta) { closeModal(); return; }
    const next = srsNextDueForSutta(mid, m.suttaId);
    const totalInfo = srsCardsForSutta(mid, m.suttaId);

    if (!next) {
      // No card due right now — session complete (or nothing ever due)
      content = `
        <div class="fade-in text-center py-4">
          <div class="text-5xl mb-3">🪷</div>
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${sutta.ref}</div>
          <h2 class="text-lg font-bold gold-text mb-2">${sutta.name}</h2>
          ${m.doneThisSession > 0 ? `
            <p class="text-sm text-amber-100/85 leading-relaxed mb-4">Done for today. You reviewed <b>${m.doneThisSession} card${m.doneThisSession === 1 ? '' : 's'}</b> in this session.</p>
          ` : `
            <p class="text-sm text-amber-100/85 leading-relaxed mb-4">${t('srs.modal.nothing_due')}</p>
          `}
          <div class="parchment rounded-xl p-3 mb-4 border border-amber-700/30 text-left">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('srs.modal.this_sutta_label')}</div>
            <div class="text-[11px] text-amber-100/80">${t('srs.modal.mastered_progress', {n: totalInfo.mastered, total: totalInfo.total})}</div>
            <div class="w-full bg-amber-950/40 rounded-full h-1.5 overflow-hidden mt-1">
              <div class="h-full bg-emerald-500/70" style="width:${Math.round((totalInfo.mastered / Math.max(totalInfo.total, 1)) * 100)}%"></div>
            </div>
          </div>
          <div class="flex justify-center gap-2">
            <button class="btn btn-ghost text-sm" onclick="closeModal()">${t('technique_teaching.close_button')}</button>
          </div>
        </div>
      `;
    } else {
      const q = next.q;
      const card = next.card;
      const boxLabel = card.box === 0 ? 'new' : `box ${card.box}/6`;
      const showingAns = !!m.showingAnswer;
      content = `
        <div class="fade-in">
          <div class="text-center mb-3">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${sutta.ref} · ${sutta.name}</div>
            <div class="text-[10px] text-amber-100/55 italic mt-0.5">${t('srs.modal.session_counter', {boxLabel: boxLabel, count: m.doneThisSession || 0})}</div>
          </div>
          <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('srs.modal.question_label')}</div>
            <p class="serif text-sm text-amber-100/95 leading-relaxed">${q.q}</p>
          </div>

          ${showingAns ? `
            <div class="parchment rounded-xl p-4 mb-3 border border-emerald-700/50 bg-emerald-950/15">
              <div class="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-2">${t('srs.modal.check_understanding_label')}</div>
              <p class="serif text-sm text-amber-100/95 leading-relaxed">${q.a}</p>
            </div>
            <div class="mb-2">
              <p class="text-[10px] text-amber-100/55 italic mb-2 text-center">${t('srs.modal.rate_prompt')}</p>
              <div class="grid grid-cols-3 gap-2">
                <button onclick="suttaStudyRate('hard')" class="parchment border border-red-700/50 rounded-lg p-2 text-center hover:parchment-active transition">
                  <div class="text-lg">🌱</div>
                  <div class="text-[11px] font-bold text-red-300">${t('srs.modal.rate_hard')}</div>
                  <div class="text-[9px] text-amber-100/55">${t('srs.modal.rate_back_in_1_day')}</div>
                </button>
                <button onclick="suttaStudyRate('good')" class="parchment border border-amber-700/50 rounded-lg p-2 text-center hover:parchment-active transition">
                  <div class="text-lg">🌿</div>
                  <div class="text-[11px] font-bold text-amber-300">Good</div>
                  <div class="text-[9px] text-amber-100/55">in ${SRS_INTERVALS_DAYS[Math.min(5, (card.box || 0))] || 3} day${(SRS_INTERVALS_DAYS[Math.min(5, (card.box || 0))] || 3) === 1 ? '' : 's'}</div>
                </button>
                <button onclick="suttaStudyRate('easy')" class="parchment border border-emerald-700/50 rounded-lg p-2 text-center hover:parchment-active transition">
                  <div class="text-lg">🌳</div>
                  <div class="text-[11px] font-bold text-emerald-300">${t('srs.modal.rate_easy')}</div>
                  <div class="text-[9px] text-amber-100/55">in ${SRS_INTERVALS_DAYS[Math.min(5, (card.box || 0) + 1)] || 7} day${(SRS_INTERVALS_DAYS[Math.min(5, (card.box || 0) + 1)] || 7) === 1 ? '' : 's'}</div>
                </button>
              </div>
              <p class="text-[9px] text-amber-100/40 italic mt-2 text-center">${t('srs.modal.rate_honest_note')}</p>
            </div>
          ` : `
            <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/30">
              <p class="text-[11px] text-amber-100/70 italic leading-relaxed text-center">${t('srs.modal.recall_prompt')}</p>
            </div>
            <div class="flex justify-between gap-2">
              <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('srs.modal.end_session')}</button>
              <button class="btn btn-gold text-sm" onclick="suttaStudyReveal()">${t('srs.modal.reveal_check')}</button>
            </div>
          `}
        </div>
      `;
    }

  return content;
}
