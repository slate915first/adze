// ============================================================================
// src/systems/wisdom.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 1 function(s): showWisdom
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function showWisdom(id) {
  view.modal = { type: 'wisdom', wisdomId: id };
  renderModal();
}
