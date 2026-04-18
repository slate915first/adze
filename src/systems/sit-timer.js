// ============================================================================
// src/systems/sit-timer.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 18 function(s): captureSitIntention, getTodayIntention, startSitTimer, _sitTimerTick, pauseSitTimer, resumeSitTimer, stopSitTimer, endSitEarly, formatSitTime, sitTimerComplete, finalizeSit, openMeditationTimerForHabit, meditationTimerPickDuration, meditationTimerToPre, meditationTimerBackToSelect, meditationTimerToggleChip, toggleMeditationTimerChips, meditationTimerBegin
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function captureSitIntention(memberId) {
  if (!memberId) return;
  if (!state.todayIntention) state.todayIntention = {};
  if (!state.todayIntention[memberId]) state.todayIntention[memberId] = {};
  const dk = todayKey();
  // Don't overwrite if already set today — first sit's intention is the day's
  if (state.todayIntention[memberId][dk]) return;
  const focus = getFocusForNow(memberId);
  const top = topTwoHindrances(memberId);
  const dom = top[0] ? top[0].id : null;
  state.todayIntention[memberId][dk] = {
    cultivate: focus && focus.title ? focus.title.replace(/^(Let go of: |Cultivate: |Deepen: )/, '') : 'sati',
    cultivateMode: focus ? focus.mode : 'cultivate',
    observe: dom,
    setAt: new Date().toISOString()
  };
  saveState();
}

function getTodayIntention(memberId) {
  if (!memberId) return null;
  const dk = todayKey();
  return state.todayIntention?.[memberId]?.[dk] || null;
}

function startSitTimer(durationSec) {
  stopSitTimer();
  // v9.11 Turn B: capture the pre-sit intention at start of timer
  if (view.currentMember) captureSitIntention(view.currentMember);
  _sitTimer.startTime = Date.now();
  _sitTimer.durationSec = durationSec;
  _sitTimer.pausedAt = 0;
  _sitTimer.totalPausedMs = 0;
  _sitTimer.halfwayBellRung = false;
  playBell(); // opening bell
  _sitTimer.intervalId = setInterval(_sitTimerTick, 250);
}

function _sitTimerTick() {
  const now = Date.now();
  const elapsedMs = (now - _sitTimer.startTime) - _sitTimer.totalPausedMs;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const remainingSec = Math.max(0, _sitTimer.durationSec - elapsedSec);
  const display = document.getElementById('sit-timer-display');
  if (display) display.textContent = formatSitTime(remainingSec);
  // halfway bell
  if (!_sitTimer.halfwayBellRung && elapsedSec >= Math.floor(_sitTimer.durationSec / 2)) {
    _sitTimer.halfwayBellRung = true;
    playBell();
  }
  // closing bell + transition to post-sit
  if (remainingSec === 0) {
    stopSitTimer();
    playBell();
    setTimeout(() => sitTimerComplete(), 800);
  }
}

function pauseSitTimer() {
  if (!_sitTimer.intervalId) return;
  clearInterval(_sitTimer.intervalId);
  _sitTimer.intervalId = null;
  _sitTimer.pausedAt = Date.now();
  const btn = document.getElementById('sit-pause-btn');
  if (btn) { btn.textContent = '▶ Resume'; btn.setAttribute('onclick', 'resumeSitTimer()'); }
}

function resumeSitTimer() {
  if (_sitTimer.intervalId) return;
  if (_sitTimer.pausedAt > 0) {
    _sitTimer.totalPausedMs += Date.now() - _sitTimer.pausedAt;
    _sitTimer.pausedAt = 0;
  }
  _sitTimer.intervalId = setInterval(_sitTimerTick, 250);
  const btn = document.getElementById('sit-pause-btn');
  if (btn) { btn.textContent = '⏸ Pause'; btn.setAttribute('onclick', 'pauseSitTimer()'); }
}

function stopSitTimer() {
  if (_sitTimer.intervalId) {
    clearInterval(_sitTimer.intervalId);
    _sitTimer.intervalId = null;
  }
}

function endSitEarly() {
  // Treat early end as a partial sit — record what was completed, transition to post.
  if (_sitTimer.intervalId || _sitTimer.startTime > 0) {
    stopSitTimer();
    playBell();
    sitTimerComplete(true);
  }
}

function formatSitTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function sitTimerComplete(early) {
  if (!view.modal || view.modal.type !== 'meditation_timer') return;
  const elapsedMs = Date.now() - _sitTimer.startTime - _sitTimer.totalPausedMs;
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  view.modal.phase = 'post';
  view.modal.elapsedSec = elapsedSec;
  view.modal.early = !!early;
  view.modal.postChips = view.modal.postChips || [];
  renderModal();
}

function finalizeSit() {
  if (!view.modal || view.modal.type !== 'meditation_timer') return;
  const m = view.modal;
  const memberId = view.currentMember;
  const dk = todayKey();

  // Log the bound habit as completed (if any)
  if (m.habitId) {
    if (!state.log[dk]) state.log[dk] = {};
    if (!state.log[dk][memberId]) state.log[dk][memberId] = {};
    state.log[dk][memberId][m.habitId] = true;
  }

  // Record the sit in sitRecords for history + future PDF export
  if (!state.sitRecords) state.sitRecords = [];
  state.sitRecords.push({
    date: dk,
    completedAt: new Date().toISOString(),
    memberId,
    habitId: m.habitId || null,
    flavor: m.flavor || 'breath',
    targetMin: Math.round(m.duration / 60),
    actualSec: m.elapsedSec || m.duration,
    early: !!m.early,
    preChips: m.preChips || [],
    postChips: m.postChips || []
  });

  saveState();
  recalculateShadow();
  // v9: advance the path gate evaluation after a sit lands.
  if (memberId) writePathGateEvaluation(memberId);
  // v9.7: award tisikkhā for the sit
  if (memberId) earnTisikkha(memberId, 'sit');
  view.modal = null;
  renderModal();
  render();
}

function openMeditationTimerForHabit(habitId, flavor) {
  // v9.4: parse minutes from the habit name and pre-fill, skipping the
  // select phase entirely. The user already chose duration in setup; asking
  // again is a UX bug. They can still tap "change" from the pre-sit screen.
  // v12.6: optional flavor ('breath' | 'metta' | 'walking') is kept in the
  // modal state so the pre-sit intention block can say which practice they
  // chose and so the app can later vary the guidance per flavor.
  let preFillSeconds = null;
  const habit = state.habits.find(h => h.id === habitId);
  if (habit) {
    const m = String(habit.name).match(/\((\d+)\s*min\)/);
    if (m) preFillSeconds = parseInt(m[1], 10) * 60;
  }
  view.modal = {
    type: 'meditation_timer',
    phase: preFillSeconds ? 'pre' : 'select',
    habitId,
    flavor: flavor || 'breath',
    duration: preFillSeconds,
    preChips: [],
    postChips: []
  };
  renderModal();
}

function meditationTimerPickDuration(minutes) {
  if (!view.modal || view.modal.type !== 'meditation_timer') return;
  view.modal.duration = minutes * 60;
  renderModal();
}

function meditationTimerToPre() {
  if (!view.modal || view.modal.type !== 'meditation_timer') return;
  if (!view.modal.duration) return;
  view.modal.phase = 'pre';
  renderModal();
}

function meditationTimerBackToSelect() {
  if (!view.modal || view.modal.type !== 'meditation_timer') return;
  view.modal.phase = 'select';
  renderModal();
}

function meditationTimerToggleChip(which, chipId) {
  if (!view.modal || view.modal.type !== 'meditation_timer') return;
  const key = which === 'pre' ? 'preChips' : 'postChips';
  if (!view.modal[key]) view.modal[key] = [];
  const idx = view.modal[key].indexOf(chipId);
  if (idx >= 0) view.modal[key].splice(idx, 1);
  else view.modal[key].push(chipId);
  renderModal();
}

function toggleMeditationTimerChips(which) {
  if (!view.modal || view.modal.type !== 'meditation_timer') return;
  if (which === 'pre') view.modal.preChipsExpanded = !view.modal.preChipsExpanded;
  else view.modal.postChipsExpanded = !view.modal.postChipsExpanded;
  renderModal();
}

function meditationTimerBegin() {
  if (!view.modal || view.modal.type !== 'meditation_timer') return;
  view.modal.phase = 'sitting';
  renderModal();
  // Start timer after the modal is in the DOM. Use a small delay to ensure
  // the display element exists before the first tick.
  setTimeout(() => startSitTimer(view.modal.duration), 100);
}
