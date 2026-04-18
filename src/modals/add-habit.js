// ============================================================================
// src/modals/add-habit.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch. Branch type: 'addHabit'.
// The dispatch now calls renderAddHabitModal(m). All strings resolve via t().
// ============================================================================

function renderAddHabitModal(m) {
  let content = '';

    content = `
      <h2 class="text-2xl font-bold gold-text mb-4">${t('add_habit.heading')}</h2>
      <div class="space-y-3">
        <div><label class="text-xs text-amber-300/70">${t('add_habit.name_label')}</label><input id="h-name" placeholder=t('add_habit.name_placeholder')></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs text-amber-300/70">${t('add_habit.icon_label')}</label><input id="h-icon" placeholder="📖" maxlength="2"></div>
          <div><label class="text-xs text-amber-300/70">${t('add_habit.points_label')}</label><input id="h-points" type="number" min="1" max="25" value="8"></div>
        </div>
        <div><label class="text-xs text-amber-300/70">${t('add_habit.who_label')}</label>
          <select id="h-who"><option value="all">${t('add_habit.who_everyone')}</option>${state.members.map(m => `<option value="${m.id}">${t('add_habit.who_member_only', {name: m.name})}</option>`).join('')}</select>
        </div>
        <label class="flex items-center gap-2 text-sm text-amber-100"><input type="checkbox" id="h-key"> ${t('add_habit.key_checkbox')}</label>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button class="btn btn-ghost" onclick="closeModal()">${t('oneline_journal.cancel_button')}</button>
        <button class="btn btn-gold" onclick="saveHabit()">${t('add_habit.add_button')}</button>
      </div>
    `;

  return content;
}
