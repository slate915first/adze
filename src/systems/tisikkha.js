// ============================================================================
// src/systems/tisikkha.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 4 function(s): getTisikkha, earnTisikkha, applyTisikkhaDecay, spendPanna
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function getTisikkha(memberId) {
  const p = ensurePathRecord(memberId);
  return p.tisikkha;
}

function earnTisikkha(memberId, actionKey) {
  if (!memberId) return null;
  const earn = TISIKKHA_EARN[actionKey];
  if (!earn) return null;
  const t = getTisikkha(memberId);
  t.sila += earn.sila;
  t.samadhi += earn.samadhi;
  t.panna += earn.panna;        t.pannaTotal += earn.panna;
  return { ...earn };
}

function applyTisikkhaDecay(memberId) {
  if (!memberId) return;
  const t = getTisikkha(memberId);
  const last = t.lastDecayCheck || todayKey();
  const days = daysBetween(last, todayKey());
  if (days < TISIKKHA_DECAY_DAYS) return;
  // Apply N rounds of decay (one round per full 7 days)
  const rounds = Math.floor(days / TISIKKHA_DECAY_DAYS);
  for (let i = 0; i < rounds; i++) {
    t.sila = Math.max(0, t.sila - TISIKKHA_DECAY_AMOUNT);
    t.samadhi = Math.max(0, t.samadhi - TISIKKHA_DECAY_AMOUNT);
    t.panna = Math.max(0, t.panna - TISIKKHA_DECAY_AMOUNT);
  }
  // Move the marker forward by the rounds applied (preserve any partial week)
  t.lastDecayCheck = todayKeyOffset(-(days % TISIKKHA_DECAY_DAYS));
}

function spendPanna(memberId, amount) {
  const t = getTisikkha(memberId);
  if (t.panna < amount) return false;
  t.panna -= amount;
  return true;
}
