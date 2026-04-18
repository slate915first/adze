// ============================================================================
// src/systems/armies.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 6 function(s): isLayer2Available, ensureArmyEntry, engageWithArmy, releaseArmyEngagement, getArmyStatusDisplay, markArmyDefeated
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function isLayer2Available(memberId) {
  const p = ensurePathRecord(memberId);
  return (p.maxSustainedDays || 0) >= 1;
}

function ensureArmyEntry(memberId, armyId) {
  const p = ensurePathRecord(memberId);
  if (!p.armies[armyId]) {
    p.armies[armyId] = {
      status: 'dormant',
      engagedSince: null,
      consecutiveDays: 0,
      lastSeen: null
    };
  }
  return p.armies[armyId];
}

function engageWithArmy(memberId, armyId) {
  if (!isLayer2Available(memberId)) return false;
  const p = ensurePathRecord(memberId);
  // If there's an existing active engagement, release it back to dormant
  if (p.activeArmyEngagement && p.activeArmyEngagement !== armyId) {
    const prior = p.armies[p.activeArmyEngagement];
    if (prior) {
      prior.status = 'dormant';
      prior.engagedSince = null;
      prior.consecutiveDays = 0;
    }
  }
  const entry = ensureArmyEntry(memberId, armyId);
  entry.status = 'engaging';
  entry.engagedSince = new Date().toISOString();
  entry.consecutiveDays = 0;
  entry.lastSeen = todayKey();
  p.activeArmyEngagement = armyId;
  saveState();
  return true;
}

function releaseArmyEngagement(memberId) {
  const p = ensurePathRecord(memberId);
  if (!p.activeArmyEngagement) return;
  const entry = p.armies[p.activeArmyEngagement];
  if (entry) {
    entry.status = 'dormant';
    entry.lastSeen = todayKey();
  }
  p.activeArmyEngagement = null;
  saveState();
}

function getArmyStatusDisplay(status) {
  switch (status) {
    case 'engaging':
      return { label: 'engaging', color: 'text-amber-300', description: 'Active engagement — practice holds the army in view.' };
    case 'weakening':
      return { label: 'weakening', color: 'text-emerald-300', description: 'Seven or more consecutive days — the army is losing its grip.' };
    case 'quiet':
      return { label: 'quiet', color: 'text-emerald-400', description: 'Thirty or more days — the army has faded. It will return, but from further away.' };
    case 'dormant':
    default:
      return { label: 'dormant', color: 'text-amber-100/40', description: 'Not currently engaged.' };
  }
}

function markArmyDefeated(armyId) {
  if (!confirm('Confirm that you completed the 3-day challenge for this army? Be honest with yourself — Māra\'s eighth army is hypocrisy.')) return;
  defeatArmy(armyId);
}
