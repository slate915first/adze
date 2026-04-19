// ============================================================================
// src/systems/reflection.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 25 function(s): getReflectionStartDate, daysSinceReflectionStart, currentWeekNumber, currentMonthNumber, isDailyReflectionDoneToday, isWeeklyReflectionDue, isWeeklyReflectionAvailable, isMonthlyReflectionDue, isMonthlyReflectionAvailable, getCurrentDailyQuestion, getCurrentWeekly, getCurrentMonthly, saveDailyReflection, saveWeeklyReflection, saveMonthlyReflection, getMemberReflection, openDailyReflection, toggleReflectionExpand, openWeeklyReflection, openMonthlyReflection, openHistoricalWeekly, submitDailyReflection, submitEveningWithDiagnostic, submitWeeklyReflection, submitMonthlyReflection
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function getReflectionStartDate() {
  return state.reflectionStartDate || state.questStartDate || todayKey();
}

function daysSinceReflectionStart() {
  return daysBetween(getReflectionStartDate(), todayKey());
}

function currentWeekNumber() {
  // Week 1 starts on day 0, Week 2 on day 7, etc.
  return Math.floor(daysSinceReflectionStart() / 7) + 1;
}

function currentMonthNumber() {
  // Month 1 starts on day 0, Month 2 on day 28, etc. (4-week months)
  return Math.floor(daysSinceReflectionStart() / 28) + 1;
}

function isDailyReflectionDoneToday(memberId) {
  // v15.15 — merged reflection flow: either a full .daily entry OR a
  // stop-at-line .oneline counts as today's reflection. The merged flow
  // writes both when the user continues deeper; just .oneline when they
  // stop at the line (plus a minimal .daily so this stays truthy either
  // way). The OR is belt-and-suspenders against legacy saves.
  const dk = todayKey();
  const mid = memberId || view.currentMember;
  if (!mid) return false;
  const e = state.reflectionLog[dk] && state.reflectionLog[dk][mid];
  return !!(e && (e.daily || e.oneline));
}

function isWeeklyReflectionDue() {
  const week = currentWeekNumber();
  if (week > WEEKLY_REFLECTIONS.length) return false;
  // Due on the 7th day of each week (so day 6, 13, 20, ...)
  const dayInWeek = daysSinceReflectionStart() % 7;
  if (dayInWeek !== 6) return false;
  return !state.completedWeeklies.includes(week);
}

function isWeeklyReflectionAvailable() {
  // Available all week, with reminder on day 7
  const week = currentWeekNumber();
  if (week > WEEKLY_REFLECTIONS.length) return false;
  if (state.completedWeeklies.includes(week)) return false;
  // v13.6 — Dirk feedback: the weekly contemplation surfaced on day 1 of
  // week 1, which is confusing and defeats the point of a *weekly* check-in.
  // Hide it until day 5 of the first week; from week 2 onward, surface it
  // any day (you've already established the rhythm).
  if (week === 1) {
    const dayInWeek = daysSinceReflectionStart() % 7;
    if (dayInWeek < 4) return false;  // days 0-3 of week 1 — too early
  }
  return true;
}

function isMonthlyReflectionDue() {
  const month = currentMonthNumber();
  if (month > MONTHLY_REFLECTIONS.length) return false;
  // Due on day 28, 56, 84... (last day of each month)
  const dayInMonth = daysSinceReflectionStart() % 28;
  if (dayInMonth !== 27) return false;
  return !state.completedMonthlies.includes(month);
}

function isMonthlyReflectionAvailable() {
  const month = currentMonthNumber();
  if (month > MONTHLY_REFLECTIONS.length) return false;
  // Available in the final week of each month
  const dayInMonth = daysSinceReflectionStart() % 28;
  return dayInMonth >= 21 && !state.completedMonthlies.includes(month);
}

function getCurrentDailyQuestion() {
  const idx = (state.dailyQuestionIndex || 0) % DAILY_REFLECTIONS.length;
  return DAILY_REFLECTIONS[idx];
}

function getCurrentWeekly() {
  const week = currentWeekNumber();
  return WEEKLY_REFLECTIONS.find(w => w.week === week);
}

function getCurrentMonthly() {
  const month = currentMonthNumber();
  return MONTHLY_REFLECTIONS.find(m => m.month === month);
}

function saveDailyReflection(answer) {
  const dk = todayKey();
  const mid = view.currentMember;
  const q = getCurrentDailyQuestion();
  if (!state.reflectionLog[dk]) state.reflectionLog[dk] = {};
  if (!state.reflectionLog[dk][mid]) state.reflectionLog[dk][mid] = {};
  state.reflectionLog[dk][mid].daily = { q: q.q, theme: q.theme, answer: answer || '', completed: new Date().toISOString() };
  state.dailyQuestionIndex = (state.dailyQuestionIndex || 0) + 1;
  state.completedDailies = (state.completedDailies || 0) + 1;
  // v9.7: award tisikkhā based on answer length as a rough proxy for depth
  if (mid) {
    const len = (answer || '').length;
    const tier = len < 20 ? 'reflection_minimal'
      : len < 200 ? 'reflection_standard'
      : len < 600 ? 'reflection_deep'
      : 'reflection_open';
    earnTisikkha(mid, tier);
    // v15.16.1 — regex-scan hindrance-keyword bonus removed. Same reasoning
    // as evening-close.js: rewarding keyword presence in free text converts
    // reflection into keyword-stuffing. TISIKKHA_EARN.hindrance_named stays
    // defined for a future structured-chip flow.
  }
  saveState();
  // v9: reflection is one of the three gate legs; re-evaluate now.
  if (mid) writePathGateEvaluation(mid);
}

function saveWeeklyReflection(answers) {
  const week = currentWeekNumber();
  const dk = todayKey();
  const mid = view.currentMember;
  if (!state.reflectionLog[dk]) state.reflectionLog[dk] = {};
  if (!state.reflectionLog[dk][mid]) state.reflectionLog[dk][mid] = {};
  state.reflectionLog[dk][mid].weekly = { week, answers, completed: new Date().toISOString() };
  if (!state.completedWeeklies.includes(week)) state.completedWeeklies.push(week);
  saveState();
}

function saveMonthlyReflection(answers) {
  const month = currentMonthNumber();
  const dk = todayKey();
  const mid = view.currentMember;
  if (!state.reflectionLog[dk]) state.reflectionLog[dk] = {};
  if (!state.reflectionLog[dk][mid]) state.reflectionLog[dk][mid] = {};
  state.reflectionLog[dk][mid].monthly = { month, answers, completed: new Date().toISOString() };
  if (!state.completedMonthlies.includes(month)) state.completedMonthlies.push(month);
  saveState();
}

function getMemberReflection(memberId, dateK) {
  return state.reflectionLog?.[dateK]?.[memberId] || null;
}

function openDailyReflection() {
  view.modal = { type: 'daily_reflection', expanded: false };
  renderModal();
}

function toggleReflectionExpand() {
  if (!view.modal) return;
  if (view.modal.type !== 'daily_reflection' && view.modal.type !== 'evening_reflection') return;
  view.modal.expanded = !view.modal.expanded;
  renderModal();
}

function openWeeklyReflection() {
  view.modal = { type: 'weekly_reflection' };
  renderModal();
}

function openMonthlyReflection() {
  view.modal = { type: 'monthly_reflection' };
  renderModal();
}

function openHistoricalWeekly(weekNum) {
  view.modal = { type: 'weekly_reflection', historical: weekNum };
  renderModal();
}

function submitDailyReflection() {
  const answer = document.getElementById('daily-answer')?.value || '';
  saveDailyReflection(answer);
  // v13.2 — detect struggles in the daily answer
  const detectedSubs = detectStrugglesInText(answer);
  if (detectedSubs.length > 0) {
    const suggestion = suggestSuttaForStruggle(view.currentMember, detectedSubs[0]);
    if (suggestion && suggestion.sutta) {
      view.modal = { type: 'struggle_suggestion', suggestion };
      renderModal();
      return;
    }
  }
  view.modal = null;
  renderModal();
  render();
}

function submitEveningWithDiagnostic() {
  const answer = document.getElementById('daily-answer')?.value || '';
  saveDailyReflection(answer);
  // Collect any diagnostic sliders present in the modal — these ARE per-member
  const diagQs = getDailyDiagnosticQuestions();
  const answers = {};
  let anyAnswered = false;
  diagQs.forEach(q => {
    const el = document.getElementById(`diag-${q.id}`);
    if (el) {
      answers[q.id] = parseInt(el.value, 10);
      anyAnswered = true;
    }
  });
  if (anyAnswered) saveDailyDiagnostic(view.currentMember, answers);

  // v8.1: check if any OTHER member still needs their evening check-in today.
  // If so, offer a one-tap switch-to-next-member flow so shared-device use
  // doesn't silently skip anyone's reflection.
  const nextMember = findNextMemberNeedingEvening(view.currentMember);
  if (nextMember) {
    view.modal = { type: 'evening_next_member', nextMemberId: nextMember.id, nextMemberName: nextMember.name };
    renderModal();
    return;
  }

  view.modal = null;
  renderModal();
  render();
}

function submitWeeklyReflection() {
  const weekly = getCurrentWeekly();
  if (!weekly) return;
  const answers = weekly.questions.map((_, i) => document.getElementById(`weekly-a-${i}`)?.value || '');
  saveWeeklyReflection(answers);
  // Also save the weekly diagnostic if the sliders were rendered
  const diagAnswers = {};
  let any = false;
  WEEKLY_DIAGNOSTIC.sliders.forEach(q => {
    const el = document.getElementById(`wdiag-${q.id}`);
    if (el) { diagAnswers[q.id] = parseInt(el.value, 10); any = true; }
  });
  const writing = document.getElementById('weekly-diag-writing')?.value || '';
  if (any) saveWeeklyDiagnostic(view.currentMember, diagAnswers, writing);
  view.modal = null;
  renderModal();
  render();
}

function submitMonthlyReflection() {
  const monthly = getCurrentMonthly();
  if (!monthly) return;
  const answers = monthly.questions.map((_, i) => document.getElementById(`monthly-a-${i}`)?.value || '');
  saveMonthlyReflection(answers);
  // Also save the monthly diagnostic
  const diagAnswers = {};
  let any = false;
  MONTHLY_DIAGNOSTIC.sliders.forEach(q => {
    const el = document.getElementById(`mdiag-${q.id}`);
    if (el) { diagAnswers[q.id] = parseInt(el.value, 10); any = true; }
  });
  const writings = {};
  MONTHLY_DIAGNOSTIC.writings.forEach(w => {
    const el = document.getElementById(`mdiag-writing-${w.id}`);
    if (el) writings[w.id] = el.value || '';
  });
  if (any) saveMonthlyDiagnostic(view.currentMember, diagAnswers, writings);
  view.modal = null;
  renderModal();
  render();
}
