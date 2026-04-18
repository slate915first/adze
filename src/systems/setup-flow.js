// ============================================================================
// src/systems/setup-flow.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 42 function(s): startSetup, getShuffledOptionsFor, getFirstSuttaName, setDiagnosticA, toggleDiagnosticHope, setDiagnosticB, setDiagnosticC, setupToggleMulti, computeAndShowRecommendation, pauseSetupForCare, adjustRecommendation, updateRecommendationDailyTotal, setRecommendationMinutes, toggleRecommendationMidday, acceptRecommendation, takeTheVow, setupNext, setupBack, setSetupMode, setSetupCategory, setSetupQuest, setSetupHabitMode, setSetupCustomMinutes, toggleSetupSmallHabit, setSetupDuration, addSetupMember, onNameInput, addSetupMemberFromBrowser, browseCharPrev, browseCharNext, openCharacterDetail, selectCharacterFromDetail, removeSetupMember, finishSetup, openNextOnboardingDiagnostic, onboardingDiagnosticAnswer, onboardingDiagnosticSliderTouch, onboardingDiagnosticNext, onboardingDiagnosticBack, closeFirstGuidance, openTutorialFromFirstGuidance, completeSetupTransition
// ============================================================================

function startSetup() {
  if (!state) state = newState();
  view.setupStep = 0;
  view.setupData = {
    mode: null,
    category: null,
    quest: null,
    difficultyPath: null,
    durationMode: 'steady',
    customMinutes: 15,
    mixedSchedule: { mon:5, tue:5, wed:5, thu:5, fri:5, sat:15, sun:30 },
    members: [],
    duration: 90,
    seenPrologue: false,
    // v11 — diagnostic data (populated by Phase A/B/C before the vow)
    diagnostic: {
      energy: 5,
      experience: null,
      hopes: [],
      dominantHindrance: null,
      // beginner branch
      stoppedBefore: [],           // v15.0: array of chip keys
      stoppedBeforeOther: '',      // v15.0: free-text "other", not interpreted
      realisticMinutes: 10,
      posture: null,
      timeOfDay: null,
      physicalConcerns: [],        // v15.0: array of chip keys
      physicalConcernsOther: '',   // v15.0
      concerns: [],                // v15.0: array of chip keys
      concernsOther: '',           // v15.0
      // experienced branch
      tradition: null,
      teachers: '',
      currentSitLength: 20,
      currentEdge: null,
      wantFromTool: '',
      fourTruths: [],        // multi-select: expected ['dukkha','origin','cessation','path']
      eightfold: [],         // multi-select: expected 8 factors
      stuckness: null,       // single-select
      unclear: '',           // textarea
      // phase C — hindrance sliders
      sensual: 5, illwill: 5, restless: 5, doubt: 5, purpose: 7,
      // v13.6 — wellbeing acknowledgment (null | 'ok' | 'struggling' | 'crisis')
      wellbeingAck: null
    },
    phaseCStep: 0,           // v15.0 — one-question-at-a-time sub-step cursor
    recommendation: null,   // computed at end of diagnostic
    acceptedRec: false,      // user accepted recommendation (or adjusted)
    // v13.6 — stable per-session shuffle order for knowledge-check options.
    // Dirk feedback: currently the correct answers are always first in the
    // list, which is a tell. Shuffle once at setup start and cache so the
    // list doesn't re-order every time the user taps an option.
    shuffleOrders: {}
  };
  view.modal = { type: 'setup' };
  renderModal();
}

function getShuffledOptionsFor(questionId, options) {
  if (!view.setupData) return options;
  if (!view.setupData.shuffleOrders) view.setupData.shuffleOrders = {};
  let order = view.setupData.shuffleOrders[questionId];
  if (!order || order.length !== options.length) {
    order = options.map((_, i) => i);
    // Fisher-Yates
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    view.setupData.shuffleOrders[questionId] = order;
  }
  return order.map(i => options[i]);
}

function getFirstSuttaName(suttaId) {
  const s = (typeof SUTTA_LIBRARY !== 'undefined') ? SUTTA_LIBRARY.find(x => x.id === suttaId) : null;
  if (s) return `${s.ref} · ${s.name}`;
  return suttaId;
}

function setDiagnosticA(key, val) {
  if (key === 'energy') {
    view.setupData.diagnostic.energy = parseInt(val, 10);
    const el = document.getElementById('energy-val');
    if (el) el.textContent = val + t('setup.assessment.value_of_ten');
    return;
  }
  view.setupData.diagnostic[key] = val;
  // v15.0 — wellbeingAck toggles layout (crisis vs. non-crisis shows entirely
  // different content), so we still re-render for it. Experience and
  // dominantHindrance are pure radio selections — patch the buttons in place
  // to avoid the full-modal flicker the user reported.
  if (key === 'wellbeingAck') {
    renderModal();
    return;
  }
  if (key === 'experience' || key === 'dominantHindrance') {
    patchRadioButtonsInPlace('setDiagnosticA', key, val);
    refreshPhaseAContinueState();
    return;
  }
  renderModal();
}

// v15.0 — Re-evaluate the Phase A Continue button's enabled state. After
// the in-place radio patch, the button needs to drop opacity-50 +
// pointer-events-none once all three required fields are set. Without this
// the button stays disabled forever (Li May reported it from mobile).
function refreshPhaseAContinueState() {
  const btn = document.getElementById('phaseA-continue');
  if (!btn) return;
  const diag = view.setupData && view.setupData.diagnostic;
  if (!diag) return;
  const ready = !!diag.wellbeingAck && !!diag.experience && !!diag.dominantHindrance;
  btn.classList.toggle('opacity-50', !ready);
  btn.classList.toggle('pointer-events-none', !ready);
}

function toggleDiagnosticHope(key) {
  const h = view.setupData.diagnostic.hopes || [];
  const idx = h.indexOf(key);
  if (idx >= 0) h.splice(idx, 1);
  else if (h.length < 2) h.push(key);
  view.setupData.diagnostic.hopes = h;
  // v15.0 — in-place patch instead of full re-render. Multi-select with a
  // cap of 2; non-selected buttons dim when the cap is reached.
  const buttons = document.querySelectorAll('button[onclick^="toggleDiagnosticHope("]');
  const atCap = h.length >= 2;
  buttons.forEach(btn => {
    const m = btn.getAttribute('onclick').match(/toggleDiagnosticHope\('([^']+)'\)/);
    if (!m) return;
    const itemKey = m[1];
    const selected = h.includes(itemKey);
    btn.className = `parchment rounded-lg p-2 text-left ${selected ? 'parchment-active' : 'hover:parchment-active'} ${!selected && atCap ? 'opacity-40' : ''}`;
    // Toggle the ✓ on the label. Label is nested; find the bold element.
    const labelEl = btn.querySelector('.text-xs.font-bold');
    if (labelEl) {
      const base = labelEl.textContent.replace(/\s*✓$/, '');
      labelEl.textContent = selected ? base + ' ✓' : base;
    }
  });
}

// v15.0 — shared helper for radio-style button groups. Finds all buttons
// whose onclick is "<handlerName>('<key>', '<whatever>')" and updates their
// classes + ✓ marker according to the newly-selected value.
function patchRadioButtonsInPlace(handlerName, key, newValue) {
  const prefix = handlerName + "('" + key + "', '";
  const buttons = document.querySelectorAll(`button[onclick^="${prefix}"]`);
  buttons.forEach(btn => {
    const onclick = btn.getAttribute('onclick');
    const re = new RegExp(handlerName + "\\('" + key + "', '([^']+)'\\)");
    const m = onclick.match(re);
    if (!m) return;
    const buttonValue = m[1];
    const selected = buttonValue === newValue;
    // Preserve any width/layout classes already applied — only toggle the
    // state classes. The existing base classes vary by caller; the common
    // selected-state markers are 'parchment-active' and 'lotus-glow'.
    btn.classList.toggle('parchment-active', selected);
    btn.classList.toggle('lotus-glow', selected);
    if (!selected) btn.classList.add('hover:parchment-active');
    else btn.classList.remove('hover:parchment-active');
    // Toggle the ✓ in the label.
    const labelEl = btn.querySelector('.text-xs.font-bold');
    if (labelEl) {
      const base = labelEl.textContent.replace(/\s*✓$/, '');
      labelEl.textContent = selected ? base + ' ✓' : base;
    }
  });
}

function setDiagnosticB(key, val) {
  const isNumeric = key === 'realisticMinutes' || key === 'currentSitLength';
  view.setupData.diagnostic[key] = isNumeric ? parseInt(val, 10) : val;
  // Sliders update a companion label directly; no re-render.
  if (isNumeric) {
    const el = document.getElementById('diagB-val-' + key);
    if (el) el.textContent = t('common.minutes', {n: val});
    return;
  }
  // If this is a text field (oninput from textarea/input type=text),
  // NEVER re-render — would kill focus. The state is already updated above.
  // Detect: strings that are multi-word, long, or contain spaces are
  // almost certainly text field content, not a select-key click.
  // v12.5 stricter rule: ONLY re-render when the caller is a click handler
  // (determined by the DOM event type not being 'input'). Since we can't
  // introspect that here, we fall back to: only re-render if the value is
  // a short token that looks like a select-id (no spaces, < 30 chars, and
  // key is one of the known multi-choice diagnostic fields).
  const selectKeys = ['experience', 'posture', 'timeOfDay', 'nervous', 'tradition', 'stuckness'];
  if (selectKeys.includes(key)) {
    renderModal();
  }
  // Otherwise (textareas like teacherInfluence, whatUnclear) — no re-render.
}

function setDiagnosticC(key, val) {
  view.setupData.diagnostic[key] = parseInt(val, 10);
  // Update the companion label directly — no full re-render. This preserves
  // slider interaction (no midway focus loss on touch devices).
  const el = document.getElementById('diagC-val-' + key);
  if (el) el.textContent = val;
}

function setupToggleMulti(key, optionId) {
  const arr = view.setupData.diagnostic[key] || [];
  const idx = arr.indexOf(optionId);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(optionId);
  view.setupData.diagnostic[key] = arr;
  renderModal();  // visual highlight of selection — OK, no text field in focus
}

function computeAndShowRecommendation() {
  // Interpret chip selections (Phase 2 optional questions) into diagnostic
  // factor bumps + practical flags. See docs/CHIP-INTERPRETATION.md for the
  // mapping rationale. Pure, local, deterministic — no network, no LLM.
  if (typeof interpretChipSelections === 'function') {
    view.setupData.chipInterpretation = interpretChipSelections(view.setupData.diagnostic);
  }
  view.setupData.recommendation = computeRecommendation(view.setupData.diagnostic);
  view.setupStep = 6;
  view._resetModalScroll = true;
  renderModal();
}

function pauseSetupForCare() {
  // Reset the setup view entirely; don't accidentally persist an in-progress
  // state with a crisis flag that would follow the user back.
  view.setupStep = 0;
  view.setupData = {
    mode: null, category: null, quest: null,
    members: [], pendingName: '', pendingChar: null,
    habitMode: null, selectedSmallHabits: [], duration: null,
    customMorning: 15, customEvening: 15, customMidday: 0,
    diagnostic: { energy: 5, experience: null, hopes: [], dominantHindrance: null },
    recommendation: null, acceptedRec: false
  };
  view.modal = null;
  renderModal();
  render();
  // A gentle overlay message so the user sees the pause was heard.
  const root = document.getElementById('modal-root');
  if (root) {
    root.innerHTML = `
      <div class="modal-bg" onclick="if(event.target===this)closeModal()">
        <div class="modal parchment rounded-2xl p-6 scrollbar">
          <div class="text-center">
            <div class="text-5xl mb-3">🌱</div>
            <h2 class="text-xl font-bold gold-text mb-2">${t('setup.care_pause.heading')}</h2>
            <p class="text-sm text-amber-100/85 serif leading-relaxed mb-4">${t('setup.care_pause.body')}</p>
            <p class="text-xs text-amber-100/60 italic mb-4">${t('setup.care_pause.tail')}</p>
            <button class="btn btn-gold" onclick="closeModal()">${t('setup.care_pause.close_button')}</button>
          </div>
        </div>
      </div>
    `;
  }
}

function adjustRecommendation(key, val) {
  const n = parseInt(val, 10);
  if (!isFinite(n) || n < 0) return;
  if (view.setupData.recommendation) {
    view.setupData.recommendation[key] = n;
  }
  // v12.5: update companion label directly; never re-render on number input
  const el = document.getElementById('rec-adjust-val-' + key);
  if (el) el.textContent = n + ' min';
  // v13.4 — also keep the daily-total readout fresh in-place
  updateRecommendationDailyTotal();
}

function updateRecommendationDailyTotal() {
  const r = view.setupData?.recommendation;
  if (!r) return;
  const total = (r.morningMin || 0) + (r.middayMin || 0) + (r.eveningMin || 0);
  const el = document.getElementById('rec-total-daily');
  if (el) el.textContent = total;
}

function setRecommendationMinutes(key, mins) {
  if (!view.setupData.recommendation) return;
  view.setupData.recommendation[key] = mins;
  renderModal();
}

function toggleRecommendationMidday(enabled) {
  if (!view.setupData.recommendation) return;
  view.setupData.recommendation.middayMin = enabled ? (view.setupData.recommendation.middayMin || 15) : 0;
  renderModal();
}

function acceptRecommendation() {
  // Map the recommendation onto the quest configuration
  const rec = view.setupData.recommendation;
  if (!rec) return;
  view.setupData.category = 'mind';
  view.setupData.quest = rec.level;
  view.setupData.customMorning = rec.morningMin;
  view.setupData.customEvening = rec.eveningMin;
  // v12.7: midday sit carried through if > 0
  view.setupData.customMidday = rec.middayMin || 0;
  // v11: use 'custom' habitMode so the recommendation minutes (not the
  // template defaults) drive finishSetup. The recommendation IS the
  // configuration — that's the whole point.
  // v13.6 — Dirk feedback: the Vow copy promises a gentle bump after a
  // 7-day perfect streak, but checkProgressiveBump() is gated on
  // habitMode === 'progressive'. Story-path users were never getting
  // bump offers despite the promise. Flip to 'progressive' so the
  // compassionate-downgrade and gentle-increase system both fire.
  // The recommendation's minute values still drive initial setup because
  // finishSetup reads customMorning/customEvening/customMidday directly
  // when habitMode is anything non-constant. The progressive mode just
  // opens the door for future adjustments.
  view.setupData.habitMode = 'progressive';
  // Duration is driven by the quest template — use its default
  const cat = QUEST_CATEGORIES[view.setupData.category];
  const quest = cat?.quests[view.setupData.quest];
  view.setupData.duration = quest?.duration || 90;
  view.setupData.selectedSmallHabits = [];
  view.setupData.acceptedRec = true;
  view.setupStep = 7;
  view._resetModalScroll = true;
  renderModal();
}

function takeTheVow() {
  // Disable button immediately so it can't be clicked twice
  const btn = document.getElementById('vow-btn');
  if (btn) {
    if (btn.dataset.locked === '1') return;
    btn.dataset.locked = '1';
    btn.style.opacity = '0.5';
    btn.style.pointerEvents = 'none';
    btn.textContent = 'Preparing the path...';
  }
  finishSetup();
}

function setupNext() {
  // v11 linear flow:
  // story:  0 → 1 → 2 (members) → 3 (diagA) → 4 (diagB) → 5 (diagC) → 6 (rec) → 7 (vow)
  // custom: 0 → 1 → 2 (members) → 7 (vow)  — skips all diagnostic + recommendation
  view.setupStep++;
  if (view.setupData.mode === 'custom' && view.setupStep === 3) {
    // custom mode jumps from members straight to the vow
    view.setupStep = 7;
  }
  // v13.6 — Dirk feedback: landing mid-page when moving between setup steps
  // was disorienting. Flag a scroll-to-top; renderModal honors this once then
  // clears it so intra-step selections still preserve scroll.
  view._resetModalScroll = true;
  renderModal();
}

function setupBack() {
  view.setupStep = Math.max(0, view.setupStep - 1);
  // Custom mode: jumping back from vow (7) lands on members (2), not on diagnostic C (5)
  if (view.setupData.mode === 'custom' && view.setupStep >= 3 && view.setupStep <= 6) {
    view.setupStep = 2;
  }
  view._resetModalScroll = true;
  renderModal();
}

function setSetupMode(mode) {
  view.setupData.mode = mode;
  setupNext();
}

function setSetupCategory(cat) {
  view.setupData.category = cat;
  setupNext();
}

function setSetupQuest(q) {
  view.setupData.quest = q;
  const quest = QUEST_CATEGORIES[view.setupData.category].quests[q];
  view.setupData.duration = quest.duration;
  view.setupData.customMorning = quest.morningMinutes;
  view.setupData.customEvening = quest.eveningMinutes;
  // Default habit mode for all levels is constant
  view.setupData.habitMode = 'constant';
  setupNext();
}

function setSetupHabitMode(mode) {
  view.setupData.habitMode = mode;
  // Update classes + selected-labels in place instead of re-rendering. A full
  // re-render steals focus from the custom sliders and makes Safari re-offer
  // autofill on every click.
  const container = document.querySelector('#modal-root');
  if (!container) { renderModal(); return; }
  const buttons = container.querySelectorAll('[onclick^="setSetupHabitMode("]');
  buttons.forEach(btn => {
    const m = (btn.getAttribute('onclick').match(/setSetupHabitMode\('([^']+)'\)/) || [])[1];
    if (!m) return;
    if (m === 'constant' || m === 'progressive') {
      btn.classList.toggle('parchment-active', mode === m);
    } else if (m === 'custom') {
      btn.classList.toggle('btn-gold', mode === 'custom');
      btn.classList.toggle('btn-ghost', mode !== 'custom');
      btn.textContent = mode === 'custom'
        ? t('setup.habit_mode.custom.selected_label')
        : t('setup.habit_mode.custom.use_button');
    }
  });
  // Enable/disable the Continue button at the bottom.
  const cont = container.querySelector('[onclick="setupNext()"]');
  if (cont) cont.classList.toggle('opacity-50', !mode);
  if (cont) cont.classList.toggle('pointer-events-none', !mode);
}

function setSetupCustomMinutes(which, val) {
  if (which === 'morning') {
    view.setupData.customMorning = parseInt(val);
    const el = document.getElementById('morning-val');
    if (el) el.textContent = t('common.minutes', {n: val});
  } else {
    view.setupData.customEvening = parseInt(val);
    const el = document.getElementById('evening-val');
    if (el) el.textContent = t('common.minutes', {n: val});
  }
}

function toggleSetupSmallHabit(id) {
  const data = view.setupData;
  if (!data.selectedSmallHabits) data.selectedSmallHabits = [];
  const cat = QUEST_CATEGORIES[data.category];
  const quest = cat.quests[data.quest];
  const max = quest.maxSmallHabits;
  const idx = data.selectedSmallHabits.indexOf(id);
  if (idx >= 0) {
    data.selectedSmallHabits.splice(idx, 1);
  } else {
    if (max < 99 && data.selectedSmallHabits.length >= max) return;
    data.selectedSmallHabits.push(id);
  }
  renderModal();
}

function setSetupDuration(d) {
  view.setupData.duration = d;
  renderModal();
}

function addSetupMember() {
  const data = view.setupData;
  // Always read the current value from the DOM input — never trust render-time state
  // because the user may have typed after the last render.
  const domValue = document.getElementById('setup-name')?.value || '';
  const name = domValue.trim() || (data.pendingName || '').trim();
  const char = data.pendingChar;
  if (!name) return alert(t('alerts.name_required'));
  if (!char) return alert(t('alerts.character_required'));
  if (data.members.find(m => m.character === char)) {
    return alert(t('alerts.character_already_in_sangha'));
  }
  data.members.push({ id: uid(), name, character: char });
  data.pendingName = '';
  data.pendingChar = null;
  renderModal();
}

function onNameInput(value) {
  // Called on every keystroke in the name input. Saves to state without
  // triggering a re-render (which would lose focus). The button is always
  // clickable and validates at click time, so we don't need to toggle anything.
  view.setupData.pendingName = value;
}

function addSetupMemberFromBrowser(charKey) {
  const data = view.setupData;
  const name = (data.pendingName || '').trim();
  if (!name) return alert(t('alerts.name_required'));
  if (!charKey) return;
  if (data.members.find(m => m.character === charKey)) {
    return alert(t('alerts.character_already_in_sangha_short'));
  }
  data.members.push({ id: uid(), name, character: charKey });
  data.pendingName = '';
  // Reset browser index because the current char is now taken and removed from list
  data.charBrowserIdx = 0;
  renderModal();
}

function browseCharPrev() {
  const data = view.setupData;
  const takenChars = new Set(data.members.map(m => m.character));
  const available = Object.keys(CHARACTERS).filter(k => !takenChars.has(k));
  if (available.length === 0) return;
  data.charBrowserIdx = (data.charBrowserIdx - 1 + available.length) % available.length;
  renderModal();
}

function browseCharNext() {
  const data = view.setupData;
  const takenChars = new Set(data.members.map(m => m.character));
  const available = Object.keys(CHARACTERS).filter(k => !takenChars.has(k));
  if (available.length === 0) return;
  data.charBrowserIdx = (data.charBrowserIdx + 1) % available.length;
  renderModal();
}

function openCharacterDetail(charId) {
  // Don't leave the setup modal; stack a detail modal
  view.modal = { type: 'character_detail', charId, returnTo: 'setup' };
  renderModal();
}

function selectCharacterFromDetail(charId) {
  view.setupData.pendingChar = charId;
  view.modal = { type: 'setup' };
  renderModal();
}

function removeSetupMember(i) {
  view.setupData.members.splice(i, 1);
  renderModal();
}

function finishSetup() {
  // STEP 1: Do ALL state mutations synchronously, immediately. If anything
  // fails here, it fails visibly in the console — not silently inside a timeout.
  try {
    state.setupComplete = true;
    state.members = view.setupData.members;
    state.questMode = view.setupData.mode;

    if (view.setupData.mode === 'story') {
      const cat = QUEST_CATEGORIES[view.setupData.category];
      const quest = cat.quests[view.setupData.quest];
      state.questCategory = view.setupData.category;
      state.questId = view.setupData.quest;
      state.questName = quest.name;
      state.questDuration = view.setupData.duration;
      state.questActive = true;
      state.questStartDate = todayKey();
      state.stageStartDate = todayKey();
      state.reflectionStartDate = todayKey();
      state.currentStage = 0;
      state.shadow = SHADOW_FLOOR_BY_RANK[0]; // v9.8: Shadow starts at rank-0 floor, not zero — Māra is always present
      state.habitMode = view.setupData.habitMode || 'constant';
      state.difficultyPath = quest.levelKey;

      let morningMin = quest.morningMinutes;
      let eveningMin = quest.eveningMinutes;
      let middayMin = 0;  // v12.7
      // v13.6 — if a recommendation was accepted (story-path with
      // acceptedRec) or the user explicitly picked custom mode, use the
      // configured minute values rather than the quest template defaults.
      // Previously only habitMode === 'custom' honored the recommendation;
      // flipping to 'progressive' for bump-offer support broke that path.
      if (view.setupData.habitMode === 'custom' || view.setupData.acceptedRec) {
        morningMin = view.setupData.customMorning;
        eveningMin = view.setupData.customEvening;
        middayMin = view.setupData.customMidday || 0;
      }
      state.currentMorningMinutes = morningMin;
      state.currentEveningMinutes = eveningMin;
      state.currentMiddayMinutes = middayMin;
      state.baseMorningMinutes = morningMin;
      state.baseEveningMinutes = eveningMin;
      state.baseMiddayMinutes = middayMin;

      state.habits = [];
      if (morningMin > 0) {
        state.habits.push({
          id: uid(),
          name: `Morning sit (${morningMin} min)`,
          icon: '🌅',
          points: calculateSitPoints(morningMin),
          miss: calculateSitMissPenalty(morningMin),
          key: true,
          who: 'all',
          category: view.setupData.category,
          slot: 'morning'
        });
      }
      // v12.7 — optional midday sit
      if (middayMin > 0) {
        state.habits.push({
          id: uid(),
          name: `Midday sit (${middayMin} min)`,
          icon: '☀️',
          points: calculateSitPoints(middayMin),
          miss: calculateSitMissPenalty(middayMin),
          key: false,                 // midday is additional, not key
          who: 'all',
          category: view.setupData.category,
          slot: 'midday'
        });
      }
      if (eveningMin > 0) {
        state.habits.push({
          id: uid(),
          name: `Evening sit (${eveningMin} min)`,
          icon: '🌙',
          points: calculateSitPoints(eveningMin),
          miss: calculateSitMissPenalty(eveningMin),
          key: true,
          who: 'all',
          category: view.setupData.category,
          slot: 'evening'
        });
      }

      const selected = view.setupData.selectedSmallHabits || [];
      selected.forEach(id => {
        const h = MINDFULNESS_SMALL_HABITS.find(x => x.id === id);
        if (h) {
          state.habits.push({
            id: uid(),
            name: h.name,
            icon: h.icon,
            points: h.points,
            miss: 0,
            key: false,
            who: 'all',
            category: view.setupData.category,
            smallHabitId: id
          });
        }
      });
    } else {
      state.questActive = false;
      state.habits = [];
      state.reflectionStartDate = todayKey();
    }

    view.currentMember = state.members[0]?.id;
    saveState();
    recalculateShadow();
  } catch (e) {
    console.error('Setup error:', e);
    alert(t('alerts.setup_error', {error: e.message}));
    return;
  }

  // STEP 2: Show the loading screen. The state is already saved at this point —
  // if the browser freezes now, the user can reload and their quest is waiting.
  view.modal = { type: 'setup_loading', startTime: Date.now() };
  renderModal();

  // STEP 3: Transition to the main view after a short delay for the ritual feeling.
  // If the timeout fires, great. If it somehow doesn't, the emergency button in
  // the loading screen lets the user escape manually.
  view._setupTransitionTimer = setTimeout(() => {
    completeSetupTransition();
    // v11: the pre-vow diagnostic already captured the first member's state;
    // seed their onboarding record from that data rather than asking again.
    // Subsequent members (if any) still go through the post-vow diagnostic.
    try {
      const diag = view.setupData?.diagnostic;
      const firstMemberId = state.members?.[0]?.id;
      if (diag && firstMemberId && view.setupData.mode === 'story') {
        if (!state.diagnostics) state.diagnostics = {};
        if (!state.diagnostics.onboarding) state.diagnostics.onboarding = {};
        state.diagnostics.onboarding[firstMemberId] = {
          completed: new Date().toISOString(),
          answers: {
            energy: diag.energy,
            dominant_hindrance: diag.dominantHindrance,
            sensual: diag.sensual,
            illwill: diag.illwill,
            restless: diag.restless,
            doubt: diag.doubt,
            purpose: diag.purpose,
            experience: diag.experience,
            // v11 extended fields preserved for future use
            hopes: diag.hopes,
            tradition: diag.tradition,
            teachers: diag.teachers,
            currentSitLength: diag.currentSitLength,
            currentEdge: diag.currentEdge,
            wantFromTool: diag.wantFromTool,
            stoppedBefore: diag.stoppedBefore,
            stoppedBeforeOther: diag.stoppedBeforeOther,
            physicalConcerns: diag.physicalConcerns,
            physicalConcernsOther: diag.physicalConcernsOther,
            concerns: diag.concerns,
            concernsOther: diag.concernsOther,
            realisticMinutes: diag.realisticMinutes,
            // Chip interpretation (v15.0): factor bumps + flags derived from
            // Phase 2 chip selections. See docs/CHIP-INTERPRETATION.md.
            chipInterpretation: view.setupData.chipInterpretation || null
          }
        };
        // Also persist the recommendation so it can be shown later / referenced
        if (view.setupData.recommendation) {
          if (!state.recommendations) state.recommendations = {};
          state.recommendations[firstMemberId] = view.setupData.recommendation;
        }
        saveState();
      }
    } catch (e) { console.warn('Could not seed onboarding from pre-vow diagnostic:', e); }
    // If there are more members beyond the first, the post-vow diagnostic
    // still walks through them. The first member is already seeded so
    // openNextOnboardingDiagnostic will skip them.
    state.pendingOnboardingDiagnostic = 0;
    saveState();
    openNextOnboardingDiagnostic();
  }, 2200);
}

function openNextOnboardingDiagnostic() {
  if (!state.members || state.members.length === 0) return;
  const idx = state.pendingOnboardingDiagnostic;
  if (idx < 0 || idx >= state.members.length) {
    state.pendingOnboardingDiagnostic = -1;
    saveState();
    render();
    return;
  }
  const member = state.members[idx];
  // Skip if this member has already completed onboarding (e.g. resumed session)
  if (getOnboardingDiagnostic(member.id)) {
    state.pendingOnboardingDiagnostic = idx + 1;
    openNextOnboardingDiagnostic();
    return;
  }
  view.modal = {
    type: 'onboarding_diagnostic',
    memberId: member.id,
    step: 0,
    answers: {}
  };
  renderModal();
}

function onboardingDiagnosticAnswer(questionId, value) {
  if (!view.modal || view.modal.type !== 'onboarding_diagnostic') return;
  view.modal.answers[questionId] = value;
  renderModal();
}

function onboardingDiagnosticSliderTouch(questionId, value) {
  if (!view.modal || view.modal.type !== 'onboarding_diagnostic') return;
  view.modal.answers[questionId] = value;
}

function onboardingDiagnosticNext() {
  const m = view.modal;
  if (!m || m.type !== 'onboarding_diagnostic') return;
  const q = ONBOARDING_DIAGNOSTIC[m.step];
  if (q && m.answers[q.id] === undefined) {
    // Default a slider that wasn't touched to its midpoint so the user
    // isn't stuck. Select questions require an actual tap.
    if (q.type === 'slider') m.answers[q.id] = Math.round((q.min + q.max) / 2);
    else return; // need explicit tap
  }
  if (m.step < ONBOARDING_DIAGNOSTIC.length - 1) {
    m.step++;
    renderModal();
    return;
  }
  // Finished: save, advance to next member or show prescription
  saveOnboardingDiagnostic(m.memberId, m.answers);
  const memberId = m.memberId;
  const nextIdx = (state.pendingOnboardingDiagnostic || 0) + 1;
  state.pendingOnboardingDiagnostic = nextIdx;
  saveState();
  // Show the prescription (first-guidance) modal, then continue
  view.modal = {
    type: 'first_guidance',
    memberId
  };
  renderModal();
}

function onboardingDiagnosticBack() {
  const m = view.modal;
  if (!m || m.type !== 'onboarding_diagnostic') return;
  if (m.step > 0) { m.step--; renderModal(); }
}

function closeFirstGuidance() {
  view.modal = null;
  renderModal();
  // Continue to the next member's onboarding, if any
  openNextOnboardingDiagnostic();
}

function openTutorialFromFirstGuidance() {
  state.tutorialOpened = true;
  saveState();
  view._resumeOnboardingAfterTutorial = true;
  view.modal = { type: 'meditation_tutorial', step: 0 };
  renderModal();
}

function completeSetupTransition() {
  if (view._setupTransitionTimer) {
    clearTimeout(view._setupTransitionTimer);
    view._setupTransitionTimer = null;
  }
  view.modal = null;
  // CRITICAL: clear the modal root explicitly. render() only touches #app,
  // not #modal-root, so without this the loading screen stays visually stuck.
  renderModal();
  render();
}
