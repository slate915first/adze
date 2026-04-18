// ============================================================================
// src/systems/guided-flow.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 3 function(s): isWeeklySummaryDue, openGuidedFlow, openTechniqueTeaching
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function isWeeklySummaryDue() {
  if (!state.questActive) return false;
  if (daysSinceReflectionStart() < 6) return false;  // need at least a week of data
  if (!state.lastWeeklySummaryViewed) return true;
  const last = new Date(state.lastWeeklySummaryViewed);
  const now = new Date();
  const diff = Math.floor((now - last) / (1000*60*60*24));
  return diff >= 7;
}

function openGuidedFlow(flowId, step) {
  const flow = GUIDED_FLOWS[flowId];
  if (!flow) { console.warn('Unknown flow:', flowId); return; }
  if (flowId === 'basic_meditation') {
    state.tutorialOpened = true;
    saveState();
  }
  view.modal = { type: 'guided_flow', flowId, step: step || 0 };
  renderModal();
}

function openTechniqueTeaching(key) {
  view.modal = { type: 'technique_teaching', key };
  renderModal();
}
