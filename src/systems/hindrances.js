// ============================================================================
// src/systems/hindrances.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 11 function(s): rollingFactorAverage, hindranceRollingAverage, hindranceCompositeAverage, dominantHindranceForMember, getFocusForNow, getHindranceRemovalProgress, topTwoHindrances, getHindranceInfo, sitCountInWindow, journalEvidenceCount, tickKamacchanda
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function rollingFactorAverage(memberId, factorId, days = 7) {
  let sum = 0, n = 0;
  for (let i = 0; i < days; i++) {
    const dk = daysAgo(i);
    const row = state.diagnostics?.daily?.[dk]?.[memberId];
    if (row && typeof row[factorId] === 'number') { sum += row[factorId]; n++; }
  }
  return n === 0 ? null : sum / n;
}

function hindranceRollingAverage(memberId, factorId, windowDays) {
  const days = windowDays || PATH_GATE.ROLLING_WINDOW_DAYS;
  let sum = 0, count = 0;
  for (let i = 0; i < days; i++) {
    const dk = daysAgo(i);
    const row = state.diagnostics?.daily?.[dk]?.[memberId];
    if (row && typeof row[factorId] === 'number') {
      sum += row[factorId];
      count++;
    }
  }
  return count > 0 ? (sum / count) : null;
}

function hindranceCompositeAverage(memberId, windowDays) {
  const vals = [];
  for (const h of FIVE_HINDRANCES) {
    const avg = hindranceRollingAverage(memberId, h.id, windowDays);
    if (avg !== null) vals.push(avg);
  }
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function dominantHindranceForMember(memberId) {
  let best = null, bestVal = -1;
  for (const h of FIVE_HINDRANCES) {
    const avg = hindranceRollingAverage(memberId, h.id, 14); // shorter window for t('shadow.modal.curve_current')
    if (avg !== null && avg > bestVal) { best = h.id; bestVal = avg; }
  }
  if (best && bestVal >= 2) return best;
  // Fallback: onboarding answer
  const onb = getOnboardingDiagnostic(memberId);
  return onb?.answers?.dominant_hindrance || null;
}

function getFocusForNow(memberId) {
  // Step 1: are any hindrances dominant?
  const hindranceVals = [];
  for (const h of FIVE_HINDRANCES) {
    const avg = hindranceRollingAverage(memberId, h.id, 14);
    if (avg !== null) hindranceVals.push({ h, avg });
  }
  hindranceVals.sort((a, b) => b.avg - a.avg);
  const top = hindranceVals[0];
  if (top && top.avg >= 5) {
    return {
      mode: t('path_viewer.layer2.release_button'),
      title: t('path.focus.release_title', {pali: top.h.pali}),
      subtitle: t('path.focus.release_subtitle', {english: top.h.english}),
      icon: top.h.icon,
      detail: t('path.focus.release_detail', {pali: top.h.pali}),
      progressLabel: t('path.focus.release_progress_label'),
      progressValue: top.avg,
      progressMax: 10,
      progressInverted: true
    };
  }

  // Step 2: are any measurable factors lagging?
  const measurable = ['sati', 'dhammavicaya', 'viriya', 'samadhi'];
  let weakest = null, weakestVal = 11;
  for (const fid of measurable) {
    const s = factorScore(memberId, fid);
    if (s !== null && s < weakestVal) { weakest = fid; weakestVal = s; }
  }
  if (weakest && weakestVal < 5) {
    const f = SEVEN_FACTORS.find(x => x.id === weakest);
    return {
      mode: 'cultivate',
      title: t('path.focus.cultivate_title', {pali: f.pali}),
      subtitle: t('path.focus.cultivate_subtitle', {english: f.english}),
      icon: f.icon,
      detail: f.description + t('path.focus.cultivate_detail_tail'),
      progressLabel: t('path.focus.cultivate_progress_label'),
      progressValue: weakestVal,
      progressMax: 10,
      progressInverted: false
    };
  }

  // Step 3: default — sati is always worth deepening
  const sati = SEVEN_FACTORS.find(x => x.id === 'sati');
  const satiScore = factorScore(memberId, 'sati') || 0;
  return {
    mode: 'cultivate',
    title: t('path.focus.deepen_title', {pali: sati.pali}),
    subtitle: t('path.focus.deepen_subtitle', {english: sati.english}),
    icon: sati.icon,
    detail: t('path.focus.deepen_detail'),
    progressLabel: t('path.focus.cultivate_progress_label'),
    progressValue: satiScore,
    progressMax: 10,
    progressInverted: false
  };
}

function getHindranceRemovalProgress(memberId) {
  return FIVE_HINDRANCES.map(h => {
    const avg = hindranceRollingAverage(memberId, h.id, 14);
    if (avg === null) {
      return { hindrance: h, severity: null, removalProgress: 0, status: 'no_data' };
    }
    const removalProgress = Math.max(0, Math.min(10, 10 - avg));
    let status = 'present';
    if (avg < 1) status = 'quiet';
    else if (avg < 3) status = 'weakening';
    else if (avg < 6) status = 'present';
    else status = 'strong';
    return { hindrance: h, severity: avg, removalProgress, status };
  });
}

function topTwoHindrances(memberId) {
  const ranked = [];
  for (const h of FIVE_HINDRANCES) {
    const avg = hindranceRollingAverage(memberId, h.id, 14);
    if (avg !== null && avg >= 2) ranked.push({ id: h.id, avg });
  }
  ranked.sort((a, b) => b.avg - a.avg);
  // v10.1 fix: when no daily diagnostic data exists yet, fall back to the
  // onboarding answer. A new practitioner who set "sense desire" at onboarding
  // should see that reflected in the pre-sit intention immediately, not be
  // told there's "no dominant hindrance" until 14 days of data accumulate.
  if (ranked.length === 0) {
    const onb = getOnboardingDiagnostic(memberId);
    const hid = onb?.answers?.dominant_hindrance;
    if (hid && FIVE_HINDRANCES.find(h => h.id === hid)) {
      return [{ id: hid, avg: 5, fromOnboarding: true }];
    }
  }
  return ranked.slice(0, 2);
}

function getHindranceInfo(hindranceId) {
  return FIVE_HINDRANCES.find(h => h.id === hindranceId) || null;
}

function sitCountInWindow(memberId, windowDays) {
  const days = windowDays || PATH_GATE.ROLLING_WINDOW_DAYS;
  const cutoff = daysAgo(days - 1); // inclusive of "today-minus-(n-1)"
  let count = 0;
  for (const r of (state.sitRecords || [])) {
    if (r.memberId !== memberId) continue;
    // sitRecords store .date (dateK) directly; fall back to .completedAt or .at for robustness
    const dk = r.date || (r.completedAt || r.at || '').slice(0, 10);
    if (dk && dk >= cutoff) count++;
  }
  return count;
}

function journalEvidenceCount(memberId, windowDays) {
  const days = windowDays || PATH_GATE.ROLLING_WINDOW_DAYS;
  let count = 0;
  const allKeywords = [];
  for (const k of Object.keys(HINDRANCE_EVIDENCE_KEYWORDS)) {
    allKeywords.push(...HINDRANCE_EVIDENCE_KEYWORDS[k]);
  }
  for (let i = 0; i < days; i++) {
    const dk = daysAgo(i);
    const entry = getMemberReflection(memberId, dk);
    if (!entry) continue;
    let text = '';
    if (entry.daily?.answer) text += ' ' + entry.daily.answer;
    if (entry.weekly?.answers) {
      const a = entry.weekly.answers;
      if (Array.isArray(a)) text += ' ' + a.join(' ');
      else if (typeof a === 'object') text += ' ' + Object.values(a).join(' ');
    }
    if (entry.monthly?.answers) {
      const a = entry.monthly.answers;
      if (Array.isArray(a)) text += ' ' + a.join(' ');
      else if (typeof a === 'object') text += ' ' + Object.values(a).join(' ');
    }
    if (!text.trim()) continue;
    const lc = text.toLowerCase();
    if (allKeywords.some(kw => lc.indexOf(kw) !== -1)) count++;
  }
  return count;
}

function tickKamacchanda(memberId, amount) {
  if (!memberId) return;
  const dk = todayKey();
  if (!state.diagnostics) state.diagnostics = {};
  if (!state.diagnostics.daily) state.diagnostics.daily = {};
  if (!state.diagnostics.daily[dk]) state.diagnostics.daily[dk] = {};
  if (!state.diagnostics.daily[dk][memberId]) {
    state.diagnostics.daily[dk][memberId] = { sensual: 0, illwill: 0, sloth: 0, restless: 0, doubt: 0, concentration: 5, at: new Date().toISOString() };
  }
  const day = state.diagnostics.daily[dk][memberId];
  day.sensual = Math.min(10, (day.sensual || 0) + amount);
  day.at = new Date().toISOString();
}
