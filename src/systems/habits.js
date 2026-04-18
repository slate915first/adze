// ============================================================================
// src/systems/habits.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 5 function(s): detectFreshSetback, showSetbackRecovery, dismissSetbackRecovery, recommitSmaller, saveHabit
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function detectFreshSetback() {
  if (!state.questActive || !state.members) return null;
  const dk = todayKey();
  for (const m of state.members) {
    for (const kh of getKeyHabits(m.id)) {
      const todayLog = state.log[dk]?.[m.id]?.[kh.id];
      // Only care about explicit skips today (false), not blank
      if (todayLog !== false) continue;
      const yesterday = daysAgo(1);
      const yesterdayStreak = countStreakEndingAt(m.id, kh.id, yesterday);
      if (yesterdayStreak >= 3) {
        const key = `${m.id}:${kh.id}:${dk}`;
        if (state.lastSetbackShown === key) continue;
        return { memberId: m.id, habit: kh, brokenStreak: yesterdayStreak };
      }
    }
  }
  return null;
}

function showSetbackRecovery(setback) {
  view.modal = { type: 'setback_recovery', setback };
  state.lastSetbackShown = `${setback.memberId}:${setback.habit.id}:${todayKey()}`;
  saveState();
  renderModal();
}

function dismissSetbackRecovery() {
  view.modal = null;
  renderModal();
}

function recommitSmaller() {
  if (!view.modal || view.modal.type !== 'setback_recovery') return;
  const setback = view.modal.setback;
  const habit = state.habits.find(h => h.id === setback.habit.id);
  if (habit && habit.slot) {
    const cur = habit.slot === 'morning' ? state.currentMorningMinutes : state.currentEveningMinutes;
    const halved = Math.max(5, Math.round((cur || 15) / 2 / 5) * 5);
    if (habit.slot === 'morning') state.currentMorningMinutes = halved;
    else if (habit.slot === 'evening') state.currentEveningMinutes = halved;
    habit.name = (habit.slot === 'morning' ? 'Morning sit' : 'Evening sit') + ` (${halved} min)`;
    habit.points = calculateSitPoints(halved);
    habit.miss = calculateSitMissPenalty(halved);
    saveState();
  }
  dismissSetbackRecovery();
  render();
}

function saveHabit() {
  const name = document.getElementById('h-name').value.trim();
  const icon = document.getElementById('h-icon').value || '⭐';
  const points = parseInt(document.getElementById('h-points').value) || 8;
  if (!name) return alert(t('alerts.enter_name'));
  const isKey = document.getElementById('h-key').checked;
  state.habits.push({
    id: uid(), name, icon, points,
    miss: isKey ? -Math.floor(points/2) : 0,
    key: isKey,
    who: document.getElementById('h-who').value,
    category: 'custom'
  });
  saveState(); closeModal(); render();
}
