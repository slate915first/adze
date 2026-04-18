// ============================================================================
// src/systems/sound.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 4 function(s): ensureAudioCtx, playBell, setBellSound, previewBellSound
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function ensureAudioCtx() {
  if (!_audioCtx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _audioCtx = new AC();
    } catch(e) { _audioCtx = null; }
  }
  return _audioCtx;
}

function playBell() {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e) {} }
  const variant = state?.prefs?.bellSound || 'warm';
  const fn = BELL_VARIANTS[variant]?.play || BELL_VARIANTS.warm.play;
  try { fn(ctx); } catch(e) { /* fail silently */ }
}

function setBellSound(variant) {
  if (!BELL_VARIANTS[variant]) return;
  if (!state.prefs) state.prefs = {};
  state.prefs.bellSound = variant;
  saveState();
  render();
}

function previewBellSound(variant) {
  const ctx = ensureAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e) {} }
  const fn = BELL_VARIANTS[variant]?.play;
  if (fn) { try { fn(ctx); } catch(e) {} }
}
