// ============================================================================
// src/systems/shadow.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 1 function(s): updateShadowVisual
// v15.20.2 — updateShadowVisual now also sets/removes the
// data-shadow-critical attribute on <html> when state.shadow crosses
// the 50 threshold. This is the game-designer pre-ship guard for
// Variant C (Calm redesign): at high shadow, Calm's shadow-sentence
// shifts from quiet-italic to body-upright via the CSS rule
// :root[data-shadow-critical="true"] .shadow-sentence. Closes the
// residual Casino Sober Mode vector (diagnostic resolution preserved
// exactly at the point where precision matters). On Classic the
// attribute is set the same way but has no CSS target — inert.
// ============================================================================

function updateShadowVisual() {
  const shadow = state.shadow || 0;
  document.documentElement.style.setProperty('--shadow-level', (shadow / 100).toFixed(2));
  if (shadow > 50) {
    document.documentElement.setAttribute('data-shadow-critical', 'true');
  } else {
    document.documentElement.removeAttribute('data-shadow-critical');
  }
}
