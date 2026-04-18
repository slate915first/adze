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

// v15.4 — bell variants can specify EITHER a `play(ctx)` synth function
// (oscillator-based, kept as fallback) OR a `sample` path to a real
// recorded MP3. _playSampleBell uses an HTMLAudioElement so we don't
// have to decode through Web Audio (faster start, simpler error path).
// Cached per-variant so previewing isn't a fresh fetch each time.
const _bellAudioCache = {};
function _playSampleBell(samplePath) {
  let audio = _bellAudioCache[samplePath];
  if (!audio) {
    audio = new Audio(samplePath);
    audio.preload = 'auto';
    _bellAudioCache[samplePath] = audio;
  }
  try {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
  } catch (e) { /* fail silently */ }
}

function _playVariant(variant, fallback) {
  const v = BELL_VARIANTS[variant] || BELL_VARIANTS[fallback];
  if (!v) return;
  if (v.sample) {
    _playSampleBell(v.sample);
    return;
  }
  if (typeof v.play === 'function') {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e) {} }
    try { v.play(ctx); } catch (e) { /* fail silently */ }
  }
}

function playBell() {
  const variant = state?.prefs?.bellSound || 'warm';
  _playVariant(variant, 'warm');
}

function setBellSound(variant) {
  if (!BELL_VARIANTS[variant]) return;
  if (!state.prefs) state.prefs = {};
  state.prefs.bellSound = variant;
  saveState();
  render();
}

function previewBellSound(variant) {
  _playVariant(variant, variant);
}
