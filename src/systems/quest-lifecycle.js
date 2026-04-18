// ============================================================================
// src/systems/quest-lifecycle.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 25 function(s): pauseQuest, resumeQuest, isQuestPaused, isDateInPausedWindow, checkStageProgress, consecutiveFullKeyDays, checkProgressiveBump, acceptBumpOffer, declineBumpOffer, countKeyMissesInWindow, checkCompassionateDowngrade, acceptDowngradeOffer, declineDowngradeOffer, grantExtraScrollsForStage, advanceStage, getCurrentStageArmies, defeatArmy, triggerVictory, triggerDefeat, restartQuest, openPauseModal, openResumeModal, setPauseReason, confirmPauseQuest, confirmResumeQuest
// ============================================================================

function pauseQuest(reason) {
  if (!state.questActive) return;
  if (state.questPaused) return;
  state.questPaused = {
    since: new Date().toISOString(),
    reason: reason || 'retreat'
  };
  if (!state.questPauses) state.questPauses = [];
  saveState();
  render();
}

function resumeQuest() {
  if (!state.questPaused) return;
  if (!state.questPauses) state.questPauses = [];
  state.questPauses.push({
    from: state.questPaused.since,
    to: new Date().toISOString(),
    reason: state.questPaused.reason || 'retreat'
  });
  state.questPaused = null;
  saveState();
  recalculateShadow();
  render();
}

function isQuestPaused() {
  return !!state.questPaused;
}

function isDateInPausedWindow(dk) {
  // Compare by date-key (YYYY-MM-DD) to avoid time-of-day off-by-one issues.
  // A day counts as paused if it is on or after the pause's start date and
  // (for historical pauses) on or before the resume date.
  if (state.questPaused) {
    const sinceDk = (state.questPaused.since || '').slice(0, 10);
    if (sinceDk && dk >= sinceDk) return true;
  }
  for (const p of (state.questPauses || [])) {
    const fromDk = (p.from || '').slice(0, 10);
    const toDk = (p.to || '').slice(0, 10);
    if (fromDk && toDk && dk >= fromDk && dk <= toDk) return true;
  }
  return false;
}

function checkStageProgress() {
  if (!state.questActive) return;
  const stage = STAGES[state.currentStage];
  if (!stage) return;

  // Count consecutive days where all team members did all key habits
  // since stage start
  if (!state.stageStartDate) state.stageStartDate = state.questStartDate;
  const start = new Date(state.stageStartDate);
  const today = new Date();
  let goodDays = 0;
  let totalDays = 0;

  for (let d = new Date(start); d <= today; d.setDate(d.getDate()+1)) {
    const dk = d.toISOString().slice(0,10);
    totalDays++;
    let allOk = true;
    for (const m of state.members) {
      for (const kh of getKeyHabits(m.id)) {
        const log = (state.log[dk] && state.log[dk][m.id]) || {};
        if (log[kh.id] !== true) { allOk = false; break; }
      }
      if (!allOk) break;
    }
    if (allOk) goodDays++;
  }

  state.keyHabitDaysAtStage = goodDays;

  // Stage advance condition
  if (goodDays >= stage.requiredKeyHabitDays && totalDays >= stage.minDays) {
    advanceStage();
  }

  // Progressive mode: check if we should offer a minute bump
  checkProgressiveBump();
  // v11: the compassionate counterpart — if the practice is being missed,
  // offer a gentle drop in minutes before Shadow escalates and discouragement
  // follows. Called on every habit toggle so it reacts quickly.
  checkCompassionateDowngrade();
}

function consecutiveFullKeyDays() {
  // Count backwards from today through each day where ALL key habits were done
  let count = 0;
  for (let i = 0; i < 365; i++) {
    const dk = daysAgo(i);
    let allDone = true;
    for (const m of state.members) {
      for (const kh of getKeyHabits(m.id)) {
        const log = (state.log[dk] && state.log[dk][m.id]) || {};
        if (log[kh.id] !== true) { allDone = false; break; }
      }
      if (!allDone) break;
    }
    if (allDone) count++;
    else break;
  }
  return count;
}

function checkProgressiveBump() {
  if (state.habitMode !== 'progressive') return;
  if (state.pendingBumpOffer) return;  // already have a pending offer
  if (!state.lastDeclinedBumpDate) state.lastDeclinedBumpDate = null;
  // Don't re-offer within 7 days of a decline
  if (state.lastDeclinedBumpDate) {
    const daysSince = daysBetween(state.lastDeclinedBumpDate, todayKey());
    if (daysSince < 7) return;
  }
  const streak = consecutiveFullKeyDays();
  if (streak < 7) return;

  // Build the offer: +5% per 7-day streak interval, minimum +5 min, rounded to 5
  // Cap each sit at 60 min. If already at 60, offer midday sit instead.
  const morn = state.currentMorningMinutes || 0;
  const eve = state.currentEveningMinutes || 0;
  const midday = state.currentMiddayMinutes || 0;

  // Decide what to bump and by how much
  const bumps = [];

  const bumpAmount = (cur) => {
    // 5% rounded up to nearest 5 min, minimum 5 min
    const raw = Math.max(5, Math.ceil(cur * 0.05 / 5) * 5);
    return Math.min(raw, 60 - cur);  // don't exceed 60
  };

  if (morn > 0 && morn < 60) {
    bumps.push({ slot: 'morning', from: morn, to: morn + bumpAmount(morn) });
  }
  if (eve > 0 && eve < 60) {
    bumps.push({ slot: 'evening', from: eve, to: eve + bumpAmount(eve) });
  }

  // If both morning and evening are at 60 and no midday exists, offer midday
  if (bumps.length === 0 && morn >= 60 && eve >= 60 && midday === 0) {
    bumps.push({ slot: 'midday', from: 0, to: 15, addMidday: true });
  }

  // If midday exists and isn't at 60, bump it
  if (bumps.length === 0 && midday > 0 && midday < 60) {
    bumps.push({ slot: 'midday', from: midday, to: midday + bumpAmount(midday) });
  }

  if (bumps.length === 0) return;  // fully maxed out

  state.pendingBumpOffer = {
    bumps,
    offeredDate: todayKey(),
    streak
  };
  saveState();
}

function acceptBumpOffer() {
  if (!state.pendingBumpOffer) return;
  const { bumps } = state.pendingBumpOffer;
  for (const b of bumps) {
    if (b.slot === 'morning') {
      state.currentMorningMinutes = b.to;
      const h = state.habits.find(x => x.slot === 'morning' && x.key);
      if (h) {
        h.name = `Morning sit (${b.to} min)`;
        h.points = calculateSitPoints(b.to);
        h.miss = calculateSitMissPenalty(b.to);
      }
    } else if (b.slot === 'evening') {
      state.currentEveningMinutes = b.to;
      const h = state.habits.find(x => x.slot === 'evening' && x.key);
      if (h) {
        h.name = `Evening sit (${b.to} min)`;
        h.points = calculateSitPoints(b.to);
        h.miss = calculateSitMissPenalty(b.to);
      }
    } else if (b.slot === 'midday') {
      state.currentMiddayMinutes = b.to;
      if (b.addMidday) {
        // Create a new midday sit habit
        state.habits.push({
          id: uid(),
          name: `Midday sit (${b.to} min)`,
          icon: '☀️',
          points: calculateSitPoints(b.to),
          miss: calculateSitMissPenalty(b.to),
          key: true,
          who: 'all',
          category: state.questCategory,
          slot: 'midday'
        });
      } else {
        const h = state.habits.find(x => x.slot === 'midday' && x.key);
        if (h) {
          h.name = `Midday sit (${b.to} min)`;
          h.points = calculateSitPoints(b.to);
          h.miss = calculateSitMissPenalty(b.to);
        }
      }
    }
  }
  state.pendingBumpOffer = null;
  saveState();
  recalculateShadow();
  render();
}

function declineBumpOffer() {
  state.lastDeclinedBumpDate = todayKey();
  state.pendingBumpOffer = null;
  saveState();
  render();
}

function countKeyMissesInWindow(memberId, windowDays) {
  if (!state.habits || !state.questActive) return 0;
  const keySits = state.habits.filter(h => h.key && (h.who === 'all' || h.who === memberId));
  if (keySits.length === 0) return 0;
  let misses = 0;
  for (let i = 0; i < windowDays; i++) {
    const dk = daysAgo(i);
    const log = (state.log[dk] && state.log[dk][memberId]) || {};
    for (const h of keySits) {
      if (log[h.id] !== true) misses++;
    }
  }
  return misses;
}

function checkCompassionateDowngrade() {
  if (!state.questActive) return;
  if (state.pendingBumpOffer) return;       // don't conflict with a pending bump
  if (state.pendingDowngradeOffer) return;  // already offered
  // Don't re-offer within 7 days of a decline
  if (state.lastDeclinedDowngradeDate) {
    const daysSince = daysBetween(state.lastDeclinedDowngradeDate, todayKey());
    if (daysSince < 7) return;
  }
  // Don't offer in the first 3 days of a quest — the practice hasn't had a chance
  if (state.questStartDate) {
    const daysIn = daysBetween(state.questStartDate, todayKey());
    if (daysIn < 3) return;
  }
  const memberId = view.currentMember || state.members?.[0]?.id;
  if (!memberId) return;

  const misses = countKeyMissesInWindow(memberId, DOWNGRADE_WINDOW_DAYS);
  if (misses < DOWNGRADE_MISS_THRESHOLD) return;

  const morn = state.currentMorningMinutes || 0;
  const eve = state.currentEveningMinutes || 0;
  const midday = state.currentMiddayMinutes || 0;

  const drops = [];
  const dropTo = (cur) => {
    if (cur <= DOWNGRADE_MIN_MINUTES) return null;
    return Math.max(DOWNGRADE_MIN_MINUTES, Math.round(cur * DOWNGRADE_FACTOR / 5) * 5 || DOWNGRADE_MIN_MINUTES);
  };
  if (morn > DOWNGRADE_MIN_MINUTES) {
    const to = dropTo(morn);
    if (to != null && to < morn) drops.push({ slot: 'morning', from: morn, to });
  }
  if (eve > DOWNGRADE_MIN_MINUTES) {
    const to = dropTo(eve);
    if (to != null && to < eve) drops.push({ slot: 'evening', from: eve, to });
  }
  if (midday > 0) {
    // Offer to remove the midday sit entirely rather than shrink it
    drops.push({ slot: 'midday', from: midday, to: 0, removeMidday: true });
  }

  if (drops.length === 0) return;  // already at the floor

  state.pendingDowngradeOffer = {
    drops,
    misses,
    windowDays: DOWNGRADE_WINDOW_DAYS,
    offeredDate: todayKey()
  };
  saveState();
}

function acceptDowngradeOffer() {
  if (!state.pendingDowngradeOffer) return;
  const { drops } = state.pendingDowngradeOffer;
  for (const d of drops) {
    if (d.slot === 'morning') {
      state.currentMorningMinutes = d.to;
      const h = state.habits.find(x => x.slot === 'morning' && x.key);
      if (h) {
        h.name = `Morning sit (${d.to} min)`;
        h.points = calculateSitPoints(d.to);
        h.miss = calculateSitMissPenalty(d.to);
      }
    } else if (d.slot === 'evening') {
      state.currentEveningMinutes = d.to;
      const h = state.habits.find(x => x.slot === 'evening' && x.key);
      if (h) {
        h.name = `Evening sit (${d.to} min)`;
        h.points = calculateSitPoints(d.to);
        h.miss = calculateSitMissPenalty(d.to);
      }
    } else if (d.slot === 'midday' && d.removeMidday) {
      state.currentMiddayMinutes = 0;
      state.habits = state.habits.filter(x => !(x.slot === 'midday' && x.key));
    }
  }
  state.pendingDowngradeOffer = null;
  saveState();
  recalculateShadow();
  render();
}

function declineDowngradeOffer() {
  state.lastDeclinedDowngradeDate = todayKey();
  state.pendingDowngradeOffer = null;
  saveState();
  render();
}

function grantExtraScrollsForStage() {
  const extra = sumPassiveHook('extraScrollsPerStage');
  if (extra <= 0) return [];
  const granted = [];
  // Pick scrolls the player hasn't yet collected
  const uncollected = WISDOM_SCROLLS.filter(w => !state.wisdomCollected.includes(w.id));
  for (let i = 0; i < extra && i < uncollected.length; i++) {
    state.wisdomCollected.push(uncollected[i].id);
    granted.push(uncollected[i].id);
  }
  return granted;
}

function advanceStage() {
  // v5: Ānanda's extra scroll(s) — granted before the stage modal so the
  // wisdomCollected total reflects the gift when shown. No-op when Ānanda
  // is not in the sangha.
  grantExtraScrollsForStage();
  const oldStage = state.currentStage;
  state.currentStage++;
  state.stageStartDate = todayKey();
  state.keyHabitDaysAtStage = 0;

  // Unlock wisdom for completed stage
  const newScrolls = WISDOM_SCROLLS.filter(w => w.stage === oldStage && !state.wisdomCollected.includes(w.id));
  newScrolls.forEach(w => state.wisdomCollected.push(w.id));

  saveState();

  // Check victory
  if (state.currentStage >= STAGES.length) {
    triggerVictory();
    return;
  }

  // Show stage advance modal
  view.modal = { type: 'stage_advance', oldStage, newScrolls };
  renderModal();
}

function getCurrentStageArmies() {
  const stage = STAGES[state.currentStage];
  if (!stage) return [];
  return stage.armies.map(id => MARA_ARMIES.find(a => a.id === id)).filter(Boolean);
}

function defeatArmy(armyId) {
  if (state.defeatedArmies.includes(armyId)) return;
  state.defeatedArmies.push(armyId);
  state.shadow = Math.max(shadowFloorForTeam(), state.shadow - 8);
  saveState();
  view.modal = { type: 'army_defeated', armyId };
  renderModal();
}

function triggerVictory() {
  // Bank XP into persistent
  for (const m of state.members) {
    state.persistentXP[m.id] = (state.persistentXP[m.id] || 0) + questScore(m.id);
  }
  state.questActive = false;
  saveState();
  view.modal = { type: 'victory' };
  renderModal();
}

function triggerDefeat() {
  view.modal = { type: 'defeat' };
  renderModal();
}

function restartQuest() {
  // Per user spec: strict restart wipes stage progress, but per the mercy
  // discussion, persistent XP and wisdom collected are kept.
  // Bank a small portion of quest XP into persistent (the lessons remain)
  for (const m of state.members) {
    state.persistentXP[m.id] = (state.persistentXP[m.id] || 0) + Math.floor(questScore(m.id) * 0.3);
  }
  state.questActive = true;
  state.questStartDate = todayKey();
  state.stageStartDate = todayKey();
  state.currentStage = 0;
  state.keyHabitDaysAtStage = 0;
  state.defeatedArmies = [];
  state.shadow = SHADOW_FLOOR_BY_RANK[0]; // v9.8: floor on quest restart
  state.questAttempts = (state.questAttempts || 0) + 1;
  // Clear quest-specific log
  state.log = {};
  saveState();
  view.modal = null;
  view.tab = 'today';
  render();
}

function openPauseModal() {
  view.modal = { type: 'pause_quest', reason: 'retreat' };
  renderModal();
}

function openResumeModal() {
  view.modal = { type: 'resume_quest' };
  renderModal();
}

function setPauseReason(r) {
  if (view.modal && view.modal.type === 'pause_quest') {
    view.modal.reason = r;
    renderModal();
  }
}

function confirmPauseQuest() {
  const r = (view.modal && view.modal.reason) || 'retreat';
  closeModal();
  pauseQuest(r);
}

function confirmResumeQuest() {
  closeModal();
  resumeQuest();
}
