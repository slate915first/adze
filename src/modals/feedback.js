// ============================================================================
// src/modals/feedback.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch.
// Branch type: 'feedback'
//
// The dispatch in renderModal() now calls renderFeedbackModal(m) for this m.type.
// All user-facing strings pass through t() from engine/i18n.js and resolve
// at build time from src/content/strings/en.json.
// ============================================================================

function renderFeedbackModal(m) {
  let content = '';

    if (m.step === 'sent') {
      content = `
        <div class="fade-in text-center py-4">
          <div class="text-6xl mb-3">🙏</div>
          <h2 class="text-xl font-bold gold-text mb-2">${t('feedback.sent.heading')}</h2>
          <p class="text-sm text-amber-100/85 leading-relaxed max-w-md mx-auto mb-4">${t('feedback.sent.body')}</p>
          <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/30 text-left max-w-md mx-auto">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('feedback.sent.next_label')}</div>
            <p class="text-xs text-amber-100/80 leading-relaxed">The maintainer reads every report. Bugs get fixed, ideas get considered, patterns across reports shape what the app becomes. ${m.allowContact ? 'You said they may reply — expect a short note back if your report needs a follow-up.' : 'You asked for no reply, so the report is one-way — it still matters.'}</p>
          </div>
          <p class="text-[11px] text-amber-100/55 italic">${t('feedback.sent.fallback_note', {email: FEEDBACK_CONFIG.email})}</p>
          <button class="btn btn-gold mt-4" onclick="closeModal()">${t('feedback.sent.back_button')}</button>
        </div>
      `;
    } else {
      const kindConfig = {
        bug:    { icon: '🐛', title: t('feedback.kind.bug_title'),      subtitle: t('feedback.kind.bug_subtitle')            , showSeverity: true,  showFreq: true },
        idea:   { icon: '💡', title: t('feedback.kind.idea_title'),      subtitle: t('feedback.kind.idea_subtitle') , showSeverity: false, showFreq: false },
        help:   { icon: '🪷', title: t('feedback.kind.help_title'),       subtitle: t('feedback.kind.help_subtitle')      , showSeverity: false, showFreq: false },
        praise: { icon: '✨', title: t('feedback.kind.praise_title'),    subtitle: 'What\'s helping? What do you love?'    , showSeverity: false, showFreq: false }
      };
      const k = kindConfig[m.kind] || kindConfig.bug;

      // Kind-switcher tabs — let user change category without restarting
      const kindTabs = Object.keys(kindConfig).map(key => {
        const selected = m.kind === key;
        const c = kindConfig[key];
        return `
          <button onclick="feedbackSet('kind', '${key}')"
                  class="flex-1 rounded-lg px-2 py-2 text-xs font-bold transition ${selected ? 'parchment-active border border-amber-400 text-amber-100' : 'parchment border border-amber-700/30 text-amber-100/65 hover:parchment-active'}">
            <div class="text-lg">${c.icon}</div>
            <div class="text-[10px] mt-0.5">${c.title.replace(/^(Report|Share|Ask|Tell )/, '').trim() || c.title}</div>
          </button>
        `;
      }).join('');

      // Area chips — multi-select
      const areaChips = FEEDBACK_AREAS.map(a => {
        const selected = (m.areas || []).includes(a.id);
        return `
          <button onclick="feedbackToggleArea('${a.id}')"
                  class="rounded-full px-3 py-1.5 text-xs transition ${selected ? 'parchment-active border border-amber-400 text-amber-100' : 'parchment border border-amber-700/30 text-amber-100/70 hover:parchment-active'}">
            ${a.icon} ${a.label}
          </button>
        `;
      }).join('');

      // Severity (bug only)
      const severityRow = k.showSeverity ? `
        <div class="mb-4">
          <div class="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">${t('feedback.severity_label')}</div>
          <div class="grid grid-cols-2 gap-2">
            ${FEEDBACK_SEVERITY.map(s => {
              const selected = m.severity === s.id;
              return `
                <button onclick="feedbackSet('severity', '${s.id}')"
                        class="text-left rounded-lg p-2 transition ${selected ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30 hover:parchment-active'}">
                  <div class="text-xs font-bold text-amber-100">${s.label}</div>
                  <div class="text-[10px] text-amber-100/60">${s.desc}</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : '';

      // Frequency (bug only)
      const frequencyRow = k.showFreq ? `
        <div class="mb-4">
          <div class="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">${t('feedback.frequency_label')}</div>
          <div class="flex flex-wrap gap-2">
            ${FEEDBACK_FREQUENCY.map(f => {
              const selected = m.frequency === f.id;
              return `
                <button onclick="feedbackSet('frequency', '${f.id}')"
                        class="rounded-full px-3 py-1.5 text-xs transition ${selected ? 'parchment-active border border-amber-400 text-amber-100' : 'parchment border border-amber-700/30 text-amber-100/70 hover:parchment-active'}">
                  ${f.label}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : '';

      content = `
        <div class="fade-in">
          <div class="text-center mb-3">
            <div class="text-3xl mb-1">${k.icon}</div>
            <h2 class="text-lg font-bold gold-text">${k.title}</h2>
            <p class="text-[11px] text-amber-100/60 italic mt-1">${k.subtitle}</p>
          </div>

          <!-- Kind switcher -->
          <div class="flex gap-1 mb-4">
            ${kindTabs}
          </div>

          <div class="parchment rounded-xl p-4 mb-3 border border-amber-700/40 max-h-[60vh] overflow-y-auto scrollbar">

            <!-- Summary (required) -->
            <div class="mb-4">
              <div class="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">${t('feedback.summary_label')} <span class="text-red-400">*</span></div>
              <input type="text"
                     placeholder="${t('feedback.summary_placeholder')}"
                     value="${(m.summary || '').replace(/"/g, '&quot;')}"
                     maxlength="80"
                     oninput="feedbackUpdateInput('summary', this.value)"
                     class="w-full bg-amber-950/30 border border-amber-900/40 rounded p-2 text-sm text-amber-100">
              <div class="text-[10px] text-amber-100/45 mt-1">${t('feedback.summary_hint')}</div>
            </div>

            <!-- Area -->
            <div class="mb-4">
              <div class="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">${t('feedback.area_label')}</div>
              <div class="flex flex-wrap gap-1.5">
                ${areaChips}
              </div>
              <div class="text-[10px] text-amber-100/45 mt-1">${t('feedback.area_hint')}</div>
            </div>

            ${severityRow}
            ${frequencyRow}

            <!-- Details -->
            <div class="mb-4">
              <div class="text-[11px] uppercase tracking-wider text-amber-300/80 mb-2">${m.kind === 'bug' ? t('feedback.details_label_bug') : m.kind === t('feedback.kind.idea_tab') ? t('feedback.details_label_idea') : m.kind === t('feedback.kind.help_tab') ? 'What\'s getting in the way?' : t('feedback.details_label_praise')}</div>
              <textarea rows="5"
                        placeholder="${m.kind === 'bug' ? '1. I tapped X\\n2. I expected Y\\n3. Instead I saw Z' : m.kind === t('feedback.kind.idea_tab') ? t('feedback.details_placeholder_idea') : m.kind === t('feedback.kind.help_tab') ? t('feedback.details_placeholder_help') : 'The part that\'s landing for you.'}"
                        oninput="feedbackUpdateInput('details', this.value)"
                        class="w-full bg-amber-950/30 border border-amber-900/40 rounded p-2 text-sm text-amber-100">${m.details || ''}</textarea>
            </div>

            <!-- Allow contact -->
            <label class="flex items-start gap-2 text-xs text-amber-100/85 cursor-pointer">
              <input type="checkbox" ${m.allowContact ? 'checked' : ''}
                     onchange="feedbackSet('allowContact', this.checked)"
                     class="mt-0.5">
              <span>${t('feedback.allow_contact_label')}</span>
            </label>

            <div class="mt-4 pt-3 border-t border-amber-900/30">
              <p class="text-[10px] text-amber-100/55 italic leading-relaxed">${t('feedback.privacy_note')}</p>
            </div>
          </div>

          <div class="flex justify-between gap-2">
            <button class="btn btn-ghost" onclick="closeModal()">${t('common.cancel')}</button>
            <button class="btn btn-gold" onclick="feedbackSend()">${t('feedback.send_button')}</button>
          </div>
        </div>
      `;
    }

  return content;
}
