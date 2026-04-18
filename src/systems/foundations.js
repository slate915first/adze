// ============================================================================
// src/systems/foundations.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 3 function(s): openFoundations, openFoundationsBranch, openFoundationsTruth
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function openFoundations() {
  state.seenFoundations = true;
  saveState();
  view.modal = { type: 'foundations', view: 'overview' };
  renderModal();
}

function openFoundationsBranch(branchId) {
  view.modal = { type: 'foundations', view: 'branch', branchId };
  renderModal();
}

function openFoundationsTruth(truthId) {
  view.modal = { type: 'foundations', view: 'truth', truthId };
  renderModal();
}
