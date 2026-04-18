// ============================================================================
// src/modals/element-feedback.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'element_feedback'.
// The dispatch now calls renderElementFeedbackModal(m). All strings resolve via t().
// ============================================================================

function renderElementFeedbackModal(m) {
  let content = '';

    // v14.2 — the element-feedback report form. Captured fields:
    // path, tab, severity, the tester's report, an optional suggested fix.
    // The "copy to clipboard" button is the primary action — the tester
    // pastes the resulting block back into the dev chat.
    const reportText = buildElementFeedbackReport();
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('element_feedback.eyebrow')}</div>
          <h2 class="text-lg font-bold gold-text mt-1">${t('element_feedback.heading')}</h2>
        </div>

        <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/40 bg-amber-950/15">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('element_feedback.element_label')}</div>
          <div class="text-xs font-bold text-amber-100"><code>${m.path || t('element_feedback.path_fallback')}</code></div>
          ${m.snippet ? `<div class="text-[11px] text-amber-100/65 italic mt-1 leading-relaxed">"${m.snippet}"</div>` : ''}
          <div class="text-[10px] text-amber-100/55 mt-1">${t('element_feedback.tab_line', {tab: m.tab || t('element_feedback.path_fallback'), version: APP_VERSION})}</div>
        </div>

        <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/30">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('element_feedback.severity_label')}</div>
          <div class="grid grid-cols-3 gap-2">
            ${[
              { key: 'cosmetic',  label: t('element_feedback.severity_cosmetic'),  desc: t('element_feedback.severity_cosmetic_desc') },
              { key: 'confusing', label: t('element_feedback.severity_confusing'), desc: t('element_feedback.severity_confusing_desc') },
              { key: 'broken',    label: t('element_feedback.severity_broken'),    desc: t('element_feedback.severity_broken_desc') }
            ].map(s => `
              <button onclick="elementFeedbackSet('severity', '${s.key}')" class="parchment rounded-lg p-2 text-center ${m.severity === s.key ? 'parchment-active lotus-glow' : 'hover:parchment-active'}">
                <div class="text-xs font-bold text-amber-100">${s.label}</div>
                <div class="text-[9px] text-amber-100/60 italic">${s.desc}</div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/30">
          <label class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('element_feedback.report_label')}</label>
          <textarea id="element-report-input" rows="3" placeholder=t('element_feedback.report_placeholder') class="w-full bg-amber-950/30 border border-amber-900/40 rounded p-2 text-sm text-amber-100 mt-1" oninput="elementFeedbackSet('report', this.value)">${m.report || ''}</textarea>
        </div>

        <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/30">
          <label class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('element_feedback.suggestion_label')} <span class="normal-case opacity-70">${t('element_feedback.suggestion_optional')}</span></label>
          <textarea rows="2" placeholder=t('element_feedback.suggestion_placeholder') class="w-full bg-amber-950/30 border border-amber-900/40 rounded p-2 text-sm text-amber-100 mt-1" oninput="elementFeedbackSet('suggestion', this.value)">${m.suggestion || ''}</textarea>
        </div>

        <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/30 bg-amber-950/20">
          <div class="flex items-baseline justify-between mb-2">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('element_feedback.preview_label')} <span class="normal-case opacity-70">${t('element_feedback.preview_ready')}</span></div>
            ${m.copied ? `<div class="text-[10px] text-emerald-300">${t('element_feedback.copied_badge')}</div>` : ''}
          </div>
          <pre class="text-[10px] text-amber-100/80 whitespace-pre-wrap leading-relaxed font-mono bg-amber-950/40 rounded p-2 max-h-40 overflow-y-auto">${reportText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
        </div>

        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('oneline_journal.cancel_button')}</button>
          <button class="btn btn-gold text-sm ${(!m.severity || !(m.report || '').trim()) ? 'opacity-50 pointer-events-none' : ''}" onclick="copyElementFeedbackReport()">${m.copied ? t('element_feedback.copy_button_done') : t('element_feedback.copy_button')}</button>
        </div>
        <p class="text-[10px] text-amber-100/45 italic text-center mt-2">${t('element_feedback.footer_hint')}</p>
      </div>
    `;

  return content;
}
