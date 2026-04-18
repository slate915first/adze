// ============================================================================
// src/systems/quotes.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 5 function(s): getDailyAjahnChahTeaching, quoteIsSaved, toggleQuoteSaved, savedQuotesForMember, getDailyTeaching
// ============================================================================

function getDailyAjahnChahTeaching() {
  return getDailyTeaching();
}

function quoteIsSaved(memberId, quoteIndex) {
  if (!memberId || state.savedQuotes == null) return false;
  const arr = state.savedQuotes[memberId] || [];
  return arr.some(q => q.index === quoteIndex);
}

function toggleQuoteSaved(quoteIndex) {
  const mid = view.currentMember;
  if (!mid) return;
  if (!state.savedQuotes) state.savedQuotes = {};
  if (!state.savedQuotes[mid]) state.savedQuotes[mid] = [];
  const arr = state.savedQuotes[mid];
  const existingIdx = arr.findIndex(q => q.index === quoteIndex);
  if (existingIdx >= 0) {
    arr.splice(existingIdx, 1);
  } else {
    arr.push({ index: quoteIndex, savedAt: todayKey() });
  }
  saveState();
  render();
}

function savedQuotesForMember(memberId) {
  if (!memberId || !state.savedQuotes) return [];
  const arr = state.savedQuotes[memberId] || [];
  return arr
    .map(saved => {
      const q = TEACHING_QUOTES[saved.index];
      return q ? { ...q, savedAt: saved.savedAt, index: saved.index } : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

function getDailyTeaching() {
  const dayIdx = state.questActive ? daysSinceReflectionStart() : 0;
  const todayHash = todayKey().split('-').reduce((s, n) => s + parseInt(n, 10), 0);

  // Try matching to the current member's dominant hindrance
  if (view && view.currentMember) {
    const top = (typeof topTwoHindrances === 'function') ? topTwoHindrances(view.currentMember) : [];
    if (top && top[0] && top[0].avg >= 5) {
      const tag = top[0].id;
      const matched = TEACHING_QUOTES
        .map((t, i) => ({ ...t, originalIndex: i }))
        .filter(t => t.relatesTo.includes(tag));
      if (matched.length > 0) {
        const idx = ((dayIdx + todayHash) % matched.length + matched.length) % matched.length;
        const pick = matched[idx];
        return { text: pick.text, source: pick.source, index: pick.originalIndex, matchedTo: tag };
      }
    }
  }

  // Fallback: deterministic daily rotation through ALL teachings
  const idx = ((dayIdx + todayHash) % TEACHING_QUOTES.length + TEACHING_QUOTES.length) % TEACHING_QUOTES.length;
  const pick = TEACHING_QUOTES[idx];
  return { text: pick.text, source: pick.source, index: idx, matchedTo: null };
}
