// ============================================================================
// render/header.js
// ----------------------------------------------------------------------------
// The always-visible top chrome of the app. Three functions, all small.
//
//   renderHeader()       Top bar with quest title / day counter / vital stats
//                        column (Shadow + optional sīla / samādhi / paññā
//                        bars). For solo members, includes a compact
//                        character block with a pause/resume toggle.
//                        For multi-member households, delegates to
//                        renderMembersBar() below.
//                        v11.1 — the tisikkhā bars are collapsed behind a
//                        toggle by default because persistent progress
//                        bars for contemplative attainments can invite
//                        nikanti (clinging to progress), which is exactly
//                        what the tradition warns against.
//
//   renderMembersBar()   Grid of character cards for multi-member sangha
//                        households. Each card shows icon, name, rank
//                        (Pāli), today's score, XP. Clicking switches
//                        to that member AND opens the Path tab (the
//                        shared-map framing).
//
//   renderTabs()         The primary nav row. Reflection tab gets a "•"
//                        marker if anything is due; Study tab shows a
//                        cards-due badge. Path + Review are gated for
//                        beginners in their first seven days — no empty
//                        dashboards on day 2. A locked 🔒 Path pill
//                        appears in the gated state.
//
// Note on `const tsk = getTisikkha(...)` at the top of renderHeader:
// the tisikkhā record is captured as `tsk` rather than `t` to avoid
// shadowing the i18n t() function in that scope — hard-learned lesson
// from earlier turns (shadowed five times before the rename stuck).
//
// Dependencies (all read from global scope):
//   State:     state (members, shadow, questActive, questMode, questName,
//                     currentStage, questStartDate, questDuration, path,
//                     diagnostics, reflectionLog, currentMorningMinutes,
//                     currentEveningMinutes)
//              view (currentMember, tab, headerTisikkhaExpanded)
//   Engine:    t() from engine/i18n.js
//   Helpers:   todayKey, daysBetween, getTisikkha, computeMemberRank,
//              shadowFloorForRank, getTisikkhaThresholds, getRankInfo,
//              isQuestPaused, getFocusForNow, dayScore, maxDayScore,
//              totalXP, srsDueToday, isDailyReflectionDoneToday,
//              isWeeklyReflectionAvailable, isMonthlyReflectionAvailable
//   Data:      CHARACTERS, STAGES, WISDOM_SCROLLS
// ============================================================================

function renderHeader() {
  // v15.20.4 — Variant C: header is suppressed on Calm Today only.
  // Interior Calm screens (Path, Reflection, Settings, Wisdom, etc.)
  // keep the header so the rank/character context remains visible.
  if (view.tab === 'today'
      && document.documentElement.getAttribute('data-theme') === 'calm') {
    return '';
  }
  if (!state.questActive && state.questMode === 'custom') {
    return `
      <header class="mb-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-2xl font-bold gold-text">${t('header.free_path')}</h1>
            <div class="text-xs text-amber-100/60">${new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}</div>
          </div>
        </div>
        ${renderMembersBar()}
      </header>
    `;
  }

  const stage = STAGES[state.currentStage] || STAGES[STAGES.length-1];
  const daysIn = state.questStartDate ? daysBetween(state.questStartDate, todayKey()) : 0;
  const daysLeft = state.questDuration - daysIn;

  // v9.5: header pills — focus right now + wisdom collected + shadow (all clickable)
  const focus = view.currentMember ? getFocusForNow(view.currentMember) : null;
  const wisdomCount = state.wisdomCollected?.length || 0;
  const wisdomTotal = WISDOM_SCROLLS.length;
  // v10.0: focus and wisdom pills removed from header. Cultivate-sati surfaces
  // in the pre-sit intention inset; wisdom is one tap away in its own tab.
  // The header line stays cleaner and the dashboard is less cluttered.

  // v11.1: vital-stats column. The Shadow is always visible (it's a THREAT,
  // not an achievement). The three trainings (sīla / samādhi / paññā) are
  // collapsed behind a toggle — persistent progress bars for contemplative
  // attainments invite nikanti (subtle clinging to progress), the exact
  // thing the tradition warns against. They're still one tap away for
  // practitioners who want them.
  let vitalStatsColumn = '';
  if (view.currentMember) {
    // IMPORTANT: the tisikkhā record is captured as `tsk` rather than `t` to
    // avoid shadowing the i18n t() function in this scope (lesson #9).
    const tsk = getTisikkha(view.currentMember);
    const rk = computeMemberRank(view.currentMember);
    const floor = shadowFloorForRank(rk);
    const nextThresh = rk < 9 ? getTisikkhaThresholds(rk + 1) : { sila: tsk.sila || 1, samadhi: tsk.samadhi || 1, panna: tsk.panna || 1 };
    const pct = (cur, max) => Math.max(0, Math.min(100, Math.round((cur / Math.max(max, 1)) * 100)));
    const silaPct = pct(tsk.sila, nextThresh.sila || 1);
    const samadhiPct = pct(tsk.samadhi, nextThresh.samadhi || 1);
    const pannaPct = pct(tsk.panna, nextThresh.panna || 1);
    const tisikkhaExpanded = !!view.headerTisikkhaExpanded;

    vitalStatsColumn = `
      <div class="flex flex-col gap-2 w-full md:w-72 md:shrink-0">
        <button onclick="openShadowExplainer()" class="text-right rounded-lg px-2 py-1.5 hover:bg-amber-900/20 transition" title="${t('header.shadow_tooltip')}">
          <div class="flex items-baseline justify-between">
            <div class="text-[11px] uppercase tracking-wider text-amber-300/70">${t('header.shadow_label')}</div>
            <div class="text-[11px] ${state.shadow > 70 ? 'text-red-400' : 'text-amber-100/60'}"><b>${state.shadow}</b><span class="text-amber-100/45">/${floor}</span></div>
          </div>
          <div class="w-full progress-bar mt-1.5 relative h-3">
            <div class="shadow-bar-fill" style="width:${state.shadow}%"></div>
            <div class="absolute top-0 bottom-0 w-px bg-purple-300/70" style="left:${floor}%"></div>
          </div>
        </button>
        <button onclick="toggleHeaderTisikkha()" class="text-right rounded-lg px-2 py-1 hover:bg-amber-900/20 transition text-[10px] text-amber-300/60" title="${t('header.tisikkha_toggle_tooltip')}">
          ${tisikkhaExpanded
            ? t('header.tisikkha_hide')
            : t('header.tisikkha_show', {sila: tsk.sila, samadhi: tsk.samadhi, panna: tsk.panna})}
        </button>
        ${tisikkhaExpanded ? `
          <button onclick="openTisikkhaExplainer()" class="text-right rounded-lg px-2 py-1.5 hover:bg-amber-900/20 transition" title="${t('header.sila_tooltip')}">
            <div class="flex items-baseline justify-between">
              <div class="text-[11px] uppercase tracking-wider text-amber-300/70">${t('header.sila_label')}</div>
              <div class="text-[11px] text-amber-100/60"><b>${tsk.sila}</b><span class="text-amber-100/45">/${nextThresh.sila || '∞'}</span></div>
            </div>
            <div class="w-full bg-amber-900/30 rounded-full h-3 overflow-hidden mt-1.5">
              <div class="h-full bg-amber-400/70" style="width:${silaPct}%"></div>
            </div>
          </button>
          <button onclick="openTisikkhaExplainer()" class="text-right rounded-lg px-2 py-1.5 hover:bg-amber-900/20 transition" title="${t('header.samadhi_tooltip')}">
            <div class="flex items-baseline justify-between">
              <div class="text-[11px] uppercase tracking-wider text-amber-300/70">${t('header.samadhi_label')}</div>
              <div class="text-[11px] text-amber-100/60"><b>${tsk.samadhi}</b><span class="text-amber-100/45">/${nextThresh.samadhi || '∞'}</span></div>
            </div>
            <div class="w-full bg-amber-900/30 rounded-full h-3 overflow-hidden mt-1.5">
              <div class="h-full bg-amber-400/70" style="width:${samadhiPct}%"></div>
            </div>
          </button>
          <button onclick="openTisikkhaExplainer()" class="text-right rounded-lg px-2 py-1.5 hover:bg-amber-900/20 transition" title="${t('header.panna_tooltip')}">
            <div class="flex items-baseline justify-between">
              <div class="text-[11px] uppercase tracking-wider text-emerald-300/70">${t('header.panna_label')}</div>
              <div class="text-[11px] text-emerald-100/65"><b>${tsk.panna}</b><span class="text-emerald-100/45">/${nextThresh.panna || '∞'}</span></div>
            </div>
            <div class="w-full bg-emerald-900/30 rounded-full h-3 overflow-hidden mt-1.5">
              <div class="h-full bg-emerald-400/70" style="width:${pannaPct}%"></div>
            </div>
          </button>
        ` : ''}
      </div>
    `;
  }

  // v9.11: compact character block (replaces wide member row for solo).
  // Always shown for solo; multi-member households still get the full bar below.
  let characterBlock = '';
  if (view.currentMember && state.members.length === 1) {
    const m = state.members[0];
    const char = CHARACTERS[m.character] || {};
    const rk = computeMemberRank(m.id);
    const ri = getRankInfo(rk);
    const tierColor = ri.tier === 'pre-training' ? 'text-amber-100/60'
      : ri.tier === 'training' ? 'text-amber-200'
      : ri.tier === 'approaching' ? 'text-emerald-300'
      : 'text-purple-300';
    const paused = isQuestPaused();
    characterBlock = `
      <div class="flex items-center gap-1.5">
        <button onclick="showTab('path')" class="parchment rounded-lg p-2 flex items-center gap-2 hover:parchment-active transition" title="${t('header.character_tooltip')}">
          <div class="text-3xl">${char.icon || '🧘'}</div>
          <div class="text-left">
            <div class="font-bold text-sm" style="color:${char.color || '#f4e4bc'}">${m.name}</div>
            <div class="text-[10px] ${tierColor}">🪷 ${ri.pali}</div>
          </div>
        </button>
        ${state.questActive ? `
          <button onclick="${paused ? 'openResumeModal()' : 'openPauseModal()'}" class="rounded-lg px-2 py-1 text-[10px] ${paused ? 'bg-purple-900/50 border border-purple-500/60 text-purple-100' : 'bg-amber-950/30 border border-amber-700/40 text-amber-300/70 hover:bg-amber-900/30'} transition" title="${paused ? t('header.paused_tooltip') : t('header.pause_tooltip')}">
            ${paused ? t('header.paused_label') : '⏸'}
          </button>
        ` : ''}
      </div>
    `;
  }

  // Day marker — static key per branch (day 1 vs day N on the path).
  const dayMarker = daysIn === 0
    ? t('header.day_starting_today', {stageIcon: stage.icon, stageName: stage.name})
    : t('header.day_on_path', {stageIcon: stage.icon, stageName: stage.name, day: daysIn + 1});

  return `
    <header class="mb-3">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4 mb-2">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-1">
            ${characterBlock}
            <div class="min-w-0">
              <div class="text-[10px] text-amber-300/70 uppercase tracking-wider">${t('header.quest_eyebrow')}</div>
              <h1 class="text-xl md:text-2xl font-bold gold-text truncate">${state.questName}</h1>
            </div>
          </div>
          <div class="text-xs text-amber-100/70 mt-1">
            ${dayMarker}
          </div>
        </div>
        ${vitalStatsColumn}
      </div>
      ${state.members.length > 1 ? renderMembersBar() : ''}
    </header>
  `;
}

function renderMembersBar() {
  return `
    <div class="grid grid-cols-2 md:grid-cols-${Math.min(state.members.length, 4)} gap-2">
      ${state.members.map(m => {
        const char = CHARACTERS[m.character] || {};
        const today = dayScore(m.id, todayKey());
        const max = maxDayScore(m.id);
        const pct = max > 0 ? Math.round((today/max)*100) : 0;
        const xp = totalXP(m.id);
        // v9.6: show current rank on the character card; clicking opens the Path tab
        const rk = computeMemberRank(m.id);
        const ri = getRankInfo(rk);
        const tierColor = ri.tier === 'pre-training' ? 'text-amber-100/60'
          : ri.tier === 'training' ? 'text-amber-200'
          : ri.tier === 'approaching' ? 'text-emerald-300'
          : 'text-purple-300';
        return `
        <button onclick="switchMember('${m.id}'); showTab('path')" class="parchment ${view.currentMember===m.id?'parchment-active':''} rounded-lg p-3 text-left" title="${t('header.member_card_tooltip', {name: m.name})}">
          <div class="flex items-center gap-2">
            <div class="text-3xl">${char.icon || '🧘'}</div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm" style="color:${char.color || '#f4e4bc'}">${m.name}</div>
              <div class="text-[10px] ${tierColor} truncate">${t('header.member_rank_label', {pali: ri.pali, rk})}</div>
              <div class="text-xs text-amber-300 mt-0.5">${t('header.member_score_label', {today, max, pct, xp})}</div>
            </div>
          </div>
        </button>
        `;
      }).join('')}
    </div>
  `;
}

function renderTabs() {
  // v15.20.4 — Variant C: tab bar suppressed on Calm Today only. On
  // interior Calm screens the bar remains so users can navigate (we
  // also style it as text-links via theme-calm.css). On Today the
  // Variant C monastic layout owns navigation via Path sentence,
  // Settings dot, and the Reflection/Study sentences.
  if (view.tab === 'today'
      && document.documentElement.getAttribute('data-theme') === 'calm') {
    return '';
  }

  // Build reflection tab label with notification dot if anything is due
  const dailyDone = isDailyReflectionDoneToday();
  const weeklyAvail = isWeeklyReflectionAvailable();
  const monthlyAvail = isMonthlyReflectionAvailable();
  const hasNotification = !dailyDone || weeklyAvail || monthlyAvail;
  // Static key per branch (lesson #3) — the notification indicator is part of
  // the label in English but may not be a simple suffix in other languages.
  const reflectionLabel = hasNotification ? t('nav.tab_reflection_notif') : t('nav.tab_reflection');

  // v11: Path tab is GATED for beginners during their first seven days.
  // A path-of-liberation dashboard shown to someone on day 2 with no
  // telemetry is scaffolding around nothing; worse, it invites the nikanti
  // (clinging to progress) that the tradition warns about. Experienced
  // practitioners see the Path tab immediately. Beginners see it unlock on
  // day 8, after a week of real practice has accumulated data worth showing.
  const firstMemberId = state.members?.[0]?.id;
  const firstDiag = firstMemberId ? state.diagnostics?.onboarding?.[firstMemberId]?.answers : null;
  const isBeginner = firstDiag && (firstDiag.experience === 'none' || firstDiag.experience === 'some');
  const daysIntoQuest = state.questStartDate ? daysBetween(state.questStartDate, todayKey()) : 0;
  const pathGated = state.questActive && isBeginner && daysIntoQuest < 7;

  // v10.0: Habits removed from primary nav. It's a configuration interface,
  // not a daily-use tab. Reachable via Settings.
  // v12.2: added Review tab — the engagement chart. Gated for beginners in
  // their first 7 days (same logic as Path) because a chart with no data is
  // just empty space that invites comparison-mind.
  const reviewGated = pathGated;
  // v13.6 — Study tab. Surfaces the SRS flashcard system (srsEnsure,
  // srsRate, srsDueToday) as a first-class feature rather than something
  // buried inside the Wisdom tab. Shows a badge with cards due today.
  // The engine itself (per-card ease, intervals, question selection) was
  // already present from earlier versions; this tab is the missing front
  // door.
  let studyLabel = t('nav.tab_study');
  if (view.currentMember) {
    const due = (typeof srsDueToday === 'function') ? srsDueToday(view.currentMember) : [];
    if (due.length > 0) studyLabel = t('nav.tab_study_badge', {n: due.length});
  }

  const tabs = state.questActive ? [
    ['today',      t('nav.tab_today')],
    ...(pathGated ? [] : [['path', t('nav.tab_path')]]),
    ['reflection', reflectionLabel],
    ...(reviewGated ? [] : [['review', t('nav.tab_review')]]),
    ['wisdom',     t('nav.tab_wisdom')],
    ['study',      studyLabel],
    ['sangha',     t('nav.tab_sangha')],
    ['settings',   t('nav.tab_settings')]
  ] : [
    ['today',      t('nav.tab_today')],
    ['reflection', reflectionLabel],
    ['settings',   t('nav.tab_settings')]
  ];

  // If the user is currently on a gated tab, gently bounce them to Today
  if ((pathGated && view.tab === 'path') || (reviewGated && view.tab === 'review')) {
    view.tab = 'today';
  }

  return `
    <nav class="flex gap-2 mb-5 overflow-x-auto scrollbar pb-2">
      ${tabs.map(([k,n]) => `
        <button onclick="showTab('${k}')" class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border ${view.tab===k?'tab-active':'parchment hover:parchment-active'}">${n}</button>
      `).join('')}
      ${pathGated ? `
        <button title="${t('nav.tab_path_gated_tooltip')}" class="px-3 py-2 rounded-lg text-xs border border-amber-900/40 text-amber-300/50 whitespace-nowrap cursor-not-allowed opacity-75">
          ${t('nav.tab_path_gated_label')}
        </button>
      ` : ''}
    </nav>
  `;
}

// ============================================================================
// TODAY TAB
// ============================================================================

// INLINE-JS: render/today.js

// v9.2: redirect legacy "open army from today" calls to the path viewer,
// which is the only place armies now live. Kept for backward compatibility
// with any remaining references; safe to remove entirely once all callers
// have been migrated.
