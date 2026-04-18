// ============================================================================
// src/systems/scoring.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 10 function(s): dayScore, rangeScore, questScore, totalXP, maxDayScore, teamMaxDayScore, teamDayScore, getKeyHabits, streakForHabit, countStreakEndingAt
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function dayScore(memberId, dateK, opts) {
  const log = (state.log[dateK] && state.log[dateK][memberId]) || {};
  let pts = 0;
  for (const h of state.habits) {
    if (h.who === 'all' || h.who === memberId) {
      if (log[h.id] === true) pts += h.points;
      else if (log[h.id] === false && h.miss) pts += h.miss;
    }
  }
  // v8: Mahāpajāpatī's gift is now a LIVE-day rally, not a historical rewrite.
  // The multiplier only applies when scoring today, and only when the caller
  // hasn't asked us to skip it. This eliminates the v5-v7 circular dependency:
  // recalculateShadow now passes skipMultiplier when looping past days, so
  // dayScore no longer reads state.shadow during the recompute. The semantics
  // are also cleaner: when the team Shadow is high right now, today's score
  // gets boosted; past days are not retroactively rewritten.
  const isToday = dateK === todayKey();
  if (isToday && !(opts && opts.skipMultiplier)) {
    const mult = multiplyPassiveHook('teamScoreMultiplier', { teamShadow: state.shadow || 0 });
    if (mult !== 1) pts = Math.round(pts * mult);
  }
  return pts;
}

function rangeScore(memberId, days) {
  let total = 0;
  for (let i = 0; i < days; i++) total += dayScore(memberId, daysAgo(i));
  return total;
}

function questScore(memberId) {
  if (!state.questStartDate) return 0;
  let total = 0;
  const start = new Date(state.questStartDate);
  const today = new Date();
  for (let d = new Date(start); d <= today; d.setDate(d.getDate()+1)) {
    total += dayScore(memberId, d.toISOString().slice(0,10));
  }
  return total;
}

function totalXP(memberId) {
  return questScore(memberId) + (state.persistentXP[memberId] || 0);
}

function maxDayScore(memberId) {
  return state.habits
    .filter(h => h.who === 'all' || h.who === memberId)
    .reduce((s,h) => s + h.points, 0);
}

function teamMaxDayScore() {
  return state.members.reduce((s,m) => s + maxDayScore(m.id), 0);
}

function teamDayScore(dateK, opts) {
  return state.members.reduce((s,m) => s + dayScore(m.id, dateK, opts), 0);
}

function getKeyHabits(memberId) {
  return state.habits.filter(h => h.key && (h.who === 'all' || h.who === memberId));
}

function streakForHabit(memberId, habitId) {
  // v5: Upāli's gift — sumPassiveHook('streakGraceDaysPerWeek') returns the
  // number of missed days that may be forgiven within a rolling 7-day window
  // before the streak breaks. Returns 0 when no grace-granting character is
  // in the sangha, in which case the original v4_2 behavior is preserved
  // exactly: any explicit miss or any blank past day breaks the streak.
  const graceMax = sumPassiveHook('streakGraceDaysPerWeek');
  const missIdx = []; // indices (i values) of forgiven misses so far
  let s = 0;
  for (let i = 0; i < 365; i++) {
    const log = (state.log[daysAgo(i)] && state.log[daysAgo(i)][memberId]) || {};
    if (log[habitId] === true) {
      s++;
    } else if (log[habitId] === false) {
      // Explicit skip. Forgiveable if grace remains within the rolling 7 days.
      const recent = missIdx.filter(d => i - d <= 6).length;
      if (recent >= graceMax) break;
      missIdx.push(i);
      // streak survives but the missed day itself is not added to the count
    } else if (i > 0) {
      break; // blank past day still breaks (matches v4_2)
    } else {
      break; // blank today
    }
  }
  return s;
}

function countStreakEndingAt(memberId, habitId, endDateK) {
  let s = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(endDateK);
    d.setDate(d.getDate() - i);
    const dk = d.toISOString().slice(0, 10);
    const log = (state.log[dk] && state.log[dk][memberId]) || {};
    if (log[habitId] === true) s++;
    else break;
  }
  return s;
}
