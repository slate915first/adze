// ============================================================================
// src/systems/trends.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 7 function(s): factorSeries, habitCompletionSeries, keyHabitCompletionRate, analyzeFactorTrend, isFactorPositiveDirection, trendVerdict, trendColor
// ============================================================================

function factorSeries(memberId, factorId, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dk = daysAgo(i);
    const row = state.diagnostics?.daily?.[dk]?.[memberId];
    if (row && typeof row[factorId] === 'number') {
      out.push({ date: dk, value: row[factorId] });
    }
  }
  return out;
}

function habitCompletionSeries(memberId, habitId, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const dk = daysAgo(i);
    const log = state.log?.[dk]?.[memberId] || {};
    let status = 'blank';
    if (log[habitId] === true) status = 'done';
    else if (log[habitId] === false) status = 'skipped';
    out.push({ date: dk, status });
  }
  return out;
}

function keyHabitCompletionRate(memberId, days) {
  const keyHabits = getKeyHabits(memberId);
  if (keyHabits.length === 0) return null;
  let possible = 0, done = 0;
  for (let i = 0; i < days; i++) {
    const dk = daysAgo(i);
    const log = state.log?.[dk]?.[memberId] || {};
    for (const h of keyHabits) {
      possible++;
      if (log[h.id] === true) done++;
    }
  }
  return possible === 0 ? null : done / possible;
}

function analyzeFactorTrend(memberId, factorId, days) {
  const series = factorSeries(memberId, factorId, days || 14);
  if (series.length < 3) return { direction: 'insufficient', magnitude: 0, n: series.length };
  const mid = Math.floor(series.length / 2);
  const firstAvg = series.slice(0, mid).reduce((s, d) => s + d.value, 0) / mid;
  const secondAvg = series.slice(mid).reduce((s, d) => s + d.value, 0) / (series.length - mid);
  const delta = secondAvg - firstAvg;
  let direction = 'stable';
  if (Math.abs(delta) >= 0.5) direction = delta > 0 ? 'up' : 'down';
  return { direction, magnitude: Math.abs(delta), first: firstAvg, second: secondAvg, n: series.length };
}

function isFactorPositiveDirection(factorId) {
  // Resource factors: higher = better
  return ['energy', 'purpose', 'sila', 'mettaWarmth', 'concentration'].includes(factorId);
}

function trendVerdict(factorId, direction) {
  if (direction === 'insufficient') return '—';
  if (direction === 'stable') return 'steady';
  const upIsGood = isFactorPositiveDirection(factorId);
  if (direction === 'up') return upIsGood ? 'rising' : 'rising';
  if (direction === 'down') return upIsGood ? 'falling' : 'easing';
  return '—';
}

function trendColor(factorId, direction) {
  if (direction === 'insufficient' || direction === 'stable') return '#d4a857';
  const upIsGood = isFactorPositiveDirection(factorId);
  const goodWay = (direction === 'up' && upIsGood) || (direction === 'down' && !upIsGood);
  return goodWay ? '#86efac' : '#fca5a5';
}
