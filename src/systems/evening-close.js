// ============================================================================
// src/systems/evening-close.js
// ----------------------------------------------------------------------------
// Functions: pickEveningCloseDepth, openOnelineJournal, openEveningClose,
//            saveOnelineJournal (legacy — kept for any lingering caller),
//            eveningCloseSetLine, eveningCloseStopHere, eveningCloseGoDeeper,
//            eveningCloseSetEnergy, eveningCloseSetMinutes, eveningCloseProceed,
//            eveningCloseRest, eveningCloseSetAnswer, eveningCloseFinish
//
// v15.15 — merged flow. Previously Today's Reflection column showed two
// tiles: "One-line journal" and "Evening close". Tester feedback: two entries
// for one evening ritual reads as redundant overhead. Now a single tile opens
// a progressive flow — start with a one-line capture, then either "save and
// rest" (low-energy bail, still counts as a full daily reflection) or "save
// and go deeper" (continues into the existing 6-phase evening close).
//
// The stop-at-line path writes BOTH `.oneline` (for text-specific use like
// path.js) AND a minimal `.daily = { theme: 'oneline_only', ... }` so four
// downstream systems stay honest:
//   * rank-gate journal leg reads `.daily.answer`
//   * state.completedDailies counter
//   * pickNextStep / 18:00 auto-fire gate
//   * review-tab counts
// Evening-close continuation overwrites `.daily` with the richer version;
// rank-gate is idempotent same-day so no double counting.
// ============================================================================

function pickEveningCloseDepth(energy, minutes) {
  // minutes === 0 means "open-ended"
  if (minutes === 0 && energy >= 4) return 'open';
  if (energy >= 4 && minutes >= 15) return 'deep';
  if (energy >= 3 && minutes >= 5) return 'standard';
  return 'minimal';
}

// v15.15 — the merged flow entry point. Both the legacy oneline-journal
// opener AND the evening-close opener route here. Starts at the new
// `oneline` phase. If the user later chooses "go deeper", eveningCloseGoDeeper
// transitions to the existing `gauge` phase unchanged.
function openEveningClose() {
  view.modal = {
    type: 'evening_close',
    phase: 'oneline',
    line: '',
    energy: 3,
    minutes: 5,
    depth: null,
    answers: {}
  };
  renderModal();
}

// Legacy alias. path.js (next-step prescription) and today.js both still call
// this name; both now route into the merged flow.
function openOnelineJournal() {
  openEveningClose();
}

function eveningCloseSetLine(text) {
  if (!view.modal || view.modal.type !== 'evening_close') return;
  view.modal.line = text || '';
}

// Writes both `.oneline` AND a minimal `.daily`, awards tisikkhā, runs the
// rank-gate evaluator, closes the modal. The "low-energy bail that still
// counts" path. v15.15.2 — also collects any hindrance-slider answers the
// user filled in on the oneline phase (replaces the old evening_reflection
// modal's data-collection role).
function eveningCloseStopHere() {
  if (!view.modal || view.modal.type !== 'evening_close') return;
  const mid = view.currentMember;
  if (!mid) { view.modal = null; renderModal(); return; }
  const text = (view.modal.line || '').trim();
  const dk = todayKey();
  if (!state.reflectionLog[dk]) state.reflectionLog[dk] = {};
  if (!state.reflectionLog[dk][mid]) state.reflectionLog[dk][mid] = {};
  const completed = new Date().toISOString();

  // Keep the line-specific entry for path.js and the review-tab counts.
  state.reflectionLog[dk][mid].oneline = { text, completed };
  // Also write a minimal .daily so gate + counter + auto-fire all agree.
  state.reflectionLog[dk][mid].daily = {
    q: 'One-line reflection',
    theme: 'oneline_only',
    answer: text,
    completed
  };
  state.completedDailies = (state.completedDailies || 0) + 1;

  // v15.15.2 — collect diagnostic sliders before saving reflection (so the
  // gate evaluator sees the fresh hindrance snapshot). saveDailyDiagnostic
  // runs its own writePathGateEvaluation; the reflection save below runs it
  // again. Gate eval is idempotent same-day so the double call is safe.
  _eveningCloseSaveDiagnosticsIfAny(mid);

  // v15.16.1 — award base paññā for the line-level journal only. The
  // free-text hindrance-keyword bonus that used to fire here was removed
  // (game-designer flagged it as metric-creep: once a tester learns that
  // typing "kamacchanda" earns more than "I was restless", the reflection
  // field becomes a keyword-stuffing box). TISIKKHA_EARN.hindrance_named
  // stays defined in config.js for a future structured-chip flow.
  earnTisikkha(mid, 'journal_oneline');

  saveState();
  writePathGateEvaluation(mid);

  view.modal = null;
  renderModal();
  render();
}

// Transition from the oneline phase into the gauge phase. Keeps the typed
// line on view.modal.line so eveningCloseFinish can fold it into the final
// answer text.
function eveningCloseGoDeeper() {
  if (!view.modal || view.modal.type !== 'evening_close') return;
  view.modal.phase = 'gauge';
  renderModal();
}

// Legacy: saveOnelineJournal(text) was called directly by the old modal
// button. Kept as a thin wrapper that mirrors the stop-here path in case
// any out-of-repo code still references the name.
function saveOnelineJournal(text) {
  if (!view.modal || view.modal.type !== 'evening_close') {
    // Back-compat: caller didn't open the merged flow. Synthesize a modal
    // shell so eveningCloseStopHere can write through.
    view.modal = { type: 'evening_close', phase: 'oneline', line: text || '' };
  } else {
    view.modal.line = text || '';
  }
  eveningCloseStopHere();
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
  const lineText = (view.modal.line || '').trim();
  const dk = todayKey();
  if (!state.reflectionLog[dk]) state.reflectionLog[dk] = {};
  if (!state.reflectionLog[dk][mid]) state.reflectionLog[dk][mid] = {};
  // Build a single answer text from the accumulated structured answers.
  // v15.15 — the one-liner from the oneline phase (if any) is the first line
  // so it appears in the saved answer and gets scanned for hindrance
  // keywords alongside the deeper text.
  const lines = [];
  if (lineText) lines.push('One line: ' + lineText);
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
  // v15.15 — also record the one-liner as its own .oneline entry so path.js
  // and review-tab counts see it. The merged flow writes both deliberately.
  if (lineText) {
    state.reflectionLog[dk][mid].oneline = {
      text: lineText,
      completed: state.reflectionLog[dk][mid].daily.completed
    };
  }
  state.completedDailies = (state.completedDailies || 0) + 1;

  // v15.15.2 — collect diagnostic sliders from the oneline phase if the
  // user filled them in before going deeper. Must run BEFORE awarding
  // reflection-tier tisikkhā so the gate eval sees fresh hindrance data.
  _eveningCloseSaveDiagnosticsIfAny(mid);

  // Award tisikkhā by depth tier. The line-level journal_oneline is NOT
  // awarded here even when the line exists — the deeper flow supersedes
  // it by design (no double-count for the same practice beat).
  const earnKey = depth === 'open' ? 'reflection_open'
    : depth === 'deep' ? 'reflection_deep'
    : depth === 'standard' ? 'reflection_standard'
    : 'reflection_minimal';
  if (mid) earnTisikkha(mid, earnKey);
  // v15.16.1 — regex-scan hindrance-keyword bonus removed from scoring; see
  // the matching comment in eveningCloseStopHere above. Struggle detection
  // below still uses text pattern-matching for suggestion routing, which is
  // a suggestion-signal, not a reward-signal (no paññā leaks into it).
  const allText = lineText + ' ' + (answers.deeper || '') + ' ' + (answers.contemplation || '') + ' ' + (answers.one_word || '');
  saveState();
  if (mid) writePathGateEvaluation(mid);

  // v13.2 — struggle detection on reflection text.
  const detectedSubs = detectStrugglesInText(allText);
  let suggestion = null;
  if (detectedSubs.length > 0) {
    suggestion = suggestSuttaForStruggle(mid, detectedSubs[0]);
  }

  view.modal = { type: 'evening_close', phase: 'done', depth, energy: view.modal.energy, minutes: view.modal.minutes, suttaSuggestion: suggestion };
  renderModal();
  render();
}

// v15.15.2 — collects diagnostic-slider values from the DOM and persists
// them via saveDailyDiagnostic. Called from both merged-flow exit paths
// (stop-here and finish-deeper). Noop if no sliders are present (e.g. the
// user already filled the daily diagnostic earlier).
function _eveningCloseSaveDiagnosticsIfAny(memberId) {
  if (!memberId || typeof getDailyDiagnosticQuestions !== 'function' || typeof saveDailyDiagnostic !== 'function') return;
  const diagQs = getDailyDiagnosticQuestions();
  if (!diagQs || !diagQs.length) return;
  const answers = {};
  let anyAnswered = false;
  diagQs.forEach(q => {
    const el = document.getElementById(`diag-${q.id}`);
    if (el) {
      answers[q.id] = parseInt(el.value, 10);
      anyAnswered = true;
    }
  });
  if (anyAnswered) saveDailyDiagnostic(memberId, answers);
}
