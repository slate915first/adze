// ============================================================================
// src/systems/preferences.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 9 function(s): setTimerMode, setPointsVisible, dismissStagePreview, toggleHeaderTisikkha, toggleWisdomExpand, toggleSanghaExpand, toggleReviewCharts, engagePathArmy, releasePathArmyEngagement
// ============================================================================

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
