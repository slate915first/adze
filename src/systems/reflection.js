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

// ============================================================================
// v15.17 — Reflection history readback (Li May & operator's wife feedback).
// In-app browsing of past daily, one-line, weekly, and monthly reflections.
// Teaching-framed per dhamma-reviewer: this is vicāra (investigation), not
// progress-audit. The render code deliberately omits counts, streaks, and
// per-hindrance aggregates (game-designer anti-pattern vetoes).
// ============================================================================

// Walk state.reflectionLog into a flat, reverse-chronological list of entries.
// Each entry: { id, kind, date, title, preview, body, meta }.
//   id      — stable string (`${dateKey}:${kind}`) used for detail-phase routing
//   kind    — 'daily' | 'oneline' | 'weekly' | 'monthly'
//   date    — YYYY-MM-DD (the practitioner's local date key)
//   title   — one-line type label, already translated
//   preview — ~80 chars of the entry text for list display
//   body    — full text for the detail phase (may be multi-paragraph)
//   meta    — the original entry object, passed through for future renderers
//
// Returns an empty array if no entries exist or the member has no log yet.
function getAllPastReflections(memberId) {
  if (!memberId || !state || !state.reflectionLog) return [];
  const out = [];
  const dateKeys = Object.keys(state.reflectionLog);
  for (const dk of dateKeys) {
    const byMember = state.reflectionLog[dk];
    if (!byMember || typeof byMember !== 'object') continue;
    const entry = byMember[memberId];
    if (!entry || typeof entry !== 'object') continue;

    // Daily reflection — a rotating question + free-text answer.
    if (entry.daily && entry.daily.answer && String(entry.daily.answer).trim()) {
      const ans = String(entry.daily.answer);
      out.push({
        id: `${dk}:daily`,
        kind: 'daily',
        date: dk,
        title: t('reflection_history.kind.daily'),
        preview: _reflectionPreview(ans),
        body: ans,
        meta: entry.daily
      });
    }

    // One-line journal — shorter, captured via the evening-close oneline phase.
    // Skip if the daily above already captured the same text (the merged flow
    // writes both .daily and .oneline with the same answer).
    if (entry.oneline && entry.oneline.text && String(entry.oneline.text).trim()) {
      const txt = String(entry.oneline.text).trim();
      const dailyAns = entry.daily && entry.daily.answer ? String(entry.daily.answer).trim() : '';
      if (txt !== dailyAns) {
        out.push({
          id: `${dk}:oneline`,
          kind: 'oneline',
          date: dk,
          title: t('reflection_history.kind.oneline'),
          preview: _reflectionPreview(txt),
          body: txt,
          meta: entry.oneline
        });
      }
    }

    // Weekly reflection — multi-question answers array.
    if (entry.weekly && entry.weekly.answers) {
      const body = _reflectionJoinAnswers(entry.weekly.answers);
      if (body) {
        out.push({
          id: `${dk}:weekly`,
          kind: 'weekly',
          date: dk,
          title: t('reflection_history.kind.weekly', {n: entry.weekly.week || ''}),
          preview: _reflectionPreview(body),
          body,
          meta: entry.weekly
        });
      }
    }

    // Monthly reflection — multi-question answers + structured writings block.
    if (entry.monthly && (entry.monthly.answers || entry.monthly.writings)) {
      const pieces = [];
      if (entry.monthly.answers) pieces.push(_reflectionJoinAnswers(entry.monthly.answers));
      if (entry.monthly.writings) pieces.push(_reflectionJoinAnswers(entry.monthly.writings));
      const body = pieces.filter(Boolean).join('\n\n');
      if (body) {
        out.push({
          id: `${dk}:monthly`,
          kind: 'monthly',
          date: dk,
          title: t('reflection_history.kind.monthly', {n: entry.monthly.month || ''}),
          preview: _reflectionPreview(body),
          body,
          meta: entry.monthly
        });
      }
    }
  }

  // Reverse chronological: newest first. Secondary sort by kind-weight so the
  // richer entry wins the eye on multi-entry days (monthly > weekly > daily > oneline).
  const kindWeight = { monthly: 0, weekly: 1, daily: 2, oneline: 3 };
  out.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (kindWeight[a.kind] || 9) - (kindWeight[b.kind] || 9);
  });
  return out;
}

// Truncate to ~80 chars, collapse whitespace, add ellipsis if truncated.
function _reflectionPreview(text) {
  if (!text) return '';
  const flat = String(text).replace(/\s+/g, ' ').trim();
  return flat.length > 80 ? flat.slice(0, 77) + '…' : flat;
}

// Weekly/monthly `.answers` and `.writings` are shaped as either an array of
// strings, a { key: string } object, or occasionally a nested mix. Flatten
// defensively so `[object Object]` never leaks into the preview or detail body.
function _reflectionJoinAnswers(v) {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.map(x => _reflectionJoinAnswers(x)).filter(Boolean).join('\n\n');
  if (typeof v === 'object') {
    return Object.values(v).map(x => _reflectionJoinAnswers(x)).filter(Boolean).join('\n\n');
  }
  return String(v);
}

function openReflectionHistory() {
  view.modal = { type: 'reflection_history', phase: 'list' };
  renderModal();
}

function openReflectionHistoryDetail(entryId) {
  if (!view.modal || view.modal.type !== 'reflection_history') return;
  view.modal.phase = 'detail';
  view.modal.entryId = entryId;
  renderModal();
}

function backToReflectionHistoryList() {
  if (!view.modal || view.modal.type !== 'reflection_history') return;
  view.modal.phase = 'list';
  view.modal.entryId = null;
  renderModal();
}
