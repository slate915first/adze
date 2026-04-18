// ============================================================================
// engine/srs.js
// ----------------------------------------------------------------------------
// Spaced-repetition scheduling for sutta study. Leitner-style boxes with
// intervals [1, 3, 7, 14, 30, 90] days. Cards start in box 0 (new, due
// today) and move through boxes 1..6 on "good"/"easy" ratings; "hard"
// resets to box 1.
//
// Extracted verbatim from adze_v14_2.html by scripts/extract_srs.js.
// Kept as a plain script (no ES module syntax) so the build step can inline
// it into the single-file HTML without transformation.
//
// Ambient dependencies (resolved from the enclosing scope — globals in the
// browser, global.X in Node tests):
//
//   state            — the app's top-level state object; SRS data lives at
//                      state.suttaSrs[memberId][suttaId][questionId].
//   SUTTA_QUESTIONS  — the question bank from content/sutta-questions/.
//   todayKey()       — returns the current date as 'YYYY-MM-DD'.
//   saveState()      — persists state (typically to localStorage).
//
// The engine is stateful in that it mutates `state.suttaSrs`; tests mock
// all four ambient deps before require()ing this file.
// ============================================================================

const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30, 90];

function srsEnsure() {
  if (!state.suttaSrs) state.suttaSrs = {};
  return state.suttaSrs;
}

function srsGetCard(memberId, suttaId, questionId) {
  const s = srsEnsure();
  return s[memberId]?.[suttaId]?.[questionId] || null;
}

function srsInitCard(memberId, suttaId, questionId) {
  const s = srsEnsure();
  if (!s[memberId]) s[memberId] = {};
  if (!s[memberId][suttaId]) s[memberId][suttaId] = {};
  if (!s[memberId][suttaId][questionId]) {
    s[memberId][suttaId][questionId] = {
      box: 0,                 // 0 = not yet reviewed; 1..6 = Leitner box
      lastReview: null,
      nextDue: todayKey(),    // new cards are due today
      reviewCount: 0
    };
  }
  return s[memberId][suttaId][questionId];
}

function srsRate(memberId, suttaId, questionId, rating) {
  // rating: 'hard' | 'good' | 'easy'
  const card = srsInitCard(memberId, suttaId, questionId);
  let newBox = card.box;
  if (rating === 'hard')      newBox = 1;
  else if (rating === 'good') newBox = Math.min(6, (card.box || 0) + 1);
  else if (rating === 'easy') newBox = Math.min(6, (card.box || 0) + 2);
  card.box = newBox;
  card.lastReview = todayKey();
  card.reviewCount = (card.reviewCount || 0) + 1;
  const interval = SRS_INTERVALS_DAYS[newBox - 1] || 1;
  const d = new Date();
  d.setDate(d.getDate() + interval);
  card.nextDue = d.toISOString().slice(0, 10);
  saveState();
  return card;
}

function srsDueToday(memberId) {
  const s = srsEnsure();
  const member = s[memberId] || {};
  const today = todayKey();
  const due = [];
  for (const suttaId of Object.keys(member)) {
    const questions = SUTTA_QUESTIONS[suttaId] || [];
    for (const q of questions) {
      const card = member[suttaId][q.id];
      if (card && card.nextDue <= today) {
        due.push({ suttaId, questionId: q.id, card });
      }
    }
  }
  return due;
}

function srsCardsForSutta(memberId, suttaId) {
  const questions = SUTTA_QUESTIONS[suttaId] || [];
  const today = todayKey();
  const info = { total: questions.length, started: 0, due: 0, mastered: 0 };
  for (const q of questions) {
    const card = srsGetCard(memberId, suttaId, q.id);
    if (!card) continue;
    info.started++;
    if (card.nextDue <= today) info.due++;
    if (card.box >= 6) info.mastered++;
  }
  return info;
}

function srsBeginStudy(memberId, suttaId) {
  const questions = SUTTA_QUESTIONS[suttaId] || [];
  for (const q of questions) {
    srsInitCard(memberId, suttaId, q.id);
  }
  saveState();
}

function srsHasStarted(memberId, suttaId) {
  const s = srsEnsure();
  return !!(s[memberId] && s[memberId][suttaId] && Object.keys(s[memberId][suttaId]).length > 0);
}

function srsNextDueForSutta(memberId, suttaId) {
  const s = srsEnsure();
  const member = s[memberId] || {};
  const cards = member[suttaId] || {};
  const questions = SUTTA_QUESTIONS[suttaId] || [];
  const today = todayKey();
  // Look for a due card — lowest-box first (shakiest material first), then
  // oldest nextDue, then the question order in SUTTA_QUESTIONS.
  let best = null;
  for (const q of questions) {
    const card = cards[q.id];
    if (!card) continue;
    if (card.nextDue > today) continue;
    if (!best) { best = { q, card }; continue; }
    if ((card.box || 0) < (best.card.box || 0)) { best = { q, card }; continue; }
    if (card.nextDue < best.card.nextDue) { best = { q, card }; }
  }
  return best;
}

// CommonJS export for Node-side tests. Harmless in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SRS_INTERVALS_DAYS,
    srsEnsure,
    srsGetCard,
    srsInitCard,
    srsRate,
    srsDueToday,
    srsCardsForSutta,
    srsBeginStudy,
    srsHasStarted,
    srsNextDueForSutta,
  };
}
