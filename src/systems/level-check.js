// ============================================================================
// src/systems/level-check.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 1 function(s): isLevelAtLeast
// ============================================================================

function isLevelAtLeast(level) {
  const order = ['sotapatti', 'sakadagami', 'anagami', 'arahant', 'custom'];
  const current = state.difficultyPath;
  if (!current) return false;
  const cur = order.indexOf(current);
  const req = order.indexOf(level);
  if (cur < 0 || req < 0) return false;
  return cur >= req;
}
