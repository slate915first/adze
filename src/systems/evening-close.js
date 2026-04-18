// ============================================================================
// src/systems/evening-close.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 10 function(s): pickEveningCloseDepth, openOnelineJournal, saveOnelineJournal, openEveningClose, eveningCloseSetEnergy, eveningCloseSetMinutes, eveningCloseProceed, eveningCloseRest, eveningCloseSetAnswer, eveningCloseFinish
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function pickEveningCloseDepth(energy, minutes) {
  // minutes === 0 means "open-ended"
  if (minutes === 0 && energy >= 4) return 'open';
  if (energy >= 4 && minutes >= 15) return 'deep';
  if (energy >= 3 && minutes >= 5) return 'standard';
  return 'minimal';
}

function openOnelineJournal() {
  view.modal = { type: 'oneline_journal', text: '' };
  renderModal();
}

function saveOnelineJournal(text) {
  const mid = view.currentMember;
  if (!mid) return;
  const dk = todayKey();
  if (!state.reflectionLog[dk]) state.reflectionLog[dk] = {};
  if (!state.reflectionLog[dk][mid]) state.reflectionLog[dk][mid] = {};
  state.reflectionLog[dk][mid].oneline = { text: text || '', completed: new Date().toISOString() };
  earnTisikkha(mid, 'journal_oneline');
  // Also: scan for hindrance keywords and award extra paññā if any are named
  const evidenceCount = Object.values(HINDRANCE_EVIDENCE_KEYWORDS || {}).flat().reduce((acc, kw) => {
    try { return acc + (new RegExp('\\b' + kw + '\\b', 'i').test(text) ? 1 : 0); } catch(e) { return acc; }
  }, 0);
  for (let i = 0; i < Math.min(evidenceCount, 2); i++) earnTisikkha(mid, 'hindrance_named');
  saveState();
  view.modal = null;
  renderModal();
  render();
}

function openEveningClose() {
  view.modal = { type: 'evening_close', phase: 'gauge', energy: 3, minutes: 5, depth: null, answers: {} };
  renderModal();
}

function eveningCloseSetEnergy(n) {
  if (!view.modal || view.modal.type !== 'evening_close') return;
  view.modal.energy = n;
  renderModal();
}

function eveningCloseSetMinutes(n) {
  if (!view.modal || view.modal.type !== 'evening_close') return;
  view.modal.minutes = n;
  renderModal();
}

function eveningCloseProceed() {
  if (!view.modal || view.modal.type !== 'evening_close') return;
  view.modal.depth = pickEveningCloseDepth(view.modal.energy, view.modal.minutes);
  view.modal.phase = view.modal.depth;
  if (!view.modal.answers) view.modal.answers = {};
  renderModal();
}

function eveningCloseRest() {
  // Honor the rest — record a "chose-rest" close so the streak doesn't break
  // and so the practitioner is not nagged tomorrow.
  const mid = view.currentMember;
  if (!mid) { view.modal = null; renderModal(); return; }
  const dk = todayKey();
  if (!state.reflectionLog[dk]) state.reflectionLog[dk] = {};
  if (!state.reflectionLog[dk][mid]) state.reflectionLog[dk][mid] = {};
  state.reflectionLog[dk][mid].daily = {
    q: 'Energy was low — chose rest',
    theme: 'rest',
    answer: '',
    chose_rest: true,
    completed: new Date().toISOString()
  };
  state.completedDailies = (state.completedDailies || 0) + 1;
  saveState();
  if (mid) writePathGateEvaluation(mid);
  view.modal = null;
  renderModal();
  render();
}

function eveningCloseSetAnswer(key, val) {
  if (!view.modal || view.modal.type !== 'evening_close') return;
  if (!view.modal.answers) view.modal.answers = {};
  view.modal.answers[key] = val;
  renderModal();
}

function eveningCloseFinish() {
  if (!view.modal || view.modal.type !== 'evening_close') return;
  const mid = view.modal.memberId || view.currentMember;
  const depth = view.modal.depth;
  const answers = view.modal.answers || {};
  const dk = todayKey();
  if (!state.reflectionLog[dk]) state.reflectionLog[dk] = {};
  if (!state.reflectionLog[dk][mid]) state.reflectionLog[dk][mid] = {};
  // Build a single answer text from the accumulated structured answers
  const lines = [];
  if (answers.gate_held !== undefined) lines.push('Gate held: ' + (answers.gate_held ? 'yes' : 'no'));
  if (answers.dominant_hindrance) lines.push('Strongest hindrance today: ' + answers.dominant_hindrance);
  if (answers.one_word) lines.push('One word: ' + answers.one_word);
  if (answers.deeper) lines.push('\n' + answers.deeper);
  if (answers.foundations) {
    const f = answers.foundations;
    lines.push(`\nSatipaṭṭhāna self-survey: body=${f.body || '-'}, feeling=${f.feeling || '-'}, mind=${f.mind || '-'}, dhammas=${f.dhammas || '-'}`);
  }
  if (answers.contemplation) lines.push('\n' + answers.contemplation);
  state.reflectionLog[dk][mid].daily = {
    q: 'Evening close — ' + depth,
    theme: 'evening_close',
    answer: lines.join('\n'),
    depth,
    energy: view.modal.energy,
    minutes: view.modal.minutes,
    completed: new Date().toISOString()
  };
  state.completedDailies = (state.completedDailies || 0) + 1;
  // Award tisikkhā by depth tier
  const earnKey = depth === 'open' ? 'reflection_open'
    : depth === 'deep' ? 'reflection_deep'
    : depth === 'standard' ? 'reflection_standard'
    : 'reflection_minimal';
  if (mid) earnTisikkha(mid, earnKey);
  // Bonus paññā for naming hindrances in any free-text answer
  const allText = (answers.deeper || '') + ' ' + (answers.contemplation || '') + ' ' + (answers.one_word || '');
  const evidenceCount = Object.values(HINDRANCE_EVIDENCE_KEYWORDS || {}).flat().reduce((acc, kw) => {
    try { return acc + (new RegExp('\\b' + kw + '\\b', 'i').test(allText) ? 1 : 0); } catch(e) { return acc; }
  }, 0);
  for (let i = 0; i < Math.min(evidenceCount, 3); i++) earnTisikkha(mid, 'hindrance_named');
  saveState();
  if (mid) writePathGateEvaluation(mid);

  // v13.2 — struggle detection on reflection text. If the practitioner named
  // something the Buddha spoke to specifically, surface that sutta in the
  // done-phase card. Only the top-ranked detected subcategory is used —
  // showing several would dilute the signal and turn it into noise.
  const detectedSubs = detectStrugglesInText(allText);
  let suggestion = null;
  if (detectedSubs.length > 0) {
    suggestion = suggestSuttaForStruggle(mid, detectedSubs[0]);
  }

  view.modal = { type: 'evening_close', phase: 'done', depth, energy: view.modal.energy, minutes: view.modal.minutes, suttaSuggestion: suggestion };
  renderModal();
  render();
}
