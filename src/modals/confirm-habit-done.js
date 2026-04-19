// ============================================================================
// src/modals/confirm-habit-done.js
// ----------------------------------------------------------------------------
// Small confirmation sheet that appears when a non-meditation habit card is
// tapped on the Today screen. Meditation habits route through the sit-timer
// flow instead (handleHabitTap → openMeditationTimerForHabit / timer_prompt).
//
// Triggered by handleHabitTap in src/systems/habits-ui.js when:
//   - the habit is not already done (already-done taps un-mark immediately)
//   - the habit has no slot AND classifyMeditationHabit returns null
//
// Yes  → confirmHabitDoneYes() in habits-ui.js → toggleHabit(id, true)
// Cancel → confirmHabitDoneCancel() in habits-ui.js → close, no state change
//
// v15.13 — addresses Li May's "I clicked once and the task was just done —
// I wanted either a popup, or to confirm that I sat" tester feedback.
// ============================================================================

function renderConfirmHabitDoneModal(m) {
  const habit = (state.habits || []).find(h => h.id === m.habitId);
  if (!habit) {
    // Habit went away between tap and render; just close.
    view.modal = null;
    setTimeout(renderModal, 0);
    return '';
  }
  const name = escapeHtml(habit.name);
  const points = (typeof habit.points === 'number') ? habit.points : null;
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-3xl mb-1">🌱</div>
        <h2 class="text-lg font-bold gold-text">${t('confirm_habit_done.heading')}</h2>
        <p class="text-sm text-amber-100/85 mt-2 serif">${name}</p>
        ${points !== null ? `<p class="text-[11px] text-amber-300/70 mt-1">${t('confirm_habit_done.points_hint').replace('{n}', points)}</p>` : ''}
      </div>
      <p class="text-xs text-amber-100/70 italic text-center mb-4 leading-relaxed serif">
        ${t('confirm_habit_done.body')}
      </p>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="confirmHabitDoneCancel()">${t('confirm_habit_done.cancel_button')}</button>
        <button class="btn btn-gold" onclick="confirmHabitDoneYes()">${t('confirm_habit_done.confirm_button')}</button>
      </div>
    </div>
  `;
}
