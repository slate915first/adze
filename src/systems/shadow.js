// ============================================================================
// src/systems/shadow.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 1 function(s): updateShadowVisual
// ============================================================================

function updateShadowVisual() {
  document.documentElement.style.setProperty('--shadow-level', (state.shadow/100).toFixed(2));
}
