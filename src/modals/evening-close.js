// ============================================================================
// modals/evening-close.js
// ----------------------------------------------------------------------------
// The evening close ceremony — a 6-phase modal that bookends each day.
//
//   gauge    : practitioner gauges their current energy (1–5) and how much
//              time they actually have (2 / 5 / 15 / open). The engine maps
//              these to a recommended depth (minimal / standard / deep / open).
//              An intention readback from the morning sits on top.
//
//   minimal  : 90-second close — 3 taps (gate held? dominant hindrance?
//              one-word summary)
//
//   standard : ~5 min — gate + hindrance + short paragraph
//
//   deep     : ~15 min — the four foundations survey (kāyānupassanā,
//              vedanānupassanā, cittānupassanā, dhammānupassanā) each
//              rated weak/some/present/strong/clear, plus a reflection
//
//   open     : no prescribed shape — free contemplation as long as it serves
//
//   done     : closing frame — DN 16 quote ("Conditioned things are of a
//              nature to decay; strive on with diligence"). Optional
//              teacher-voiced sutta suggestion surfaced when the text
//              arousing the day matches a known subcategory.
//
// Canonical hot spot: DN 16 Buddha's last words, in the `done` phase. The
// paraphrase is Walshe's rendering — translators MUST preserve the meaning.
//
// Exports:
//   renderEveningCloseModal(m) → string
//     Where m is the view.modal object with fields phase, energy, minutes,
//     answers, depth, suttaSuggestion, etc.
//
// Dependencies (all read from global scope):
//   State:     view (currentMember, modal)
//   Engine:    t() from engine/i18n.js
//   Helpers:   getTodayIntention, pickEveningCloseDepth
//   Data:      FIVE_HINDRANCES, SUTTA_SUBCATEGORIES
// ============================================================================

function renderEveningCloseModal(m) {
  let content = '';

  // v15.15 — merged flow entry phase. One-line capture + optional daily
  // diagnostic sliders, with two exits:
  //   * "Save and rest" (ghost) — stops here; still counts as full daily.
  //   * "Save and go deeper →" (gold) — proceeds to the gauge phase.
  // Replaces the standalone oneline_journal modal AND the separate
  // evening_reflection modal (the diagnostic sliders + rotating daily
  // question that used to live there now render inline here, preserving
  // the data-collection path without a second auto-fire surface).
  if (m.phase === 'oneline') {
    const memberId = view.currentMember;
    const alreadyDiag = memberId ? (typeof hasDailyDiagnosticToday === 'function' && hasDailyDiagnosticToday(memberId)) : true;
    const diagQs = (!alreadyDiag && typeof getDailyDiagnosticQuestions === 'function') ? getDailyDiagnosticQuestions() : [];
    const dailyQuestion = (typeof getCurrentDailyQuestion === 'function') ? getCurrentDailyQuestion() : null;
    // v15.17.5 — minimal-by-default reorder per ux-reviewer. The previous
    // order was: sliders → question → textarea. With diagQs.length > 0
    // (the default for a tester who hasn't done today's diagnostic yet),
    // the most cognitively demanding UI landed first. New order: prompt
    // → textarea (primary action) → sliders (optional diagnostic below).
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">✍️</div>
          <h2 class="text-xl font-bold gold-text">${t('evening_close.oneline.heading')}</h2>
          <p class="text-[11px] text-amber-200/70 italic mt-1">${t('evening_close.oneline.subtitle')}</p>
        </div>
        ${dailyQuestion ? `
          <div class="parchment rounded-xl p-3 mb-3 border-amber-700/30">
            <div class="text-[9px] uppercase tracking-wider text-amber-300/60 mb-1">${t('evening_close.oneline.tonight_label')}</div>
            <p class="serif text-[12px] text-amber-100/85 leading-relaxed italic">${dailyQuestion.q}</p>
          </div>
        ` : ''}
        <div class="parchment rounded-xl p-4 mb-3">
          <textarea id="oneline-input"
                    class="w-full bg-amber-950/30 border border-amber-700/40 rounded-lg p-3 text-sm text-amber-100 placeholder-amber-100/40 focus:outline-none focus:border-amber-500"
                    rows="3"
                    placeholder="${t('evening_close.oneline.placeholder')}"
                    maxlength="500"
                    oninput="eveningCloseSetLine(this.value)">${escapeHtml(m.line || '')}</textarea>
          <p class="text-[10px] text-amber-100/55 italic mt-2">${t('evening_close.oneline.hindrance_hint')}</p>
        </div>
        ${diagQs.length > 0 ? `
          <div class="parchment rounded-xl p-4 mb-3 border-amber-900/40">
            <p class="text-[10px] text-amber-100/50 italic mb-2">${t('evening_close.oneline.sliders_intro')}</p>
            ${diagQs.map(q => renderDiagnosticSlider(q, 5, `diag-${q.id}`)).join('')}
          </div>
        ` : ''}
        <div class="flex flex-col sm:flex-row justify-between gap-2">
          <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('evening_close.oneline.cancel_button')}</button>
          <div class="flex gap-2">
            <button class="btn btn-ghost text-sm" onclick="eveningCloseStopHere()">${t('evening_close.oneline.stop_button')}</button>
            <button class="btn btn-gold text-sm" onclick="eveningCloseGoDeeper()">${t('evening_close.oneline.continue_button')}</button>
          </div>
        </div>
        <p class="text-[10px] text-amber-100/45 italic text-center mt-3">${t('evening_close.oneline.footer_hint')}</p>
      </div>
    `;
  }
  else if (m.phase === 'gauge') {
    // v9.11 Turn B: intention readback at top of evening close
    const intent = view.currentMember ? getTodayIntention(view.currentMember) : null;
    const obs = intent && intent.observe ? FIVE_HINDRANCES.find(h => h.id === intent.observe) : null;
    // Static key per branch (lesson #3): with-observe vs no-observe.
    const readbackBody = !intent ? '' : (obs
      ? t('evening_close.intent_readback.with_observe', {cultivate: intent.cultivate, pali: obs.pali})
      : t('evening_close.intent_readback.no_observe', {cultivate: intent.cultivate}));
    const intentionReadback = intent ? `
      <div class="rounded-lg p-2.5 mb-3 border border-amber-700/30 bg-amber-950/30">
        <div class="text-[9px] uppercase tracking-wider text-amber-300/65 mb-1">${t('evening_close.intent_readback.eyebrow')}</div>
        <div class="text-[11px] text-amber-100/85 leading-relaxed">${readbackBody}</div>
      </div>
    ` : '';
    // Stable ID → t() maps (lesson #7) for energy / minutes / depth labels.
    // IMPORTANT: these helpers use static t() calls per branch, NOT runtime
    // concat. verify_strings only sees static literals — any dynamic
    // dispatch would fail both rules (miss key match AND orphan check).
    const energyLabel = (n) => {
      if (n === 1) return t('evening_close.gauge.energy_1');
      if (n === 2) return t('evening_close.gauge.energy_2');
      if (n === 3) return t('evening_close.gauge.energy_3');
      if (n === 4) return t('evening_close.gauge.energy_4');
      return t('evening_close.gauge.energy_5');
    };
    const minutesDesc = (n) => {
      if (n === 2)  return t('evening_close.gauge.minutes_desc_2');
      if (n === 5)  return t('evening_close.gauge.minutes_desc_5');
      if (n === 15) return t('evening_close.gauge.minutes_desc_15');
      return t('evening_close.gauge.minutes_desc_0');
    };
    const depthLabel = (d) => {
      if (d === 'minimal')  return t('evening_close.gauge.depth_minimal');
      if (d === 'standard') return t('evening_close.gauge.depth_standard');
      if (d === 'deep')     return t('evening_close.gauge.depth_deep');
      return t('evening_close.gauge.depth_open');
    };
    const depthDesc = (d) => {
      if (d === 'minimal')  return t('evening_close.gauge.depth_desc_minimal');
      if (d === 'standard') return t('evening_close.gauge.depth_desc_standard');
      if (d === 'deep')     return t('evening_close.gauge.depth_desc_deep');
      return t('evening_close.gauge.depth_desc_open');
    };
    const minutesButtonLabel = (n) => n === 0 ? t('evening_close.gauge.minutes_open') : t('evening_close.gauge.minutes_n', {n});
    const depthPreview = pickEveningCloseDepth(m.energy, m.minutes);
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">🪷</div>
          <h2 class="text-xl font-bold gold-text">${t('evening_close.gauge.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('evening_close.gauge.subtitle')}</div>
        </div>

        ${intentionReadback}

        <div class="parchment rounded-xl p-4 mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.gauge.energy_label')}</div>
          <div class="grid grid-cols-5 gap-1 mb-1">
            ${[1,2,3,4,5].map(n => `
              <button onclick="eveningCloseSetEnergy(${n})" class="rounded p-2 text-center transition ${m.energy === n ? 'bg-amber-700/50 border-2 border-amber-400' : 'bg-amber-950/30 border border-amber-900/40 hover:bg-amber-900/30'}">
                <div class="text-base font-bold ${m.energy === n ? 'text-amber-100' : 'text-amber-200/70'}">${n}</div>
              </button>
            `).join('')}
          </div>
          <div class="text-[10px] text-amber-100/65 italic text-center mt-1">${energyLabel(m.energy)}</div>
        </div>

        <div class="parchment rounded-xl p-4 mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.gauge.minutes_label')}</div>
          <div class="grid grid-cols-4 gap-1">
            ${[2, 5, 15, 0].map(n => `
              <button onclick="eveningCloseSetMinutes(${n})" class="rounded p-2 text-center transition ${m.minutes === n ? 'bg-amber-700/50 border-2 border-amber-400' : 'bg-amber-950/30 border border-amber-900/40 hover:bg-amber-900/30'}">
                <div class="text-xs ${m.minutes === n ? 'text-amber-100 font-bold' : 'text-amber-200/70'}">${minutesButtonLabel(n)}</div>
              </button>
            `).join('')}
          </div>
          <div class="text-[10px] text-amber-100/65 italic text-center mt-2">${minutesDesc(m.minutes)}</div>
        </div>

        <div class="parchment rounded-xl p-3 mb-3 bg-amber-950/30 border border-amber-700/30">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('evening_close.gauge.depth_label')}</div>
          <div class="text-sm text-amber-200"><b>${depthLabel(depthPreview)}</b></div>
          <div class="text-[10px] text-amber-100/55 italic mt-1">${depthDesc(depthPreview)}</div>
        </div>

        <div class="flex flex-col gap-2">
          <button class="btn btn-gold w-full" onclick="eveningCloseProceed()">${t('evening_close.gauge.proceed_button', {depth: depthLabel(depthPreview)})}</button>
          <button class="text-[11px] text-amber-300/70 hover:text-amber-200 underline text-center" onclick="eveningCloseRest()">${t('evening_close.gauge.rest_button')}</button>
        </div>
      </div>
    `;
  } else if (m.phase === 'minimal') {
    const a = m.answers || {};
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-3xl mb-1">🌙</div>
          <h2 class="text-lg font-bold gold-text">${t('evening_close.minimal.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('evening_close.minimal.subtitle')}</div>
        </div>
        <div class="parchment rounded-xl p-4 mb-3 space-y-3">
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.minimal.q1_label')}</div>
            <div class="flex gap-2">
              <button onclick="eveningCloseSetAnswer('gate_held', true)" class="flex-1 rounded p-2 text-sm transition ${a.gate_held === true ? 'bg-emerald-700/50 border-2 border-emerald-400 text-emerald-100' : 'bg-amber-950/30 border border-amber-900/40 text-amber-200/70 hover:bg-amber-900/30'}">${t('evening_close.answer_yes')}</button>
              <button onclick="eveningCloseSetAnswer('gate_held', false)" class="flex-1 rounded p-2 text-sm transition ${a.gate_held === false ? 'bg-amber-700/50 border-2 border-amber-400 text-amber-100' : 'bg-amber-950/30 border border-amber-900/40 text-amber-200/70 hover:bg-amber-900/30'}">${t('evening_close.answer_no')}</button>
            </div>
          </div>
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.minimal.q2_label')}</div>
            <div class="grid grid-cols-1 gap-1">
              ${FIVE_HINDRANCES.map(h => `
                <button onclick="eveningCloseSetAnswer('dominant_hindrance', '${h.pali}')" class="rounded p-2 text-left text-[12px] transition ${a.dominant_hindrance === h.pali ? 'bg-amber-700/50 border-2 border-amber-400 text-amber-100' : 'bg-amber-950/30 border border-amber-900/40 text-amber-200/70 hover:bg-amber-900/30'}">
                  <span class="text-base">${h.icon}</span>
                  <b>${h.pali}</b>
                  <span class="text-amber-100/60">— ${h.english}</span>
                </button>
              `).join('')}
              <button onclick="eveningCloseSetAnswer('dominant_hindrance', 'none')" class="rounded p-2 text-left text-[12px] transition ${a.dominant_hindrance === 'none' ? 'bg-emerald-700/50 border-2 border-emerald-400 text-emerald-100' : 'bg-amber-950/30 border border-amber-900/40 text-amber-200/70 hover:bg-amber-900/30'}">
                <span class="text-base">🪷</span> <b>${t('evening_close.minimal.hindrance_none')}</b>
              </button>
            </div>
          </div>
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.minimal.q3_label')}</div>
            <input type="text" id="eveclose-oneword" class="w-full bg-amber-950/30 border border-amber-700/40 rounded-lg p-2 text-sm text-amber-100" maxlength="40" placeholder="${t('evening_close.minimal.q3_placeholder')}" value="${a.one_word || ''}" oninput="view.modal.answers.one_word = this.value" />
          </div>
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('evening_close.cancel_button')}</button>
          <button class="btn btn-gold" onclick="eveningCloseFinish()">${t('evening_close.close_button')}</button>
        </div>
      </div>
    `;
  } else if (m.phase === 'standard') {
    const a = m.answers || {};
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-3xl mb-1">🌙</div>
          <h2 class="text-lg font-bold gold-text">${t('evening_close.standard.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('evening_close.standard.subtitle')}</div>
        </div>
        <div class="parchment rounded-xl p-4 mb-3 space-y-3">
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.standard.q1_label')}</div>
            <div class="flex gap-2">
              <button onclick="eveningCloseSetAnswer('gate_held', true)" class="flex-1 rounded p-2 text-sm transition ${a.gate_held === true ? 'bg-emerald-700/50 border-2 border-emerald-400 text-emerald-100' : 'bg-amber-950/30 border border-amber-900/40 text-amber-200/70 hover:bg-amber-900/30'}">${t('evening_close.answer_yes')}</button>
              <button onclick="eveningCloseSetAnswer('gate_held', false)" class="flex-1 rounded p-2 text-sm transition ${a.gate_held === false ? 'bg-amber-700/50 border-2 border-amber-400 text-amber-100' : 'bg-amber-950/30 border border-amber-900/40 text-amber-200/70 hover:bg-amber-900/30'}">${t('evening_close.answer_no')}</button>
            </div>
          </div>
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.standard.q2_label')}</div>
            <div class="grid grid-cols-1 gap-1">
              ${FIVE_HINDRANCES.map(h => `
                <button onclick="eveningCloseSetAnswer('dominant_hindrance', '${h.pali}')" class="rounded p-1.5 text-left text-[11px] transition ${a.dominant_hindrance === h.pali ? 'bg-amber-700/50 border-2 border-amber-400 text-amber-100' : 'bg-amber-950/30 border border-amber-900/40 text-amber-200/70 hover:bg-amber-900/30'}">
                  <span>${h.icon}</span> <b>${h.pali}</b> <span class="text-amber-100/55">— ${h.english}</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.standard.q3_label')}</div>
            <textarea id="eveclose-deeper" class="w-full bg-amber-950/30 border border-amber-700/40 rounded-lg p-2 text-sm text-amber-100" rows="4" maxlength="800" placeholder="${t('evening_close.standard.q3_placeholder')}" oninput="view.modal.answers.deeper = this.value">${a.deeper || ''}</textarea>
          </div>
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('evening_close.cancel_button')}</button>
          <button class="btn btn-gold" onclick="eveningCloseFinish()">${t('evening_close.close_button')}</button>
        </div>
      </div>
    `;
  } else if (m.phase === 'deep') {
    const a = m.answers || {};
    const f = a.foundations || {};
    // Foundation labels/descs moved from inline literals to per-entry t()
    // keyed by stable ID (lesson #5). The 'FOUR' structure pattern remains
    // for parity with renderReflection.
    const FOUR = [
      { id: 'body',     label: t('evening_close.deep.foundation_body_label'),     desc: t('evening_close.deep.foundation_body_desc') },
      { id: 'feeling',  label: t('evening_close.deep.foundation_feeling_label'),  desc: t('evening_close.deep.foundation_feeling_desc') },
      { id: 'mind',     label: t('evening_close.deep.foundation_mind_label'),     desc: t('evening_close.deep.foundation_mind_desc') },
      { id: 'dhammas',  label: t('evening_close.deep.foundation_dhammas_label'),  desc: t('evening_close.deep.foundation_dhammas_desc') }
    ];
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-3xl mb-1">🌌</div>
          <h2 class="text-lg font-bold gold-text">${t('evening_close.deep.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('evening_close.deep.subtitle')}</div>
        </div>
        <div class="parchment rounded-xl p-4 mb-3 space-y-3">
          ${FOUR.map(F => `
            <div>
              <div class="text-[11px] text-amber-200 mb-1"><b>${F.label}</b></div>
              <div class="text-[10px] text-amber-100/60 italic mb-1">${F.desc}</div>
              <div class="grid grid-cols-5 gap-1">
                ${['weak','some','present','strong','clear'].map((lbl, idx) => `
                  <button onclick="if(!view.modal.answers.foundations) view.modal.answers.foundations = {}; view.modal.answers.foundations.${F.id} = '${lbl}'; renderModal()" class="rounded p-1 text-[10px] transition ${f[F.id] === lbl ? 'bg-emerald-700/40 border border-emerald-400 text-emerald-100' : 'bg-amber-950/30 border border-amber-900/40 text-amber-200/65 hover:bg-amber-900/30'}">${lbl}</button>
                `).join('')}
              </div>
            </div>
          `).join('')}
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.deep.reflection_label')}</div>
            <textarea id="eveclose-deeper" class="w-full bg-amber-950/30 border border-amber-700/40 rounded-lg p-2 text-sm text-amber-100" rows="5" maxlength="2000" placeholder="${t('evening_close.deep.reflection_placeholder')}" oninput="view.modal.answers.deeper = this.value">${a.deeper || ''}</textarea>
          </div>
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('evening_close.cancel_button')}</button>
          <button class="btn btn-gold" onclick="eveningCloseFinish()">${t('evening_close.close_button')}</button>
        </div>
      </div>
    `;
  } else if (m.phase === 'open') {
    const a = m.answers || {};
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-3xl mb-1">☸️</div>
          <h2 class="text-lg font-bold gold-text">${t('evening_close.open.heading')}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('evening_close.open.subtitle')}</div>
        </div>
        <div class="parchment rounded-xl p-4 mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('evening_close.open.contemplation_label')}</div>
          <textarea id="eveclose-contemplation" class="w-full bg-amber-950/30 border border-amber-700/40 rounded-lg p-3 text-sm text-amber-100" rows="14" maxlength="5000" placeholder="${t('evening_close.open.contemplation_placeholder')}" oninput="view.modal.answers.contemplation = this.value">${a.contemplation || ''}</textarea>
          <p class="text-[10px] text-amber-100/55 italic mt-2">${t('evening_close.open.footer_note')}</p>
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('evening_close.open.save_later_button')}</button>
          <button class="btn btn-gold" onclick="eveningCloseFinish()">${t('evening_close.open.done_button')}</button>
        </div>
      </div>
    `;
  } else if (m.phase === 'done') {
    // Depth label via stable ID → t() map (lesson #7).
    const depthLabelForDone = (d) => {
      if (d === 'minimal')  return t('evening_close.done.depth_label_minimal');
      if (d === 'standard') return t('evening_close.done.depth_label_standard');
      if (d === 'deep')     return t('evening_close.done.depth_label_deep');
      if (d === 'open')     return t('evening_close.done.depth_label_open');
      return t('evening_close.done.depth_label_fallback');
    };
    // v13.2 — surface the matched sutta suggestion, if any, with a
    // teacher-voiced framing that differs depending on whether the
    // practitioner has already read it.
    const sug = m.suttaSuggestion;
    let suggestionBlock = '';
    if (sug && sug.sutta) {
      const sutta = sug.sutta;
      const sub = SUTTA_SUBCATEGORIES.find(x => x.id === sug.subId);
      const framing = sug.alreadyRead
        ? t('evening_close.suggestion.framing_already')
        : t('evening_close.suggestion.framing_new');
      const ctaLabel = sug.alreadyRead
        ? t('evening_close.suggestion.button_return')
        : t('evening_close.suggestion.button_open');
      suggestionBlock = `
        <div class="parchment rounded-xl p-4 mt-5 text-left border border-amber-600/50 bg-amber-950/25">
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-lg">${sub?.icon || '📜'}</span>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/90 flex-1">${t('evening_close.suggestion.eyebrow', {label: sub?.label || t('evening_close.suggestion.label_fallback')})}</div>
          </div>
          <p class="serif text-[12px] text-amber-100/85 leading-relaxed italic mb-3">${framing}</p>
          <div class="parchment rounded-lg p-2.5 mb-2 border border-amber-700/30">
            <div class="text-[11px]"><b class="text-amber-100">${sutta.ref}</b> <span class="text-amber-200">${sutta.name}</span></div>
            <div class="text-[10px] text-amber-200/70 italic mb-1">${sutta.english}</div>
            <p class="text-[11px] text-amber-100/80 leading-relaxed">${sutta.summary}</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-gold text-xs flex-1" onclick="openSutta('${sutta.id}')">${ctaLabel}</button>
            <button class="btn btn-ghost text-xs" onclick="openSuttaSubcategory('${sug.subId}')">${t('evening_close.suggestion.button_more')}</button>
          </div>
          <p class="text-[9px] text-amber-100/40 italic mt-2 text-center">${t('evening_close.suggestion.dismiss_note')}</p>
        </div>
      `;
    }
    content = `
      <div class="fade-in text-center">
        <div class="text-5xl mb-2">🪷</div>
        <h2 class="text-xl font-bold gold-text">${t('evening_close.done.heading')}</h2>
        <p class="text-sm text-amber-100/85 italic mt-2">${t('evening_close.done.closed_with', {depth: depthLabelForDone(m.depth)})}</p>
        <p class="text-[11px] text-amber-100/65 italic mt-4 leading-relaxed">${t('evening_close.done.dn16_quote')}</p>
        ${suggestionBlock}
        <div class="mt-5">
          <button class="btn btn-gold" onclick="closeModal()">${t('evening_close.done.sleep_button')}</button>
        </div>
      </div>
    `;
  }

  return content;
}
