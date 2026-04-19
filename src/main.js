// ============================================================================
// src/main.js
// ----------------------------------------------------------------------------
// Top-level dispatchers + bootstrap. Concatenated last into the built HTML
// so all extracted modules are already defined by the time render() first
// fires. Contains:
//
//   render()       Top-level tab dispatcher. Called on every state change.
//                  Reads view.tab and delegates to the appropriate render*
//                  function in src/render/*.js.
//
//   renderModal()  The modal dispatcher. Reads view.modal and delegates to
//                  the appropriate render*Modal helper in src/modals/*.js.
//
//   INIT           Bootstrap:
//                    - Recover member[0] if state is loaded
//                    - Render once
//                    - Resume paused onboarding diagnostic if any
//                    - Show recent-setback recovery modal if triggered
// ============================================================================

function render() {
  const app = document.getElementById('app');

  if (!state || !state.setupComplete) {
    renderWelcome();
    return;
  }

  if (!view.currentMember) view.currentMember = state.members[0]?.id;

  // v9.7: apply tisikkhā slow decay for all members on each render. Idempotent.
  for (const m of state.members) {
    applyTisikkhaDecay(m.id);
  }

  updateShadowVisual();

  app.innerHTML = `
    ${renderHeader()}
    ${renderTabs()}
    <main id="content"></main>
  `;

  const content = document.getElementById('content');
  if (view.tab === 'today') content.innerHTML = renderToday();
  else if (view.tab === 'path') content.innerHTML = renderPath();
  else if (view.tab === 'reflection') content.innerHTML = renderReflection();
  else if (view.tab === 'wisdom') content.innerHTML = renderWisdom();
  else if (view.tab === 'study') content.innerHTML = renderStudy();
  else if (view.tab === 'review') content.innerHTML = renderReview();
  else if (view.tab === 'quest') { view.tab = 'path'; content.innerHTML = renderPath(); }
  else if (view.tab === 'sangha') content.innerHTML = renderSangha();
  else if (view.tab === 'mara') { view.tab = 'path'; content.innerHTML = renderPath(); }
  else if (view.tab === 'codex') { view.tab = 'wisdom'; content.innerHTML = renderWisdom(); }
  else if (view.tab === 'habits') content.innerHTML = renderHabitManager();
  else if (view.tab === 'settings') content.innerHTML = renderSettings();

  // Evening reflection popup — trigger once per session after 18:00 if not done
  maybeTriggerEveningReflection();
  // v9.1: rank advancement announcement
  maybeTriggerRankAnnouncement();
  // v9.4: end-game liberation offer
  maybeTriggerLiberationOffer();
  // v15.0: one-time beta tester guide after first onboarding completes
  if (typeof maybeShowBetaGuide === 'function') maybeShowBetaGuide();
}

function renderModal() {
  const root = document.getElementById('modal-root');
  if (!view.modal) { root.innerHTML = ''; return; }

  let content = '';
  const m = view.modal;

  if (m.type === 'setup') {
    content = renderSetup();
  }
  else if (m.type === 'setup_loading') {
    const phrases = [
      'Gathering the sangha...',
      'Preparing the cushion...',
      'Lighting the first lamp...',
      'The path opens before you...'
    ];
    content = `
      <div class="text-center py-8 fade-in">
        <div class="text-8xl mb-6 breath">☸️</div>
        <h2 class="text-2xl font-bold gold-text mb-3">Preparing the Path</h2>
        <p class="text-amber-100/70 italic serif">${phrases[Math.floor(Math.random() * phrases.length)]}</p>
        <div class="mt-6 max-w-xs mx-auto">
          <div class="progress-bar"><div class="progress-fill shimmer" style="width:100%; animation: pulse 2s ease-in-out infinite;"></div></div>
        </div>
        <div id="emergency-enter" class="mt-6" style="opacity:0; transition: opacity 0.8s;">
          <button class="btn btn-gold" onclick="completeSetupTransition()">🪷 Enter the Path</button>
          <p class="text-xs text-amber-300/50 mt-2 italic">Taking longer than expected? Tap to continue.</p>
        </div>
      </div>
    `;
    // Reveal the emergency button after 5 seconds using requestAnimationFrame
    // so it's tied to the render cycle, not vulnerable to timeout stalls
    setTimeout(() => {
      const el = document.getElementById('emergency-enter');
      if (el) el.style.opacity = '1';
    }, 5000);
  }
  else if (m.type === 'character_detail') {
    const c = CHARACTERS[m.charId];
    if (!c) { closeModal(); return; }
    const alreadyChosen = view.setupData.members?.some(mm => mm.character === m.charId);
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-7xl mb-2">${c.icon}</div>
          <h2 class="text-2xl font-bold gold-text">${c.name}</h2>
          <p class="text-sm italic text-amber-200/70">${c.title}</p>
          <p class="text-xs text-amber-300/60 mt-1">${c.suttaRef}</p>
        </div>
        <div class="parchment rounded-xl p-4 mb-4">
          <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${t('character_detail.story_label')}</div>
          <p class="text-sm text-amber-100/90 leading-relaxed">${c.bio}</p>
        </div>
        <div class="parchment rounded-xl p-4 mb-4 border-amber-700/50">
          <div class="text-xs uppercase tracking-wider text-amber-300 mb-1">✨ ${c.ability}</div>
          <div class="inline-block bg-purple-900/30 border border-purple-700/50 text-purple-200 text-xs px-2 py-1 rounded mb-2">${c.abilityEffect||''}</div>
          <p class="text-sm text-amber-100/90 leading-relaxed">${c.abilityDesc}</p>
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost" onclick="closeModal()">Close</button>
          ${alreadyChosen
            ? `<button class="btn btn-ghost" disabled>${t('character_detail.already_chosen')}</button>`
            : `<button class="btn btn-gold" onclick="selectCharacterFromDetail('${m.charId}')">${t('character_detail.choose_button')}</button>`
          }
        </div>
      </div>
    `;
  }
  else if (m.type === 'evening_reflection') {
    content = renderEveningReflectionModal(m);
  }
  else if (m.type === 'wisdom') {
    const w = WISDOM_SCROLLS.find(x => x.id === m.wisdomId);
    if (!w) { closeModal(); return; }
    content = `
      <div class="scroll-reveal">
        <div class="scroll-paper">
          <div class="text-center mb-4">
            <div class="text-4xl mb-2">📜</div>
            <div class="text-xs uppercase tracking-wider text-amber-900/70">${w.source}</div>
            <h3 class="text-2xl font-bold mt-1">${w.title}</h3>
          </div>
          <p class="text-base leading-relaxed">${w.text}</p>
        </div>
        <div class="text-center mt-4">
          <button class="btn btn-gold" onclick="closeModal()">${t('wisdom.modal.close_button')}</button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'army_challenge') {
    const a = MARA_ARMIES.find(x => x.id === m.armyId);
    if (!a) { closeModal(); return; }
    const defeated = state.defeatedArmies.includes(a.id);
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-6xl mb-2">${defeated ? '✓' : a.icon}</div>
          <div class="text-xs uppercase tracking-wider text-red-400/70">${t('army.challenge.meta', {id: a.id, ref: a.suttaRef})}</div>
          <h2 class="text-2xl font-bold ${defeated?'text-emerald-300':'text-red-300'} mt-1">${a.english}</h2>
          <p class="text-sm italic text-amber-100/60">${a.name}</p>
        </div>
        <div class="parchment rounded-xl p-4 mb-4">
          <p class="text-amber-100/90 leading-relaxed">${a.desc}</p>
        </div>
        <div class="parchment rounded-xl p-4 mb-4 border-amber-700/50">
          <div class="text-xs uppercase tracking-wider text-amber-300 mb-2">${t('army.challenge.description_label')}</div>
          <p class="text-amber-100">${a.challenge}</p>
        </div>
        <div class="flex justify-center gap-2 flex-wrap">
          ${!defeated ? `<button class="btn btn-gold" onclick="markArmyDefeated(${a.id})">${t('army.challenge.mark_defeated_button')}</button>` : ''}
          ${(() => {
            if (defeated) return '';
            const khemas = membersWithTriggered('armyDismissal');
            const available = khemas.find(k => canUseAbility(k.id, 'armyDismissal'));
            if (!available) return '';
            return `<button class="btn btn-ghost text-xs" onclick="useKhemaArmyDismissal('${available.id}', ${a.id})">${t('army.challenge.khema_dismiss_button')}</button>`;
          })()}
          <button class="btn btn-ghost" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'army_defeated') {
    const a = MARA_ARMIES.find(x => x.id === m.armyId);
    content = `
      <div class="text-center fade-in">
        <div class="text-7xl mb-3">⚔️</div>
        <h2 class="text-3xl font-bold gold-text mb-2">${t('army.defeated.heading')}</h2>
        <p class="text-amber-100/80 mb-4">${t('army.defeated.fallen', {english: a.english, name: a.name})}</p>
        <div class="parchment rounded-xl p-4 mb-4">
          <p class="text-sm text-amber-100/80">${t('army.defeated.shadow_recedes_many', {n: 10 - state.defeatedArmies.length})}</p>
        </div>
        <button class="btn btn-gold" onclick="closeModal()">${t('army.defeated.continue_button')}</button>
      </div>
    `;
  }
  else if (m.type === 'stage_advance') {
    const oldStage = STAGES[m.oldStage];
    const newStage = STAGES[m.oldStage + 1];
    content = `
      <div class="text-center fade-in">
        <div class="text-7xl mb-3">${newStage?.icon || '☸️'}</div>
        <h2 class="text-3xl font-bold gold-text mb-1">${t('stage_advance.heading')}</h2>
        <p class="text-amber-300 italic mb-4">${t('stage_advance.stage_transition', {oldName: oldStage.name, newName: newStage?.name || t('stage_advance.awakening_fallback')})}</p>

        ${m.newScrolls.length > 0 ? `
        <div class="parchment rounded-xl p-4 mb-4 text-left">
          <div class="text-xs uppercase tracking-wider text-amber-300 mb-2">${t('stage_advance.new_scrolls_label')}</div>
          ${m.newScrolls.map(w => `
            <div class="cursor-pointer hover:bg-amber-900/20 rounded p-2" onclick="closeModal();showWisdom('${w.id}')">
              <div class="font-bold text-amber-100">${w.title}</div>
              <div class="text-xs text-amber-300/70">${w.source}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${newStage ? `
        <div class="parchment rounded-xl p-4 mb-4 text-left">
          <div class="text-xs uppercase tracking-wider text-amber-300 mb-1">${t('stage_advance.next_stage_label')}</div>
          <h3 class="font-bold text-amber-100">${newStage.name}</h3>
          <p class="text-sm text-amber-100/70 mt-1">${newStage.description}</p>
        </div>
        ` : ''}

        <button class="btn btn-gold" onclick="closeModal()">${t('stage_advance.walk_on_button')}</button>
      </div>
    `;
  }
  else if (m.type === 'victory') {
    content = renderVictoryModal(m);
  }
  else if (m.type === 'privacy_detail') {
    content = renderPrivacyDetailModal(m);
  }
  else if (m.type === 'impressum') {
    content = renderImpressumModal(m);
  }
  else if (m.type === 'datenschutz') {
    content = renderDatenschutzModal(m);
  }
  else if (m.type === 'confirm_habit_done') {
    content = renderConfirmHabitDoneModal(m);
  }
  else if (m.type === 'feedback_fab_menu') {
    content = renderFeedbackFabMenuModal(m);
  }
  else if (m.type === 'element_feedback') {
    content = renderElementFeedbackModal(m);
  }
  else if (m.type === 'feedback') {
    content = renderFeedbackModal(m);
  }
  else if (m.type === 'defeat') {
    content = renderDefeatModal(m);
  }
  else if (m.type === 'addHabit') {
    content = renderAddHabitModal(m);
  }
  else if (m.type === 'daily_reflection') {
    const daily = getCurrentDailyQuestion();
    const expanded = !!m.expanded;
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-4xl mb-2">🪞</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${t('daily_reflection.eyebrow')}</div>
          <h2 class="text-lg font-bold gold-text mt-1">${t('daily_reflection.heading')}</h2>
        </div>
        <div class="parchment rounded-xl p-4 mb-4 border-amber-700/30">
          <p class="serif text-sm text-amber-100/90 leading-relaxed">${daily.q}</p>
          ${expanded ? `
            <div class="mt-3 pt-3 border-t border-amber-900/30">
              <textarea id="daily-answer" rows="4" placeholder=t('daily_reflection.textarea_placeholder')></textarea>
              <p class="text-[10px] text-amber-100/40 italic mt-1">${t('daily_reflection.privacy_note')}</p>
            </div>
          ` : `
            <button class="text-xs text-amber-300/80 hover:text-amber-200 mt-2" onclick="toggleReflectionExpand()">
              ${t('evening_reflection.want_response')}
            </button>
          `}
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost text-xs" onclick="closeModal()">${t('daily_reflection.later_button')}</button>
          <button class="btn btn-gold" onclick="submitDailyReflection()">${expanded ? t('daily_reflection.save_complete_button') : t('daily_reflection.complete_button')}</button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'weekly_reflection') {
    const weekly = m.historical
      ? WEEKLY_REFLECTIONS.find(w => w.week === m.historical)
      : getCurrentWeekly();
    if (!weekly) { closeModal(); return; }
    const historical = m.historical && state.completedWeeklies.includes(m.historical);
    const prevAnswers = historical
      ? (function() {
          const mid = view.currentMember;
          for (const dk of Object.keys(state.reflectionLog)) {
            const e = state.reflectionLog[dk]?.[mid];
            if (e?.weekly?.week === m.historical) return e.weekly.answers;
          }
          return [];
        })()
      : [];
    const showWeeklyDiag = !historical;
    const weeklyDiagSliders = showWeeklyDiag ? WEEKLY_DIAGNOSTIC.sliders.map(q =>
      renderDiagnosticSlider({ question: q.question, labels: q.labels, min: 0, max: 10 }, 5, `wdiag-${q.id}`)
    ).join('') : '';
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-xs uppercase tracking-wider text-amber-300/70">Week ${weekly.week} of 12 • ${weekly.suttaRef}</div>
          <h2 class="text-2xl font-bold gold-text mt-1">${weekly.title}</h2>
          <p class="text-sm text-amber-200/70 italic">${weekly.teaser}</p>
        </div>
        <div class="parchment rounded-xl p-5 mb-4">
          <p class="serif text-sm text-amber-100/90 leading-relaxed">${weekly.context}</p>
        </div>
        <div class="space-y-4 mb-4">
          ${weekly.questions.map((q, i) => `
            <div>
              <label class="text-xs text-amber-300/80 block mb-1">${i + 1}. ${q}</label>
              <textarea id="weekly-a-${i}" rows="3" ${historical ? 'readonly' : ''}>${prevAnswers[i] || ''}</textarea>
            </div>
          `).join('')}
        </div>
        ${showWeeklyDiag ? `
        <div class="parchment rounded-xl p-4 mb-4">
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-1">${t('weekly_reflection.checkin_label')}</div>
          <p class="text-xs text-amber-100/60 mb-3 italic">${t('weekly_reflection.checkin_sub')}</p>
          ${weeklyDiagSliders}
          <div class="mt-3">
            <label class="text-xs text-amber-300/80 block mb-1">${WEEKLY_DIAGNOSTIC.writing.question}</label>
            <p class="text-[11px] text-amber-100/50 italic mb-1">${WEEKLY_DIAGNOSTIC.writing.hint}</p>
            <textarea id="weekly-diag-writing" rows="4" placeholder=t('weekly_reflection.writing_placeholder')></textarea>
          </div>
        </div>
        ` : ''}
        <div class="parchment rounded-xl p-4 mb-4 border-amber-700/40">
          <p class="serif text-sm text-amber-100/85 italic leading-relaxed">${weekly.closing}</p>
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn btn-ghost" onclick="closeModal()">${historical ? t('common.close') : t('weekly_reflection.save_draft_close')}</button>
          ${!historical ? `<button class="btn btn-gold" onclick="submitWeeklyReflection()">${t('weekly_reflection.complete_button')}</button>` : ''}
        </div>
      </div>
    `;
  }
  else if (m.type === 'monthly_reflection') {
    content = renderMonthlyReflectionModal(m);
  }
  else if (m.type === 'onboarding_diagnostic') {
    const member = state.members.find(x => x.id === m.memberId);
    const q = ONBOARDING_DIAGNOSTIC[m.step];
    const total = ONBOARDING_DIAGNOSTIC.length;
    const val = m.answers[q.id];
    let body = '';
    if (q.type === 'slider') {
      const current = (val != null) ? val : Math.round((q.min + q.max) / 2);
      // Pre-populate so the Next button works even if the user doesn't touch the slider.
      if (m.answers[q.id] === undefined) m.answers[q.id] = current;
      const valId = `onb-val-${q.id}`;
      body = `
        <input type="range" id="onb-slider-${q.id}" min="${q.min}" max="${q.max}" value="${current}"
          class="w-full accent-amber-400"
          oninput="document.getElementById('${valId}').textContent=this.value; onboardingDiagnosticSliderTouch('${q.id}', parseInt(this.value, 10))">
        <div class="flex justify-between text-xs text-amber-300/70 mt-1">
          <span>${q.labels[0]}</span>
          <span id="${valId}" class="text-amber-200 font-bold text-lg">${current}</span>
          <span>${q.labels[1]}</span>
        </div>
      `;
    } else if (q.type === 'select') {
      body = `
        <div class="space-y-2">
          ${q.options.map(opt => `
            <button onclick="onboardingDiagnosticAnswer('${q.id}', '${opt.key}')"
              class="parchment ${val === opt.key ? 'parchment-active border-amber-400' : ''} rounded-lg p-3 w-full text-left hover:parchment-active transition">
              <div class="flex items-start gap-3">
                <div class="text-2xl">${opt.icon}</div>
                <div class="flex-1">
                  <div class="font-bold text-amber-100">${opt.label}</div>
                  <div class="text-xs text-amber-100/70">${opt.desc}</div>
                </div>
                ${val === opt.key ? '<div class="text-amber-300 text-xl">✓</div>' : ''}
              </div>
            </button>
          `).join('')}
        </div>
      `;
    }
    const canNext = q.type === 'slider' ? true : (val !== undefined);
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-xs uppercase tracking-wider text-amber-300/70">Your teacher's first meeting with ${member?.name || 'you'}</div>
          <div class="text-[10px] text-amber-100/50 mt-1">Question ${m.step + 1} of ${total}</div>
        </div>
        <div class="parchment rounded-xl p-5 mb-4 border-amber-700/50">
          <p class="serif text-lg text-amber-100 leading-relaxed">${q.question}</p>
          ${q.hint ? `<p class="text-xs text-amber-100/60 italic mt-2">${q.hint}</p>` : ''}
        </div>
        ${body}
        <div class="flex justify-between gap-2 mt-5">
          <button class="btn btn-ghost ${m.step === 0 ? 'opacity-30 pointer-events-none' : ''}" onclick="onboardingDiagnosticBack()">${t('guided_flow.back_button')}</button>
          <button class="btn btn-gold ${canNext ? '' : 'opacity-40 pointer-events-none'}" onclick="onboardingDiagnosticNext()">
            ${m.step === total - 1 ? 'Done' : t('guided_flow.next_button')}
          </button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'first_guidance') {
    content = renderFirstGuidanceModal(m);
  }
  else if (m.type === 'technique_teaching') {
    const rx = TECHNIQUE_PRESCRIPTIONS[m.key];
    if (!rx) { closeModal(); return; }
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🪔</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${rx.suttaRef}</div>
          <h2 class="text-2xl font-bold gold-text mt-1">${rx.title}</h2>
        </div>
        <div class="parchment rounded-xl p-5 mb-4 border-amber-700/50">
          <p class="serif text-sm text-amber-100/90 leading-relaxed whitespace-pre-line">${rx.teaching}</p>
        </div>
        <p class="text-xs text-amber-100/50 italic mb-3 text-center">${t('technique_teaching.footer_note')}</p>
        <div class="flex justify-end">
          <button class="btn btn-gold" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'meditation_tutorial' || m.type === 'guided_flow') {
    // v4_2: both names are accepted. 'meditation_tutorial' is the legacy
    // alias that defaults to flowId='basic_meditation'; new flows opened
    // by Session 3 use 'guided_flow' with an explicit flowId.
    const flowId = m.flowId || 'basic_meditation';
    const flow = GUIDED_FLOWS[flowId];
    if (!flow) { closeModal(); return; }
    const steps = flow.steps;
    const step = m.step || 0;
    const total = steps.length;
    const sec = steps[step];
    if (!sec) { closeModal(); return; }

    // v12.1 — dynamic body for the posture step in the basic meditation
    // tutorial. Leads with whatever posture the practitioner chose in the
    // diagnostic. The other options are there but quieter. If no posture
    // was selected (or they picked 'unsure'), falls back to the original
    // even-handed presentation of all three.
    let bodyText = sec.body;
    if (flowId === 'basic_meditation' && sec.id === 'posture') {
      const mid = view.currentMember;
      const chosenPosture = mid ? state.diagnostics?.onboarding?.[mid]?.answers?.posture : null;
      bodyText = renderAdaptivePostureBody(chosenPosture);
    }

    const paras = bodyText.split('\n\n').filter(p => p.trim());
    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">${flow.icon || '📖'}</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${t('guided_flow.progress_label', {title: flow.title, step: step + 1, total: total})}</div>
          <h2 class="text-2xl font-bold gold-text mt-1">${sec.title}</h2>
        </div>
        <div class="parchment rounded-xl p-5 mb-4 border-amber-700/40 max-h-[55vh] overflow-y-auto scrollbar">
          ${paras.map(p => `<p class="serif text-sm text-amber-100/90 leading-relaxed mb-3">${p}</p>`).join('')}
        </div>
        <div class="flex items-center justify-between gap-2">
          <button class="btn btn-ghost ${step === 0 ? 'opacity-30 pointer-events-none' : ''}" onclick="openGuidedFlow('${flowId}', ${step - 1})">← Back</button>
          <div class="flex gap-1">
            ${steps.map((_, i) => `<div class="w-2 h-2 rounded-full ${i === step ? 'bg-amber-300' : 'bg-amber-700/40'}"></div>`).join('')}
          </div>
          ${step < total - 1
            ? `<button class="btn btn-gold" onclick="openGuidedFlow('${flowId}', ${step + 1})">Next →</button>`
            : `<button class="btn btn-gold" onclick="closeModal()">${t('guided_flow.finish_button')}</button>`
          }
        </div>
      </div>
    `;
  }
  else if (m.type === 'evening_next_member') {
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-4xl mb-2">🪷</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${t('evening_next_member.eyebrow')}</div>
          <h2 class="text-lg font-bold gold-text mt-1">${t('evening_next_member.heading')}</h2>
        </div>
        <div class="parchment rounded-xl p-4 mb-4 border-amber-700/30">
          <p class="text-sm text-amber-100/90 leading-relaxed">${t('evening_next_member.body', {name: m.nextMemberName, name: m.nextMemberName})}</p>
          <p class="text-[11px] text-amber-100/60 italic mt-2">${t('evening_next_member.sangha_hint')}</p>
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost" onclick="skipNextMemberEvening()">${t('evening_next_member.later_button')}</button>
          <button class="btn btn-gold" onclick="switchToNextMemberForEvening('${m.nextMemberId}')">${t('evening_next_member.switch_button', {name: m.nextMemberName})}</button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'timer_prompt') {
    const h = state.habits.find(x => x.id === m.habitId);
    const habitName = h ? h.name : t('timer_prompt.habit_fallback');
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🧘</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${habitName}</div>
          <h2 class="text-lg font-bold gold-text mt-1">${t('timer_prompt.heading')}</h2>
          <p class="text-xs text-amber-100/65 italic serif mt-2 max-w-xs mx-auto leading-relaxed">${t('timer_prompt.flavor_line')}</p>
        </div>

        <!-- v12.6: clearer two-path split. Already sat → one tap to mark done.
             Starting now → pick a flavor (breath / metta / walking) and go. -->
        <div class="parchment rounded-xl p-4 mb-3 border-amber-700/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('timer_prompt.already_sat_label')}</div>
          <button onclick="timerPromptSkipTimer(false)" class="btn btn-ghost w-full text-sm">${t('timer_prompt.already_sat_button')}</button>
          <p class="text-[10px] text-amber-100/55 italic mt-2">${t('timer_prompt.already_sat_hint')}</p>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border-amber-700/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('timer_prompt.start_now_label')}</div>
          <div class="space-y-2">
            <button onclick="timerPromptUseTimer(false, 'breath')" class="btn btn-gold w-full text-sm">${t('timer_prompt.flavor_breath')}</button>
            <button onclick="timerPromptUseTimer(false, 'metta')" class="btn btn-gold w-full text-sm">${t('timer_prompt.flavor_metta')}</button>
            <button onclick="timerPromptUseTimer(false, 'walking')" class="btn btn-gold w-full text-sm">${t('timer_prompt.flavor_walking')}</button>
          </div>
          <p class="text-[10px] text-amber-100/55 italic mt-2">${t('timer_prompt.flavor_hint')}</p>
        </div>

        <div class="parchment rounded-lg p-3 mb-3">
          <p class="text-[11px] text-amber-100/60 italic mb-2">${t('timer_prompt.skip_prompt')}</p>
          <div class="flex gap-2 flex-wrap">
            <button onclick="timerPromptUseTimer(true, 'breath')" class="text-[11px] text-cyan-300 hover:text-cyan-200 underline">${t('timer_prompt.always_open_breath')}</button>
          </div>
          <p class="text-[10px] text-amber-100/40 italic mt-2">${t('timer_prompt.always_open_hint')}</p>
        </div>

        <div class="flex justify-end">
          <button onclick="timerPromptCancel()" class="btn btn-ghost text-xs">${t('element_feedback.cancel_button')}</button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'meditation_timer') {
    content = renderMeditationTimerModal(m);
  }
  else if (m.type === 'setback_recovery') {
    content = renderSetbackRecoveryModal(m);
  }
  else if (m.type === 'foundations') {
    const view_ = m.view || 'overview';
    if (view_ === 'overview') {
      content = `
        <div class="fade-in">
          <div class="text-center mb-4">
            <div class="text-5xl mb-2">☸️</div>
            <div class="text-xs uppercase tracking-wider text-amber-300/70">First Principles</div>
            <h2 class="text-xl font-bold gold-text mt-1">The Foundations</h2>
            <p class="text-xs text-amber-100/60 italic mt-1">SN 56.11 — Dhammacakkappavattana, the First Sermon</p>
          </div>
          <div class="parchment rounded-xl p-4 mb-4 border-amber-700/40">
            <p class="text-sm text-amber-100/90 leading-relaxed serif">All of the Buddha's teaching rests on Four Noble Truths. The fourth truth is the Eightfold Path — the prescription that follows the diagnosis of the first three. Everything in this app is inside the fourth truth. Begin here when you don't know where to begin.</p>
          </div>
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2 px-1">The Four Noble Truths</div>
          <div class="space-y-2 mb-5">
            ${FOUR_NOBLE_TRUTHS.map((t, i) => `
              <button onclick="openFoundationsTruth('${t.id}')" class="parchment rounded-lg p-3 w-full text-left hover:parchment-active transition">
                <div class="flex items-baseline gap-3">
                  <div class="text-lg font-bold gold-text">${i + 1}.</div>
                  <div class="flex-1">
                    <div class="font-bold text-amber-100 text-sm">${t.name}</div>
                    <div class="text-[10px] text-amber-300/70 italic">${t.pali}</div>
                    <div class="text-xs text-amber-100/70 mt-1">${t.short}</div>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2 px-1">The Eightfold Path <span class="text-amber-100/40 normal-case italic">— inside the fourth truth</span></div>
          <div class="space-y-2 mb-4">
            ${['wisdom', 'ethics', 'concentration'].map(group => {
              const branches = EIGHTFOLD_PATH.filter(b => b.grouping === group);
              const groupName = group === 'wisdom' ? 'Wisdom (paññā)' : group === 'ethics' ? 'Ethics (sīla)' : 'Concentration (samādhi)';
              return `
                <div class="text-[10px] uppercase tracking-wider text-amber-300/60 mt-3 mb-1 px-1">${groupName}</div>
                ${branches.map(b => `
                  <button onclick="openFoundationsBranch('${b.id}')" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition">
                    <div class="flex items-baseline gap-2">
                      <div class="text-xs text-amber-300/70">${b.number}.</div>
                      <div class="flex-1">
                        <div class="font-bold text-amber-100 text-xs">${b.name}</div>
                        <div class="text-[10px] text-amber-100/60 italic">${b.short}</div>
                      </div>
                    </div>
                  </button>
                `).join('')}
              `;
            }).join('')}
          </div>

          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2 px-1">How this game maps the path</div>
          <div class="parchment rounded-xl p-4 mb-2 border border-amber-700/40">
            <p class="text-[11px] text-amber-100/85 leading-relaxed serif">The game organises the practitioner's work into <b class="text-amber-200">three layers</b>, each canonically grounded. They overlap in reality — the commentarial tradition treats them as facets of a single path — but the game separates them so the player can see which work comes first.</p>
            <div class="mt-3 space-y-2">
              ${PATH_LAYERS.map((L, i) => `
                <div class="border-l-2 border-amber-700/40 pl-3">
                  <div class="text-[10px] uppercase tracking-wider text-amber-300/70">Layer ${L.id}</div>
                  <div class="text-sm font-bold text-amber-100">${L.title}</div>
                  <div class="text-[10px] text-amber-200/60 italic">${t('teaching_detail.layer.subtitle_suffix', {pali: L.pali, suttaRef: L.suttaRef})}</div>
                  <p class="text-[11px] text-amber-100/80 mt-1 leading-snug">${L.teaser}</p>
                </div>
              `).join('')}
            </div>
            <p class="text-[11px] text-amber-100/65 italic mt-3 leading-relaxed">Layer 1 is preliminary work: the hindrances must be reliably suppressed (not uprooted) before samādhi is workable. Layer 2 is the deeper defilement work the Buddha faced under the Bodhi tree. Layer 3 names the four noble persons and the ten fetters — and explicitly does not claim to certify any of them.</p>
          </div>

          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2 px-1">The Seven Awakening Factors <span class="text-amber-100/40 normal-case italic">— what is cultivated</span></div>
          <div class="parchment rounded-xl p-4 mb-4 border border-emerald-700/30">
            <p class="text-[11px] text-amber-100/85 leading-relaxed serif mb-3">The positive counterpart to the hindrance work. SN 46 lists these seven qualities that develop in sequence as practice matures — each one supports the next. The game tracks the measurable ones from what you are already logging. The emergent ones (rapture, tranquility, equanimity) are shown honestly as "arising in practice" rather than as scores, because a self-report slider cannot measure them well.</p>
            <div class="space-y-1">
              ${SEVEN_FACTORS.map((f, i) => `
                <div class="flex items-baseline gap-2 text-[11px]">
                  <div class="w-4 text-center text-emerald-300/70">${i + 1}</div>
                  <div class="w-4 text-center">${f.icon}</div>
                  <div class="flex-1"><b class="text-emerald-200">${f.pali}</b> <span class="text-amber-100/60">— ${f.english}</span></div>
                  <div class="text-[10px] text-emerald-300/50">${f.measurable ? 'measurable' : 'emergent'}</div>
                </div>
              `).join('')}
            </div>
            <p class="text-[11px] text-amber-100/60 italic mt-3 leading-relaxed">The factors arise in order: mindfulness → investigation → energy → rapture → tranquility → concentration → equanimity. SN 46.3 says each one is aroused by the previous one becoming well-established. You cannot skip ahead.</p>
          </div>

          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2 px-1">Ranks of the path</div>
          <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
            <p class="text-[11px] text-amber-100/85 leading-relaxed serif mb-3">The game uses a ten-rank canonical ladder. Ranks 0–5 are advanced based on real practice telemetry — what you actually sit, log, and name in the journal. Ranks 6–9 are shown as aspiration only. The transition from rank 5 to rank 6 is not a level-up; it is the edge of what a self-report tool can honestly measure.</p>
            <div class="space-y-1">
              ${PATH_RANKS.map(r => {
                const tierLabel = r.tier === 'pre-training' ? '⋯' : r.tier === 'training' ? '◆' : r.tier === 'approaching' ? '✦' : '◇';
                const cls = r.tier === 'advanced' ? 'text-purple-200/70 italic' : 'text-amber-100/80';
                return `
                  <div class="flex items-baseline gap-2 text-[11px]">
                    <div class="w-4 text-center text-amber-300/60">${r.id}</div>
                    <div class="w-3 text-center">${tierLabel}</div>
                    <div class="flex-1 ${cls}"><b>${r.pali}</b> <span class="text-amber-100/50">— ${r.english}</span></div>
                    <div class="text-[10px] text-amber-300/50">${r.suttaRef}</div>
                  </div>
                `;
              }).join('')}
            </div>
            <p class="text-[11px] text-amber-100/65 italic mt-3 leading-relaxed">◆ training ranks · ✦ approaching the path · ◇ ariya (preview only, never certified by the game). The end goal — Arahant — is Rank 9. Beginners are Rank 0 or 1. No one is expected to start at the top; the path is walked, not awarded.</p>
          </div>

          <div class="flex justify-end">
            <button class="btn btn-gold" onclick="closeModal()">Close</button>
          </div>
        </div>
      `;
    } else if (view_ === 'truth') {
      const truth = FOUR_NOBLE_TRUTHS.find(x => x.id === m.truthId);
      if (!truth) { closeModal(); return; }
      const paras = truth.body.split('\n\n').filter(p => p.trim());
      content = `
        <div class="fade-in">
          <div class="text-center mb-4">
            <div class="text-xs uppercase tracking-wider text-amber-300/70">Noble Truth</div>
            <h2 class="text-xl font-bold gold-text mt-1">${truth.name}</h2>
            <p class="text-xs text-amber-300/60 italic mt-1">${truth.pali}</p>
          </div>
          <div class="parchment rounded-xl p-5 mb-4 border-amber-700/40 max-h-[55vh] overflow-y-auto scrollbar">
            ${paras.map(p => `<p class="serif text-sm text-amber-100/90 leading-relaxed mb-3">${p}</p>`).join('')}
          </div>
          <div class="flex justify-between gap-2">
            <button class="btn btn-ghost" onclick="openFoundations()">← Foundations</button>
            <button class="btn btn-gold" onclick="closeModal()">Close</button>
          </div>
        </div>
      `;
    } else if (view_ === 'branch') {
      const branch = EIGHTFOLD_PATH.find(x => x.id === m.branchId);
      if (!branch) { closeModal(); return; }
      const paras = branch.body.split('\n\n').filter(p => p.trim());
      const links = FOUNDATIONS_CONTENT_MAP[branch.id] || {};
      let linkBlocks = '';
      if (links.suttas && links.suttas.length) {
        linkBlocks += `<div class="text-[10px] uppercase tracking-wider text-amber-300/60 mb-1">Suttas</div><div class="text-xs text-amber-100/80 mb-3">${links.suttas.join(' • ')}</div>`;
      }
      if (links.flows && links.flows.length) {
        linkBlocks += `<div class="text-[10px] uppercase tracking-wider text-amber-300/60 mb-1">Guided practice</div><div class="mb-3">${links.flows.map(f => {
          const flow = GUIDED_FLOWS[f];
          if (!flow) return '';
          return `<button onclick="closeModal(); setTimeout(() => openGuidedFlow('${f}', 0), 50);" class="text-xs text-cyan-300 hover:text-cyan-200 underline mr-3">${flow.icon} ${flow.title}</button>`;
        }).join('')}</div>`;
      }
      if (links.prescriptions && links.prescriptions.length) {
        linkBlocks += `<div class="text-[10px] uppercase tracking-wider text-amber-300/60 mb-1">Hindrance teachings</div><div class="mb-3">${links.prescriptions.map(p => {
          const rx = TECHNIQUE_PRESCRIPTIONS[p];
          if (!rx) return '';
          return `<button onclick="closeModal(); setTimeout(() => openTechniqueTeaching('${p}'), 50);" class="text-xs text-cyan-300 hover:text-cyan-200 underline mr-3">🪔 ${rx.title}</button>`;
        }).join('')}</div>`;
      }
      if (links.monthly && links.monthly.length) {
        linkBlocks += `<div class="text-[10px] uppercase tracking-wider text-amber-300/60 mb-1">Monthly contemplations</div><div class="text-xs text-amber-100/80 mb-3">${links.monthly.map(mn => {
          const mr = MONTHLY_REFLECTIONS.find(x => x.month === mn);
          return mr ? `Month ${mn}: ${mr.title}` : '';
        }).filter(Boolean).join(' • ')}</div>`;
      }
      content = `
        <div class="fade-in">
          <div class="text-center mb-4">
            <div class="text-xs uppercase tracking-wider text-amber-300/70">Eightfold Path • ${branch.number} of 8</div>
            <h2 class="text-xl font-bold gold-text mt-1">${branch.name}</h2>
            <p class="text-xs text-amber-300/60 italic mt-1">${branch.pali}</p>
          </div>
          <div class="parchment rounded-xl p-5 mb-4 border-amber-700/40 max-h-[45vh] overflow-y-auto scrollbar">
            ${paras.map(p => `<p class="serif text-sm text-amber-100/90 leading-relaxed mb-3">${p}</p>`).join('')}
          </div>
          ${linkBlocks ? `<div class="parchment rounded-xl p-4 mb-4">
            <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2">In this app</div>
            ${linkBlocks}
          </div>` : ''}
          <div class="flex justify-between gap-2">
            <button class="btn btn-ghost" onclick="openFoundations()">← Foundations</button>
            <button class="btn btn-gold" onclick="closeModal()">Close</button>
          </div>
        </div>
      `;
    }
  }
  else if (m.type === 'weekly_summary') {
    const memberId = view.currentMember;
    const member = state.members.find(x => x.id === memberId);
    const completion = keyHabitCompletionRate(memberId, 7);
    const completionPrev = keyHabitCompletionRate(memberId, 14);
    // 7-day delta: completion(7d) vs the 7d before that
    let completionPrior = null;
    if (completionPrev != null && completion != null) {
      // Fraction over 14d = (this week + last week) / 2 → solve for last week
      const lastWeek = (completionPrev * 2) - completion;
      completionPrior = Math.max(0, Math.min(1, lastWeek));
    }

    // Build sparklines for every factor that has at least 3 days of data
    const factorIds = ['energy','sensual','illwill','sloth','restless','doubt','purpose','sila','mettaWarmth','concentration'];
    const factorRows = factorIds.map(fid => {
      const series = factorSeries(memberId, fid, 14);
      if (series.length < 3) return null;
      const trend = analyzeFactorTrend(memberId, fid, 14);
      const fk = FACTOR_KEYS[fid] || { label: fid };
      const verdict = trendVerdict(fid, trend.direction);
      const color = trendColor(fid, trend.direction);
      return `
        <div class="parchment rounded-lg p-3">
          <div class="flex items-baseline justify-between mb-1">
            <div class="text-xs font-bold text-amber-100">${fk.label}</div>
            <div class="text-[10px]" style="color:${color}">${verdict}</div>
          </div>
          ${renderSparkline(series, { width: 240, height: 32, min: 0, max: 10, color, fillColor: color + '22' })}
          <div class="flex justify-between text-[9px] text-amber-100/40 mt-0.5">
            <span>${series[0].date.slice(5)}</span>
            <span>${series[series.length-1].date.slice(5)}</span>
          </div>
        </div>
      `;
    }).filter(Boolean);

    // Honest framing for the week
    let framing = '';
    if (completion == null) {
      framing = `<p class="text-sm text-amber-100/80 leading-relaxed">${t('weekly_summary.framing.no_habits')}</p>`;
    } else if (completion < 0.5) {
      framing = `<p class="text-sm text-amber-100/80 leading-relaxed">${t('weekly_summary.framing.hard', {pct: Math.round(completion*100)})}</p>`;
    } else if (completion < 0.75) {
      framing = `<p class="text-sm text-amber-100/80 leading-relaxed">${t('weekly_summary.framing.honest', {pct: Math.round(completion*100)})}</p>`;
    } else {
      framing = `<p class="text-sm text-amber-100/80 leading-relaxed">${t('weekly_summary.framing.strong', {pct: Math.round(completion*100)})}</p>`;
    }

    // Reflection counts this week (rough — counts entries since 7 days ago)
    let reflectionsThisWeek = 0;
    for (let i = 0; i < 7; i++) {
      if (state.reflectionLog?.[daysAgo(i)]?.[view.currentMember]?.daily) reflectionsThisWeek++;
    }

    // Comparison to previous week
    let comparisonStr = '';
    if (completionPrior != null && completion != null) {
      const delta = completion - completionPrior;
      if (Math.abs(delta) >= 0.05) {
        const dir = delta > 0 ? 'up' : 'down';
        const sign = delta > 0 ? '+' : '';
        comparisonStr = `<div class="text-xs text-amber-300/70 mt-1">${t('weekly_summary.delta_vs_previous', {sign: sign, n: Math.round(delta*100)})}</div>`;
      } else {
        comparisonStr = `<div class="text-xs text-amber-300/70 mt-1">${t('weekly_summary.delta_same')}</div>`;
      }
    }

    const teaching = getDailyAjahnChahTeaching();

    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🪞</div>
          <div class="text-xs uppercase tracking-wider text-amber-300/70">${t('weekly_summary.eyebrow')}</div>
          <h2 class="text-xl font-bold gold-text mt-1">${member ? member.name : 'You'}</h2>
        </div>

        <div class="parchment rounded-xl p-4 mb-4">
          <div class="flex items-baseline justify-between">
            <div class="text-xs uppercase tracking-wider text-amber-300/80">${t('weekly_summary.completion_label')}</div>
            <div class="text-2xl font-bold gold-text">${completion != null ? Math.round(completion*100) + '%' : '—'}</div>
          </div>
          ${comparisonStr}
        </div>

        <div class="parchment rounded-xl p-4 mb-4">
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2">${t('weekly_summary.honest_word_label')}</div>
          ${framing}
        </div>

        ${factorRows.length > 0 ? `
          <div class="mb-4">
            <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2 px-1">${t('weekly_summary.trends_label')}</div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              ${factorRows.join('')}
            </div>
          </div>
        ` : `
          <div class="parchment rounded-xl p-4 mb-4 text-center">
            <p class="text-xs text-amber-100/60 italic">${t('weekly_summary.trends_empty')}</p>
          </div>
        `}

        <div class="parchment rounded-xl p-4 mb-4 border-amber-700/40">
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2">${t('weekly_summary.reflection_label')}</div>
          <div class="text-xs text-amber-100/80">${t('weekly_summary.reflection_count', {n: reflectionsThisWeek})}</div>
        </div>

        <div class="parchment rounded-xl p-4 mb-4 border-amber-700/40">
          <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2">${t('weekly_summary.teaching_label')}</div>
          <p class="serif text-sm text-amber-100/90 leading-relaxed italic">"${teaching.text}"</p>
          <p class="text-[10px] text-amber-300/60 mt-2 text-right">— ${teaching.source || t('weekly_summary.teacher_unknown')}</p>
        </div>

        <div class="flex justify-end">
          <button class="btn btn-gold" onclick="closeWeeklySummary()">Close</button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'teachings_library') {
    const entries = Object.entries(TECHNIQUE_PRESCRIPTIONS);
    content = `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🪔</div>
          <h2 class="text-2xl font-bold gold-text">Hindrance Library</h2>
          <p class="text-xs text-amber-100/70 italic mt-1">All seven teachings, browsable any time. Tap any card for the full instruction.</p>
        </div>
        <div class="space-y-2 mb-4">
          ${entries.map(([key, rx]) => `
            <button onclick="closeModal(); setTimeout(() => openTechniqueTeaching('${key}'), 50);" class="parchment rounded-lg p-3 w-full text-left hover:parchment-active transition">
              <div class="text-xs uppercase tracking-wider text-amber-300/80">${rx.suttaRef}</div>
              <div class="font-bold text-amber-100 mt-0.5 text-sm">${rx.title}</div>
            </button>
          `).join('')}
        </div>
        <div class="flex justify-end">
          <button class="btn btn-gold" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'member_diagnostic') {
    const member = state.members.find(x => x.id === m.memberId);
    const ob = getOnboardingDiagnostic(m.memberId);
    if (!member || !ob) {
      content = `
        <div class="fade-in text-center">
          <div class="text-5xl mb-3">🪔</div>
          <h2 class="text-xl font-bold gold-text mb-2">No diagnostic on file</h2>
          <p class="text-sm text-amber-100/70 mb-4">${member?.name || 'This traveler'} hasn't completed the onboarding check-in yet.</p>
          <button class="btn btn-gold" onclick="closeModal()">Close</button>
        </div>
      `;
    } else {
      const answers = ob.answers;
      const rollingRows = ['energy','sensual','illwill','sloth','restless','doubt','purpose','concentration','sila','mettaWarmth']
        .map(key => ({ key, rolling: rollingFactorAverage(m.memberId, key, 7), baseline: answers[key] }))
        .filter(r => r.baseline != null || r.rolling != null);
      content = `
        <div class="fade-in">
          <div class="text-center mb-4">
            <div class="text-5xl mb-2">${CHARACTERS[member.character]?.icon || '🧘'}</div>
            <h2 class="text-xl font-bold gold-text">${member.name}'s baseline</h2>
            <p class="text-xs text-amber-100/60 italic">Recorded ${new Date(ob.completedAt).toLocaleDateString()}</p>
          </div>
          <div class="parchment rounded-xl p-4 mb-4">
            <div class="text-xs uppercase tracking-wider text-amber-300/80 mb-2">Onboarding answers</div>
            ${answers.dominant_hindrance ? `<div class="text-xs text-amber-100/80 mb-2">Dominant pull at start: <span class="text-amber-200 font-bold">${answers.dominant_hindrance}</span></div>` : ''}
            ${answers.experience ? `<div class="text-xs text-amber-100/80 mb-3">Experience level: <span class="text-amber-200 font-bold">${answers.experience}</span></div>` : ''}
            <div class="space-y-1">
              ${rollingRows.map(r => {
                const fk = FACTOR_KEYS[r.key];
                if (!fk) return '';
                const base = r.baseline != null ? r.baseline : '—';
                const roll = r.rolling != null ? r.rolling.toFixed(1) : '—';
                return `
                  <div class="flex items-center justify-between text-xs border-b border-amber-900/20 py-1">
                    <span class="text-amber-100/80">${fk.label}</span>
                    <span class="text-amber-300/70">baseline <b class="text-amber-200">${base}</b> • 7-day <b class="text-amber-200">${roll}</b></span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button class="btn btn-ghost" onclick="closeModal()">Close</button>
          </div>
        </div>
      `;
    }
  }
  else if (m.type === 'rank_checkpoint') {
    const rid = m.rankId;
    const mid = m.memberId || view.currentMember;
    const ri = getRankInfo(rid);
    const currentRank = mid ? computeMemberRank(mid) : 0;
    const isWalked = rid < currentRank;
    const isCurrent = rid === currentRank;
    const isAhead = rid > currentRank;
    const isAriya = rid >= 6;

    // Requirements for reaching this rank
    const reqs = rid === 0 ? [] : getRankRequirements(mid, rid);
    const metCount = reqs.filter(r => r.pass).length;
    const totalCount = reqs.length;

    // Status label and color
    const statusLabel = isWalked ? t('rank_checkpoint.status_walked')
      : isCurrent ? t('rank_checkpoint.status_current')
      : isAhead ? t('rank_checkpoint.status_ahead')
      : '';
    const statusColor = isWalked ? 'text-emerald-300'
      : isCurrent ? 'text-amber-300'
      : isAriya ? 'text-purple-300'
      : 'text-amber-100/60';
    const borderColor = isWalked ? 'border-emerald-700/50'
      : isCurrent ? 'border-amber-500/70'
      : isAriya ? 'border-purple-700/40'
      : 'border-amber-900/40';
    const icon = isAriya ? '☸️' : isCurrent ? '◆' : isWalked ? '✓' : '○';

    content = `
      <div class="fade-in">
        <div class="text-center mb-3">
          <div class="text-4xl mb-1">${icon}</div>
          <div class="text-[10px] uppercase tracking-wider ${statusColor} font-bold">${statusLabel}</div>
          <h2 class="text-xl font-bold gold-text mt-1">${ri.pali}</h2>
          <div class="text-[11px] text-amber-200/70 italic">${t('rank_checkpoint.meta_line', {english: ri.english, id: rid, ref: ri.suttaRef})}</div>
        </div>

        <div class="parchment rounded-xl p-4 mb-3 border-2 ${borderColor}">
          <p class="text-sm text-amber-100/90 leading-relaxed serif">${ri.description}</p>
          ${ri.note ? `
            <div class="mt-3 p-2 rounded border border-amber-700/30 bg-amber-950/25">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('teaching_detail.rank.important_label')}</div>
              <p class="text-[11px] text-amber-200/80 italic leading-relaxed">${ri.note}</p>
            </div>
          ` : ''}
        </div>

        ${reqs.length > 0 ? `
          <div class="parchment rounded-xl p-4 mb-3 border ${borderColor}">
            <div class="flex items-baseline justify-between mb-2">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/80">
                ${isWalked ? t('rank_checkpoint.reqs_walked') : isCurrent ? t('rank_checkpoint.reqs_current') : t('rank_checkpoint.reqs_ahead')}
              </div>
              <div class="text-[10px] text-amber-100/60">${t('rank_checkpoint.reqs_progress', {met: metCount, total: totalCount})}</div>
            </div>
            <div class="space-y-2">
              ${reqs.map(row => `
                <div class="flex items-start gap-2 text-[12px]">
                  <div class="text-base leading-none mt-0.5">${row.pass ? '<span class="text-green-400">✓</span>' : '<span class="text-amber-500/60">○</span>'}</div>
                  <div class="flex-1 text-amber-100/85">${row.label}</div>
                  <div class="text-[10px] text-amber-300/70 shrink-0">${row.detail}</div>
                </div>
              `).join('')}
            </div>
            ${isAhead && metCount < totalCount ? `
              <p class="text-[11px] text-amber-100/60 italic mt-3 leading-relaxed">${t('rank_checkpoint.progress_note')}</p>
            ` : ''}
          </div>
        ` : `
          <div class="parchment rounded-xl p-3 mb-3 border ${borderColor}">
            <p class="text-[11px] text-amber-100/70 italic leading-relaxed">${t('rank_checkpoint.rank_0_note')}</p>
          </div>
        `}

        <div class="flex items-center justify-between gap-2">
          <button class="text-[11px] text-amber-300/80 hover:text-amber-200 underline" onclick="openTeachingDetail('rank',${rid})">${t('rank_checkpoint.read_teaching_link')}</button>
          <button class="btn btn-gold" onclick="closeModal()">Close</button>
        </div>
      </div>
    `;
  }
  else if (m.type === 'oneline_journal') {
    content = renderOnelineJournalModal(m);
  }
  else if (m.type === 'evening_close') {
    content = renderEveningCloseModal(m);
  }
  else if (m.type === 'struggle_suggestion') {
    content = renderStruggleSuggestionModal(m);
  }
  else if (m.type === 'sutta_subcategory') {
    content = renderSuttaSubcategoryModal(m);
  }
  else if (m.type === 'sutta_view') {
    content = renderSuttaViewModal(m);
  }
  else if (m.type === 'sutta_study') {
    content = renderSuttaStudyModal(m);
  }
  else if (m.type === 'pause_quest') {
    content = renderPauseQuestModal(m);
  }
  else if (m.type === 'resume_quest') {
    content = renderResumeQuestModal(m);
  }
  else if (m.type === 'rules_card') {
    content = renderRulesCardModal(m);
  }
  else if (m.type === 'tisikkha_explainer') {
    content = renderTisikkhaExplainerModal(m);
  }
  else if (m.type === 'shadow_explainer') {
    content = renderShadowExplainerModal(m);
  }
  else if (m.type === 'teaching_detail') {
    content = renderTeachingDetailModal(m);
  }
  else if (m.type === 'liberation_offer') {
    content = renderLiberationOfferModal(m);
  }
  else if (m.type === 'liberation_complete') {
    const member = state.members.find(x => x.id === m.memberId);
    content = `
      <div class="fade-in text-center">
        <div class="text-6xl mb-2">🪷</div>
        <div class="text-[10px] uppercase tracking-wider text-purple-300/80">${t('liberation_complete.eyebrow')}</div>
        <h2 class="text-2xl font-bold gold-text mt-1">${t('liberation_complete.heading')}</h2>
        <p class="text-xs text-purple-200/70 italic mb-4">${member?.name || t('liberation.practitioner_fallback')}</p>

        <div class="parchment rounded-xl p-4 mb-4 text-left border border-purple-700/40">
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-3">${t('liberation_complete.body_para1')}</p>
          <p class="text-sm text-amber-100/90 leading-relaxed serif mb-3">${t('liberation_complete.body_para2')}</p>
          <p class="text-[11px] text-amber-300/80 italic leading-relaxed mt-3">${t('liberation_complete.body_para3')}</p>
        </div>

        <div class="flex gap-2 justify-center">
          <button class="text-[11px] text-amber-300/80 hover:text-amber-200 underline" onclick="downloadFinalTeachingSummary('${m.memberId}')">${t('liberation_complete.redownload_button')}</button>
        </div>
        <div class="mt-3">
          <button class="btn btn-gold" onclick="closeModal()">${t('liberation_complete.go_sit_button')}</button>
        </div>

        <p class="text-[10px] text-amber-100/40 italic mt-4 leading-relaxed">${t('liberation_complete.pali_exhortation')}<br>${t('liberation_complete.pali_translation')}</p>
      </div>
    `;
  }
  else if (m.type === 'rank_intro') {
    content = renderRankIntroModal(m);
  }
  else if (m.type === 'rank_announcement') {
    content = renderRankAnnouncementModal(m);
  }
  else if (m.type === 'path_viewer') {
    content = renderPathViewerModal(m);
  }
  else if (m.type === 'auth') {
    content = renderAuthModal(m);
  }
  else if (m.type === 'beta_guide') {
    content = renderBetaGuideModal(m);
  }

  // Inject wrapped content into #modal-root. Scroll position is preserved
  // across re-renders so interacting with a form control inside a modal
  // doesn't snap the scroll back to the top. `view._resetModalScroll` opts
  // out of preservation when stepping between multi-step flows (e.g. setup).
  let prevScroll = 0;
  const prevModalEl = root.querySelector('.modal');
  if (prevModalEl && !view._resetModalScroll) prevScroll = prevModalEl.scrollTop;
  const shouldResetScroll = !!view._resetModalScroll;
  view._resetModalScroll = false;
  root.innerHTML = `<div class="modal-bg" onclick="if(event.target===this&&view.modal&&view.modal.type!=='setup'&&view.modal.type!=='setup_loading'&&view.modal.type!=='defeat'&&view.modal.type!=='victory')closeModal()"><div class="modal parchment rounded-2xl p-6 scrollbar">${content}</div></div>`;
  const newModalEl = root.querySelector('.modal');
  if (newModalEl) {
    if (shouldResetScroll) {
      requestAnimationFrame(() => { newModalEl.scrollTop = 0; });
    } else if (prevScroll > 0) {
      requestAnimationFrame(() => { newModalEl.scrollTop = prevScroll; });
    }
  }
}

// ============================================================================
// INIT moved to src/bootstrap.js. main.js now defines only render() and
// renderModal() — the dispatchers. Bootstrap is responsible for awaiting
// data, initializing state, and calling render() for the first frame.
// ============================================================================
