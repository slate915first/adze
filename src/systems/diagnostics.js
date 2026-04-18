// ============================================================================
// src/systems/diagnostics.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 9 function(s): saveOnboardingDiagnostic, getOnboardingDiagnostic, getDailyDiagnosticQuestions, saveDailyDiagnostic, saveWeeklyDiagnostic, saveMonthlyDiagnostic, getLastMonthlyDiagnostic, hasDailyDiagnosticToday, openMemberDiagnostic
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function saveOnboardingDiagnostic(memberId, answers) {
  if (!state.diagnostics) state.diagnostics = { onboarding: {}, daily: {}, weekly: [], monthly: [] };
  state.diagnostics.onboarding[memberId] = {
    answers: { ...answers },
    completedAt: new Date().toISOString()
  };
  saveState();
}

function getOnboardingDiagnostic(memberId) {
  return state.diagnostics?.onboarding?.[memberId] || null;
}

function getDailyDiagnosticQuestions() {
  // Rotate 3 questions based on day number so the set cycles through the pool.
  const dayIdx = daysSinceReflectionStart();
  const pool = DAILY_DIAGNOSTIC_POOL;
  const start = (dayIdx * 3) % pool.length;
  const picks = [];
  for (let i = 0; i < 3; i++) picks.push(pool[(start + i) % pool.length]);
  return picks;
}

function saveDailyDiagnostic(memberId, answers) {
  const dk = todayKey();
  if (!state.diagnostics.daily[dk]) state.diagnostics.daily[dk] = {};
  state.diagnostics.daily[dk][memberId] = { ...answers, at: new Date().toISOString() };
  saveState();
  // v9: hindrance sliders are the first gate leg; re-evaluate now.
  if (memberId) writePathGateEvaluation(memberId);
}

function saveWeeklyDiagnostic(memberId, answers, writing) {
  const week = currentWeekNumber();
  state.diagnostics.weekly.push({
    week, memberId,
    answers: { ...answers },
    writing: writing || '',
    date: new Date().toISOString()
  });
  saveState();
}

function saveMonthlyDiagnostic(memberId, answers, writings) {
  const month = currentMonthNumber();
  state.diagnostics.monthly.push({
    month, memberId,
    answers: { ...answers },
    writings: { ...writings },
    date: new Date().toISOString()
  });
  saveState();
}

function getLastMonthlyDiagnostic(memberId) {
  const list = (state.diagnostics?.monthly || []).filter(m => m.memberId === memberId);
  if (list.length < 2) return null;
  return list[list.length - 2];
}

function hasDailyDiagnosticToday(memberId) {
  const dk = todayKey();
  return !!(state.diagnostics?.daily?.[dk]?.[memberId]);
}

function openMemberDiagnostic(memberId) {
  view.modal = { type: 'member_diagnostic', memberId };
  renderModal();
}
