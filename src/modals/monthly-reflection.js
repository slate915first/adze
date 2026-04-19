// ============================================================================
// src/modals/monthly-reflection.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'monthly_reflection'.
// The dispatch now calls renderMonthlyReflectionModal(m). All strings resolve via t().
// ============================================================================

function renderMonthlyReflectionModal(m) {
  let content = '';

    const monthly = m.historical
      ? MONTHLY_REFLECTIONS.find(x => x.month === m.historical)
      : getCurrentMonthly();
    if (!monthly) { closeModal(); return; }
    const historical = m.historical && state.completedMonthlies.includes(m.historical);
    const prevAnswers = historical
      ? (function() {
          const mid = view.currentMember;
          for (const dk of Object.keys(state.reflectionLog)) {
            const e = state.reflectionLog[dk]?.[mid];
            if (e?.monthly?.month === m.historical) return e.monthly.answers;
          }
          return [];
        })()
      : [];
    // Format contemplation with paragraph breaks
    const contemplationParas = monthly.contemplation.split('\n\n').filter(p => p.trim());
    const showMonthlyDiag = !historical;
    const lastMonthly = getLastMonthlyDiagnostic(view.currentMember);
    const monthlyDiagSliders = showMonthlyDiag ? MONTHLY_DIAGNOSTIC.sliders.map(q => {
      const prev = lastMonthly?.answers?.[q.id];
      const hint = (prev != null) ? `<span class="text-[10px] text-amber-300/60">${t('monthly_reflection.last_month_prefix', {value: prev})}</span>` : '';
      return renderDiagnosticSlider({ question: q.question + hint, labels: q.labels, min: 0, max: 10 }, 5, `mdiag-${q.id}`);
    }).join('') : '';
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-4xl mb-2">🌕</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">Month ${monthly.month} of 6 • ${monthly.suttaRef}</div>
          <h2 class="text-2xl font-bold gold-text mt-1">${monthly.title}</h2>
          <p class="text-sm text-amber-200/70 italic">${monthly.teaser}</p>
        </div>
        <div class="parchment rounded-xl p-5 mb-4">
          <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${t('monthly_reflection.teaching_label')}</div>
          <p class="serif text-sm text-amber-100/90 leading-relaxed">${monthly.context}</p>
        </div>
        <div class="parchment rounded-xl p-5 mb-4 border-amber-700/50">
          <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${t('monthly_reflection.contemplation_label')}</div>
          ${contemplationParas.map(p => `<p class="serif text-sm text-amber-100/90 leading-relaxed mb-3">${p}</p>`).join('')}
        </div>
        <div class="text-xs uppercase tracking-wider text-amber-300 mb-2">${t('monthly_reflection.journal_header')}</div>
        <div class="space-y-4 mb-4">
          ${monthly.questions.map((q, i) => `
            <div>
              <label class="text-xs text-amber-300/80 block mb-1">${i + 1}. ${q}</label>
              <textarea id="monthly-a-${i}" rows="3" ${historical ? 'readonly' : ''}>${prevAnswers[i] || ''}</textarea>
            </div>
          `).join('')}
        </div>
        ${showMonthlyDiag ? `
        <div class="parchment rounded-xl p-4 mb-4">
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-1">${t('monthly_reflection.checkin_label')}</div>
          <p class="text-xs text-amber-100/60 mb-3 italic">Seven sliders${lastMonthly ? ' — last month\'s values shown for comparison' : ''}, then two short writing prompts.</p>
          ${monthlyDiagSliders}
          ${MONTHLY_DIAGNOSTIC.writings.map(w => `
            <div class="mt-3">
              <label class="text-xs text-amber-300/80 block mb-1">${w.question}</label>
              <p class="text-[11px] text-amber-100/50 italic mb-1">${w.hint}</p>
              <textarea id="mdiag-writing-${w.id}" rows="4" placeholder="${t('weekly_reflection.writing_placeholder')}"></textarea>
            </div>
          `).join('')}
        </div>
        ` : ''}
        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost" onclick="closeModal()">${historical ? t('common.close') : t('weekly_reflection.save_draft_close')}</button>
          ${!historical ? `<button class="btn btn-gold" onclick="submitMonthlyReflection()">${t('monthly_reflection.complete_button')}</button>` : ''}
        </div>
      </div>
    `;

  return content;
}
