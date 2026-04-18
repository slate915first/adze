// ============================================================================
// src/systems/suttas.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 15 function(s): suttasBySubcategory, subcategoriesForSutta, detectStrugglesInText, suggestSuttaForStruggle, openSuttaStudy, suttaStudyReveal, suttaStudyRate, getCurrentFoundationWeek, getFoundationForWeek, getCurrentFoundation, isSuttaReadyForMember, groupSuttasByTag, ensureSuttasReadRecord, hasReadSutta, suttasReadCount
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function suttasBySubcategory(subId) {
  return SUTTA_LIBRARY.filter(s => (SUTTA_SUBCATEGORY_TAGS[s.id] || []).includes(subId))
                      .sort((a, b) => (a.minRank || 0) - (b.minRank || 0));
}

function subcategoriesForSutta(suttaId) {
  const tags = SUTTA_SUBCATEGORY_TAGS[suttaId] || [];
  return tags.map(t => SUTTA_SUBCATEGORIES.find(s => s.id === t)).filter(Boolean);
}

function detectStrugglesInText(text) {
  if (!text || typeof text !== 'string') return [];
  const norm = text.toLowerCase();
  const hits = {};
  for (const subId of Object.keys(STRUGGLE_PHRASES)) {
    const phrases = STRUGGLE_PHRASES[subId];
    let count = 0;
    for (const p of phrases) {
      // Simple word-boundary test — phrase must appear as discrete text.
      // Apostrophes handled by keeping them in the phrase; case folded above.
      if (norm.indexOf(p) !== -1) count++;
    }
    if (count > 0) hits[subId] = count;
  }
  return Object.keys(hits).sort((a, b) => hits[b] - hits[a]);
}

function suggestSuttaForStruggle(memberId, subId) {
  const candidates = suttasBySubcategory(subId);
  if (candidates.length === 0) return null;
  // Prefer one the member has already read (the "return to this" voice)
  if (memberId) {
    const already = candidates.find(s => hasReadSutta(memberId, s.id));
    if (already) return { sutta: already, alreadyRead: true, subId };
  }
  // Else: lowest minRank, i.e. the most foundational entry point
  const lowest = candidates.reduce((best, s) => (!best || s.minRank < best.minRank) ? s : best, null);
  return { sutta: lowest, alreadyRead: false, subId };
}

function openSuttaStudy(suttaId) {
  const mid = view.currentMember;
  if (!mid) return;
  if (!srsHasStarted(mid, suttaId)) {
    srsBeginStudy(mid, suttaId);
  }
  view.modal = {
    type: 'sutta_study',
    suttaId,
    showingAnswer: false,
    doneThisSession: 0
  };
  renderModal();
}

function suttaStudyReveal() {
  if (!view.modal || view.modal.type !== 'sutta_study') return;
  view.modal.showingAnswer = true;
  renderModal();
}

function suttaStudyRate(rating) {
  if (!view.modal || view.modal.type !== 'sutta_study') return;
  const mid = view.currentMember;
  const { suttaId } = view.modal;
  const next = srsNextDueForSutta(mid, suttaId);
  if (!next) return;
  srsRate(mid, suttaId, next.q.id, rating);
  view.modal.showingAnswer = false;
  view.modal.doneThisSession = (view.modal.doneThisSession || 0) + 1;
  renderModal();
}

function getCurrentFoundationWeek() {
  if (!state.questActive || !state.questStartDate) return 1;
  const start = new Date(state.questStartDate);
  const now = new Date();
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(days / 7) + 1);
}

function getFoundationForWeek(week) {
  return FOUNDATION_CURRICULUM.find(f => f.week === week) || null;
}

function getCurrentFoundation() {
  const week = getCurrentFoundationWeek();
  if (week > FOUNDATION_CURRICULUM.length) return null;
  return getFoundationForWeek(week);
}

function isSuttaReadyForMember(memberId, suttaId) {
  const sutta = SUTTA_LIBRARY.find(s => s.id === suttaId);
  if (!sutta) return false;
  const rk = computeMemberRank(memberId);
  return rk >= sutta.minRank;
}

function groupSuttasByTag() {
  const groups = {};
  for (const s of SUTTA_LIBRARY) {
    for (const tag of s.teaches) {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(s);
    }
  }
  return groups;
}

function ensureSuttasReadRecord(memberId) {
  if (!state.suttasRead) state.suttasRead = {};
  if (!state.suttasRead[memberId]) state.suttasRead[memberId] = {};
  return state.suttasRead[memberId];
}

function hasReadSutta(memberId, suttaId) {
  const r = state.suttasRead?.[memberId];
  return !!(r && r[suttaId]);
}

function suttasReadCount(memberId) {
  return Object.keys(state.suttasRead?.[memberId] || {}).length;
}
