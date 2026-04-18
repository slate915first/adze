// ============================================================================
// src/systems/export-import.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 2 function(s): exportUserData, importUserData
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function exportUserData() {
  if (!state) { alert(t('alerts.no_data_to_export')); return; }
  const payload = {
    _meta: {
      app: 'Habit Quest',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      storageKey: STORAGE_KEY
    },
    state
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `habit-quest-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importUserData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const incoming = parsed.state || parsed; // accept either {_meta, state} or raw state
        if (!incoming.members && !incoming.habits) {
          alert('That file doesn\'t look like a Habit Quest export.');
          return;
        }
        const ok = confirm(
          'Import this Habit Quest data?\n\n' +
          'This will REPLACE your current data with the contents of the file. ' +
          'Your current quest, members, log, reflections, and diagnostics will be lost.\n\n' +
          'Tip: export your current data first if you want to keep it.'
        );
        if (!ok) return;
        state = migrateState(incoming);
        saveState();
        view.currentMember = state.members?.[0]?.id || null;
        recalculateShadow();
        view.modal = null;
        render();
        alert(t('alerts.import_complete'));
      } catch (err) {
        alert('Could not read that file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
