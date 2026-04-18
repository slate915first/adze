// ============================================================================
// src/systems/habits-ui.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 9 function(s): handleHabitTap, timerPromptUseTimer, timerPromptSkipTimer, timerPromptCancel, isWalkingMeditationHabit, isMettaHabit, classifyMeditationHabit, toggleHabit, showFloat
// ============================================================================

function handleHabitTap(habitId) {
  const h = state.habits.find(x => x.id === habitId);
  if (!h) return;
  // Already done? Tapping toggles it off (matches v8 behavior).
  const dk = todayKey();
  const cur = state.log[dk]?.[view.currentMember]?.[habitId];
  if (cur === true) {
    toggleHabit(habitId, true); // this will delete the entry (v8 toggle behavior)
    return;
  }
  // Non-sit habits always go straight to toggle.
  if (!h.slot) {
    toggleHabit(habitId, true);
    return;
  }
  // Sit habit — check prefs.
  const mode = state.prefs?.timerMode || 'ask';
  if (mode === 'never') {
    toggleHabit(habitId, true);
    return;
  }
  if (mode === 'always') {
    openMeditationTimerForHabit(habitId);
    return;
  }
  // mode === 'ask' — show the prompt modal.
  view.modal = { type: 'timer_prompt', habitId };
  renderModal();
}

function timerPromptUseTimer(rememberChoice, flavor) {
  const habitId = view.modal?.habitId;
  if (!habitId) return;
  if (rememberChoice) {
    state.prefs.timerMode = 'always';
    saveState();
  }
  openMeditationTimerForHabit(habitId, flavor || 'breath');
}

function timerPromptSkipTimer(rememberChoice) {
  const habitId = view.modal?.habitId;
  if (!habitId) return;
  if (rememberChoice) {
    state.prefs.timerMode = 'never';
    saveState();
  }
  view.modal = null;
  renderModal();
  toggleHabit(habitId, true);
}

function timerPromptCancel() {
  view.modal = null;
  renderModal();
}

function isWalkingMeditationHabit(habit) {
  if (!habit || !habit.name) return false;
  const n = habit.name.toLowerCase();
  return /walk|cankama|gehmedit/.test(n);
}

function isMettaHabit(habit) {
  if (!habit || !habit.name) return false;
  const n = habit.name.toLowerCase();
  return /metta|mettā|loving.?kind|brahmavih/.test(n);
}

function classifyMeditationHabit(habit) {
  if (!habit || !habit.name) return null;
  const n = habit.name.toLowerCase();
  if (isWalkingMeditationHabit(habit)) return 'walking';
  if (isMettaHabit(habit)) return 'metta';
  if (/sit|meditat|breath|ānāpāna|anapana/.test(n)) return 'sit';
  return null;
}

function toggleHabit(habitId, status) {
  const dk = todayKey();
  if (!state.log[dk]) state.log[dk] = {};
  if (!state.log[dk][view.currentMember]) state.log[dk][view.currentMember] = {};
  const cur = state.log[dk][view.currentMember][habitId];
  if (cur === status) {
    delete state.log[dk][view.currentMember][habitId];
  } else {
    state.log[dk][view.currentMember][habitId] = status;
    if (status === true) {
      const h = state.habits.find(x => x.id === habitId);
      if (h) {
        // v11.1 — only show the +points float animation if points are visible
        if (state.prefs?.pointsVisible !== false) {
          showFloat(habitId, '+' + h.points);
        } else {
          // Contemplative mode — a quiet glyph instead of a number
          showFloat(habitId, '🪷');
        }
        // v10.1: walking meditation earns tisikkhā when marked done
        if (isWalkingMeditationHabit(h) && view.currentMember) {
          earnTisikkha(view.currentMember, 'walking_meditation');
        }
      }
    }
  }
  saveState();
  recalculateShadow();
  checkStageProgress();
  // Check for defeat
  if (state.shadow >= 100 && state.questActive) {
    triggerDefeat();
  }
  render();
}

function showFloat(habitId, text) {
  const el = document.querySelector(`[data-habit="${habitId}"] .pts`);
  if (!el) return;
  const f = document.createElement('div');
  f.className = 'float-up absolute right-0 text-amber-300 font-bold text-2xl pointer-events-none';
  f.textContent = text;
  el.style.position = 'relative';
  el.appendChild(f);
  setTimeout(() => f.remove(), 1800);
}
