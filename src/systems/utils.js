// ============================================================================
// src/systems/utils.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 5 function(s): uid, todayKey, daysAgo, daysBetween, todayKeyOffset
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

function todayKey() { return new Date().toISOString().slice(0,10); }

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }

function daysBetween(a, b) {
  const d1 = new Date(a), d2 = new Date(b);
  return Math.floor((d2-d1)/(1000*60*60*24));
}

function todayKeyOffset(deltaDays) {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

// v15.14 — small clipboard utility shared by quote-collection actions and
// element-feedback. Uses navigator.clipboard.writeText where available, falls
// back to a hidden textarea + execCommand('copy') for older browsers and
// non-secure-context edge cases. iOS Safari requires a user gesture to write
// to the clipboard — call this from a click/tap handler, not from a timer.
function copyToClipboard(text) {
  const str = String(text == null ? '' : text);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(str).catch(() => _copyToClipboardFallback(str));
    return;
  }
  _copyToClipboardFallback(str);
}

function _copyToClipboardFallback(str) {
  try {
    const ta = document.createElement('textarea');
    ta.value = str;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch (e) { /* fail silently — UX is the surrounding toast */ }
}
