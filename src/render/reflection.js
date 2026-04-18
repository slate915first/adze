// ============================================================================
// render/reflection.js
// ----------------------------------------------------------------------------
// The 🪞 Reflection tab — the place for daily, weekly, and monthly
// check-ins.
//
// Three cadences live here, each with its own modal:
//
//   Daily       a short check-in with one rotating question. Opens the
//               daily_reflection modal. Done-today is shown as a filled
//               card; otherwise a clear CTA.
//
//   Weekly      the weekly self-survey (ISO week). Uses the diagnostic
//               slider across the key dimensions (sila, samadhi, panna,
//               shadow pressure, dominant hindrance, etc.). Opens
//               weekly_reflection modal.
//
//   Monthly     the deepest self-survey — longer diagnostic, uposatha
//               flag if observed, freeform journal entry. Opens
//               monthly_reflection modal.
//
//   One-line    a lightweight one-line-a-day journal available on demand.
//               Small addition for practitioners who want a daily record
//               without the full reflection form.
//
// The tab notification "•" marker in renderTabs tracks whether any of
// these are currently available and unanswered.
//
// Dependencies (from global scope):
//   State:     state (reflectionLog, oneLineJournal, diagnostics)
//              view (currentMember, modal)
//   Engine:    t() from engine/i18n.js
//   Helpers:   getCurrentDailyQuestion, getCurrentWeekly, getCurrentMonthly,
//              isDailyReflectionDoneToday, isWeeklyReflectionAvailable,
//              isMonthlyReflectionAvailable, todayKey, isoWeekKey,
//              monthKey, openDailyReflection, openWeeklyReflection,
//              openMonthlyReflection, openOneLineJournal
// ============================================================================


// ============================================================================
// REFLECTION TAB — daily, weekly, monthly check-ins
// ============================================================================

function renderReflection() {
  const daily = getCurrentDailyQuestion();
  const dailyDone = isDailyReflectionDoneToday();
  const weekly = getCurrentWeekly();
  const weeklyAvail = isWeeklyReflectionAvailable();
  const weeklyDone = weekly && state.completedWeeklies.includes(weekly.week);
  const monthly = getCurrentMonthly();
  const monthlyAvail = isMonthlyReflectionAvailable();
  const monthlyDone = monthly && state.completedMonthlies.includes(monthly.month);

  const daysIn = daysSinceReflectionStart();
  const weekNum = currentWeekNumber();
  const monthNum = currentMonthNumber();

  let html = `
    <div class="parchment rounded-xl p-5 mb-4 fade-in">
      <h2 class="text-2xl font-bold gold-text mb-1">${t('reflection.heading')}</h2>
      <p class="text-sm text-amber-100/70 italic">${t('reflection.subtitle')}</p>
      <div class="mt-3 text-xs text-amber-300/80">${t('reflection.period_ticker', {day: daysIn + 1, week: weekNum, month: monthNum})}</div>
    </div>

    <div class="parchment rounded-xl p-4 mb-4 border-amber-700/40">
      <p class="serif text-sm text-amber-100/85 leading-relaxed italic">
        ${t('reflection.adze_quote')}
      </p>
      <p class="text-xs text-amber-300/60 mt-2 text-right">${t('reflection.adze_attribution')}</p>
    </div>
  `;

  // Daily
  html += `
    <div class="mb-4">
      <div class="text-xs uppercase tracking-wider text-amber-300 mb-2 px-2">${t('reflection.daily.eyebrow')}</div>
      <div class="parchment ${dailyDone ? '' : 'pulse-glow'} rounded-xl p-5">
        ${dailyDone ? `
          <div class="flex items-center gap-3 mb-2">
            <div class="text-3xl">✓</div>
            <div>
              <div class="font-bold text-amber-200">${t('reflection.daily.completed_heading')}</div>
              <div class="text-xs text-amber-100/60">${t('reflection.daily.completed_sub')}</div>
            </div>
          </div>
          <div class="mt-3 text-sm text-amber-100/70 italic">
            "${(state.reflectionLog[todayKey()]?.[view.currentMember]?.daily?.q) || ''}"
          </div>
        ` : `
          <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2">${t('reflection.daily.teacher_asks')}</div>
          <p class="serif text-amber-100 leading-relaxed">${daily.q}</p>
          <button class="btn btn-gold mt-4 text-sm" onclick="openDailyReflection()">${t('reflection.daily.sit_with_button')}</button>
        `}
      </div>
    </div>
  `;

  // Weekly — v12.6: only render if actually due today or completed this week.
  // A far-off "Available in X days" tile adds noise for a tab whose purpose
  // is to show what to do now. If nothing weekly is due and it's not done,
  // this section is suppressed.
  if (weekly && (weeklyAvail || weeklyDone)) {
    html += `
      <div class="mb-4">
        <div class="text-xs uppercase tracking-wider text-amber-300 mb-2 px-2">${t('reflection.weekly.eyebrow')}</div>
        <div class="parchment rounded-xl p-5 ${weeklyAvail && !weeklyDone ? 'border-amber-500/60' : ''}">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="text-xs text-amber-300/70">${t('reflection.weekly.week_label', {week: weekly.week, ref: weekly.suttaRef})}</div>
              <h3 class="text-lg font-bold text-amber-100 mt-1">${weekly.title}</h3>
              <p class="text-sm text-amber-200/70 italic mt-1">${weekly.teaser}</p>
            </div>
            ${weeklyDone ? `<div class="text-xs text-emerald-400 ml-2">${t('reflection.weekly.done_badge')}</div>` : ''}
          </div>
          ${weeklyDone ? `
            <p class="text-xs text-amber-100/60 mt-3">${t('reflection.weekly.done_body')}</p>
            <button class="btn btn-ghost text-xs mt-2" onclick="openWeeklyReflection()">${t('reflection.weekly.review_button')}</button>
          ` : weeklyAvail ? `
            <p class="text-xs text-amber-100/70 mt-3">${t('reflection.weekly.available_body')}</p>
            <button class="btn btn-gold text-sm mt-3" onclick="openWeeklyReflection()">${t('reflection.weekly.begin_button')}</button>
          ` : ''}
        </div>
      </div>
    `;
  } else if (weekNum > 12) {
    html += `
      <div class="parchment rounded-xl p-4 mb-4 text-center">
        <p class="text-sm text-amber-100/70">${t('reflection.weekly.cycle_complete')}</p>
      </div>
    `;
  }

  // Monthly — v12.6: only render if actually available or done this month.
  if (monthly && (monthlyAvail || monthlyDone)) {
    html += `
      <div class="mb-4">
        <div class="text-xs uppercase tracking-wider text-amber-300 mb-2 px-2">${t('reflection.monthly.eyebrow')}</div>
        <div class="parchment rounded-xl p-5 ${monthlyAvail && !monthlyDone ? 'lotus-glow' : ''}">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="text-xs text-amber-300/70">${t('reflection.monthly.month_label', {month: monthly.month, ref: monthly.suttaRef})}</div>
              <h3 class="text-lg font-bold text-amber-100 mt-1">${monthly.title}</h3>
              <p class="text-sm text-amber-200/70 italic mt-1">${monthly.teaser}</p>
            </div>
            ${monthlyDone ? `<div class="text-xs text-emerald-400 ml-2">${t('reflection.monthly.done_badge')}</div>` : ''}
          </div>
          ${monthlyDone ? `
            <p class="text-xs text-amber-100/60 mt-3">${t('reflection.monthly.done_body')}</p>
            <button class="btn btn-ghost text-xs mt-2" onclick="openMonthlyReflection()">${t('reflection.monthly.review_button')}</button>
          ` : monthlyAvail ? `
            <p class="text-xs text-amber-100/70 mt-3">${t('reflection.monthly.available_body')}</p>
            <button class="btn btn-gold text-sm mt-3" onclick="openMonthlyReflection()">${t('reflection.monthly.enter_button')}</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  // v7: Data export/import buttons — poor-man's database until Supabase
  html += `
    <div class="mt-6">
      <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2 px-1">${t('reflection.export.eyebrow')}</div>
      <div class="parchment rounded-xl p-4">
        <p class="text-xs text-amber-100/70 mb-3">${t('reflection.export.body')}</p>
        <div class="flex gap-2 flex-wrap">
          <button onclick="exportUserData()" class="btn btn-ghost text-xs">${t('reflection.export.export_button')}</button>
          <button onclick="importUserData()" class="btn btn-ghost text-xs">${t('reflection.export.import_button')}</button>
        </div>
        <p class="text-[10px] text-amber-100/40 italic mt-2">${t('reflection.export.note')}</p>
      </div>
    </div>
  `;

  // v6: Weekly summary entry point — always available, surfaces trends and
  // the Ajahn Chah teaching of the day. Lives at the top of the reflection
  // history section so it's easy to find without crowding the reflection cards.
  html += `
    <div class="mt-6">
      <button onclick="openWeeklySummary()" class="parchment rounded-xl p-4 w-full text-left hover:parchment-active transition border-amber-700/40">
        <div class="flex items-center gap-3">
          <div class="text-3xl">📊</div>
          <div class="flex-1">
            <div class="text-xs uppercase tracking-wider text-amber-300">${t('reflection.summary_tile.eyebrow')}</div>
            <div class="font-bold text-amber-100 text-sm mt-0.5">${t('reflection.summary_tile.heading')}</div>
            <div class="text-xs text-amber-100/70 mt-1">${t('reflection.summary_tile.body')}</div>
          </div>
        </div>
      </button>
    </div>
  `;

  // History
  if (state.completedDailies > 0 || state.completedWeeklies.length > 0 || state.completedMonthlies.length > 0) {
    html += `
      <div class="mt-6">
        <div class="text-xs uppercase tracking-wider text-amber-300/70 mb-2 px-2">${t('reflection.history.eyebrow')}</div>
        <div class="parchment rounded-xl p-4">
          <div class="grid grid-cols-3 gap-3 text-center">
            <div>
              <div class="text-2xl font-bold gold-text">${state.completedDailies || 0}</div>
              <div class="text-xs text-amber-100/60">${t('reflection.history.daily_label')}</div>
            </div>
            <div>
              <div class="text-2xl font-bold gold-text">${state.completedWeeklies.length}<span class="text-amber-100/40">/12</span></div>
              <div class="text-xs text-amber-100/60">${t('reflection.history.weekly_label')}</div>
            </div>
            <div>
              <div class="text-2xl font-bold gold-text">${state.completedMonthlies.length}<span class="text-amber-100/40">/6</span></div>
              <div class="text-xs text-amber-100/60">${t('reflection.history.monthly_label')}</div>
            </div>
          </div>
          ${state.completedWeeklies.length > 0 ? `
            <div class="mt-4 pt-3 border-t border-amber-900/30">
              <div class="text-xs text-amber-300/70 mb-2">${t('reflection.history.weeklies_eyebrow')}</div>
              <div class="flex flex-wrap gap-1">
                ${state.completedWeeklies.sort((a,b)=>a-b).map(w => {
                  const wr = WEEKLY_REFLECTIONS.find(x => x.week === w);
                  return `<button onclick="openHistoricalWeekly(${w})" class="text-xs bg-amber-900/20 border border-amber-700/40 rounded px-2 py-1 hover:bg-amber-900/40">W${w}: ${wr?.title || ''}</button>`;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  return html;
}
