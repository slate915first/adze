// ============================================================================
// src/systems/preferences.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 9 function(s): setTimerMode, setPointsVisible, dismissStagePreview, toggleHeaderTisikkha, toggleWisdomExpand, toggleSanghaExpand, toggleReviewCharts, engagePathArmy, releasePathArmyEngagement
// v15.19.4 — added setVisualIntensity() and a load-time IIFE that applies
// the saved theme to <html> before bootstrap renders. This module runs
// before state.js hydrates `state`, so the IIFE reads localStorage
// directly rather than going through getState(). Keeping the theme-apply
// here (instead of in bootstrap.js or main.js) preserves the rule that
// Stage-1 architecture files stay untouched for feature work.
// ============================================================================

// Apply saved theme as early as possible in the script load order so the
// first paint of app body content already matches the chosen theme. This
// runs after <link rel="stylesheet" href="theme-calm.css"> has parsed,
// so the attribute set here immediately activates the override tokens.
(function applySavedThemeFromStorage() {
  try {
    const raw = localStorage.getItem('adze_v1');
    if (!raw) return;
    const mode = JSON.parse(raw)?.prefs?.visualIntensity;
    if (mode === 'calm') {
      document.documentElement.setAttribute('data-theme', 'calm');
    }
  } catch (_) {
    /* Corrupted or absent state — leave classic theme. A bad read here
       must never block the app from booting. */
  }
})();

function setVisualIntensity(mode) {
  if (!['classic', 'calm'].includes(mode)) return;
  if (!state.prefs) state.prefs = {};
  state.prefs.visualIntensity = mode;
  if (mode === 'calm') {
    document.documentElement.setAttribute('data-theme', 'calm');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  saveState();
  render();
}

function setTimerMode(mode) {
  if (!['ask', 'always', 'never'].includes(mode)) return;
  if (!state.prefs) state.prefs = {};
  state.prefs.timerMode = mode;
  saveState();
  render();
}

function setPointsVisible(visible) {
  if (!state.prefs) state.prefs = {};
  state.prefs.pointsVisible = !!visible;
  saveState();
  render();
}

function dismissStagePreview() {
  state.dismissedStagePreview = state.currentStage;
  saveState();
  render();
}

function toggleHeaderTisikkha() {
  view.headerTisikkhaExpanded = !view.headerTisikkhaExpanded;
  render();
}

function toggleWisdomExpand(key) {
  if (!view.wisdomExpand) {
    view.wisdomExpand = { guidance: true, foundations: false, struggle: false, library: false, codex: false };
  }
  view.wisdomExpand[key] = !view.wisdomExpand[key];
  render();
}

function toggleSanghaExpand() {
  view.sanghaExpand = !view.sanghaExpand;
  render();
}

function toggleReviewCharts() {
  view.reviewChartsExpand = !view.reviewChartsExpand;
  render();
}

function engagePathArmy(armyId) {
  if (!view.modal || view.modal.type !== 'path_viewer') return;
  const mid = view.modal.memberId;
  if (!mid) return;
  const ok = engageWithArmy(mid, armyId);
  if (ok) renderModal();
}

function releasePathArmyEngagement() {
  if (!view.modal || view.modal.type !== 'path_viewer') return;
  const mid = view.modal.memberId;
  if (!mid) return;
  releaseArmyEngagement(mid);
  renderModal();
}
