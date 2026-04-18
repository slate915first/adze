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
