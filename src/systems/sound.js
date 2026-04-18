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
  // v15.5 — special-case 'custom': the user uploaded their own bell.
  // Stored as a data URL in state.prefs.customBellDataUrl. Falls back to
  // `fallback` if the custom variant is selected but no data URL is set.
  if (variant === 'custom' && state?.prefs?.customBellDataUrl) {
    _playSampleBell(state.prefs.customBellDataUrl);
    return;
  }
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

// ============================================================================
// v15.5 — Custom user-uploaded bell.
// ----------------------------------------------------------------------------
// Constraints (also enforced in the UI):
//   - Type: anything starting with audio/ (or .mp3/.wav/.ogg/.m4a/.aac).
//   - Size: 500 KB max — base64-encoded blob bloats by ~33%, so this keeps
//     the encrypted user_state row reasonable for sync.
//   - Duration: 60s max — meditation bells don't need to be longer.
//   - Storage: data URL on state.prefs.customBellDataUrl, plus the original
//     filename + duration for display. Synced (encrypted) along with the
//     rest of state.
//
// Security notes:
//   - The file never leaves the user's browser — no upload, no server.
//   - The data URL is played via HTMLAudioElement; modern decoders are
//     sandboxed, so a malformed file just won't play.
//   - CSP includes media-src 'self' data: blob: so data: URLs work.
//   - The filename is escaped before being shown in Settings (no XSS).
// ============================================================================

const CUSTOM_BELL_MAX_BYTES = 500 * 1024;       // 500 KB
const CUSTOM_BELL_MAX_DURATION_SEC = 60;
const CUSTOM_BELL_AUDIO_EXT_RE = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;

async function setCustomBell(file) {
  if (!file) throw new Error('No file selected.');

  // Type check — prefer MIME, fall back to extension.
  const mimeOk = typeof file.type === 'string' && file.type.startsWith('audio/');
  const extOk  = CUSTOM_BELL_AUDIO_EXT_RE.test(file.name || '');
  if (!mimeOk && !extOk) {
    throw new Error('That file does not look like an audio file. Try .mp3, .wav, .ogg, .m4a, or .aac.');
  }

  // Size check.
  if (file.size > CUSTOM_BELL_MAX_BYTES) {
    const kb = Math.round(file.size / 1024);
    throw new Error(`File is ${kb} KB. Max 500 KB — trim or re-encode at a lower bitrate.`);
  }

  // Read as data URL.
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

  // Duration check — load metadata via a temporary Audio element.
  const duration = await new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error('Could not decode the audio. Check the format.'));
    audio.src = dataUrl;
  });
  if (!isFinite(duration) || duration <= 0) {
    throw new Error('Could not determine the audio duration.');
  }
  if (duration > CUSTOM_BELL_MAX_DURATION_SEC) {
    throw new Error(`Audio is ${Math.round(duration)} s. Max ${CUSTOM_BELL_MAX_DURATION_SEC} s — trim before uploading.`);
  }

  // Persist to state. Sanitized filename (kept for display; never executed).
  if (!state.prefs) state.prefs = {};
  state.prefs.customBellDataUrl = dataUrl;
  state.prefs.customBellName = String(file.name || 'custom').slice(0, 80);
  state.prefs.customBellDurationSec = Math.round(duration * 10) / 10;
  state.prefs.bellSound = 'custom';                  // auto-select on upload
  saveState();
  // Drop the cached HTMLAudioElement for 'custom' so the new upload plays
  // from the new data URL on next preview rather than the old one.
  delete _bellAudioCache[dataUrl];
  render();
}

function clearCustomBell() {
  if (!state.prefs) return;
  delete state.prefs.customBellDataUrl;
  delete state.prefs.customBellName;
  delete state.prefs.customBellDurationSec;
  if (state.prefs.bellSound === 'custom') state.prefs.bellSound = 'warm';
  saveState();
  render();
}

// Triggered by the Settings UI's hidden <input type="file"> change event.
async function handleCustomBellPicked(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  try {
    await setCustomBell(file);
  } catch (e) {
    alert(e && e.message ? e.message : String(e));
  } finally {
    // Clear the input so picking the same file again still triggers change.
    try { input.value = ''; } catch (_) {}
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
