// ============================================================================
// render/habit-manager.js
// ----------------------------------------------------------------------------
// The Habits configuration screen (reached from Settings → "Manage habits").
// Shows the current list of habits, with member attribution, key-habit badge,
// and per-item delete. The Habits tab is not in the primary nav — it's a
// configuration surface, not a daily-use one. (v10.0 removed it from nav.)
//
// Three functions, tightly coupled:
//
//   renderHabitManager()   The tab body. Lists habits with icon, name,
//                          KEY badge if applicable, points, miss penalty,
//                          who (member name or "Everyone"), and a delete
//                          button. Plus an advice card when a quest is
//                          active reminding the practitioner that adding
//                          too many habits is the most common failure
//                          mode of habit systems.
//
//   openAddHabit()         Opens the addHabit modal. Trivial wrapper.
//
//   deleteHabit(id)        Delete a habit with confirm. Refuses to delete
//                          the KEY habit during an active quest — the key
//                          habit is the foundation of the path, and losing
//                          it mid-quest would orphan all the quest's
//                          progress calculations.
//
// Dependencies (all read from global scope):
//   State:     state (habits, members, questActive)
//   Engine:    t() from engine/i18n.js
//   Helpers:   saveState, render, renderModal
//
// The "Habit Manager" phrase deliberately lives in t() keys rather than
// verbatim in the render — translators can adapt "Manager" to a less
// corporate word if the target language has better options (most do).
// ============================================================================

// ============================================================================
// HABITS TAB - manager (custom mode + adding extras)
// ============================================================================

function renderHabitManager() {
  return `
    <div class="parchment rounded-xl p-4 mb-4 flex justify-between items-center">
      <div>
        <h3 class="font-bold text-amber-100">${t('habit_manager.heading')}</h3>
        <p class="text-xs text-amber-100/60">${t('habit_manager.count', {n: state.habits.length})}</p>
      </div>
      <button class="btn btn-gold text-sm" onclick="openAddHabit()">${t('habit_manager.add_button')}</button>
    </div>
    <div class="space-y-2">
      ${state.habits.map(h => {
        const member = h.who === 'all' ? t('habit_manager.everyone') : (state.members.find(m=>m.id===h.who)?.name || t('habit_manager.unknown_member'));
        const missSuffix = h.miss ? t('habit_manager.miss_suffix', {miss: h.miss}) : '';
        return `
          <div class="parchment rounded-lg p-3 flex items-center gap-3">
            <div class="text-2xl">${h.icon}</div>
            <div class="flex-1 min-w-0">
              <div class="font-medium text-amber-100">${h.name} ${h.key?`<span class="text-xs bg-amber-700/30 text-amber-300 px-1.5 py-0.5 rounded ml-1">${t('habit_manager.key_badge')}</span>`:''}</div>
              <div class="text-xs text-amber-100/60">${t('habit_manager.habit_meta', {points: h.points, missSuffix, member})}</div>
            </div>
            <button onclick="deleteHabit('${h.id}')" class="text-amber-100/40 hover:text-red-400 text-sm">${t('habit_manager.delete_button')}</button>
          </div>
        `;
      }).join('') || `<div class="parchment rounded-xl p-6 text-center text-amber-100/60">${t('habit_manager.no_habits')}</div>`}
    </div>
    ${state.questActive ? `
    <div class="parchment rounded-xl p-4 mt-4">
      <p class="text-xs text-amber-100/70">${t('habit_manager.advice')}</p>
    </div>
    ` : ''}
  `;
}

function openAddHabit() {
  view.modal = { type: 'addHabit' };
  renderModal();
}

function deleteHabit(id) {
  const h = state.habits.find(x=>x.id===id);
  if (h?.key && state.questActive) {
    return alert(t('habit_manager.key_locked_alert'));
  }
  if (!confirm(t('habit_manager.delete_confirm'))) return;
  state.habits = state.habits.filter(x => x.id !== id);
  saveState(); render();
}
