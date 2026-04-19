// ============================================================================
// render/today.js
// ----------------------------------------------------------------------------
// The daily Today view — the highest-traffic surface in the app.
// Renders the full stack: banners (sustained advance / primary alert / bump
// offer / downgrade offer / stage preview / paused), the Ajahn Chah teaching
// card, the Next Step + Quote two-column hero with pre-sit intention inset,
// the three-column Meditation / Reading / Reflection grid, the intention
// readback, and the sangha activity block.
//
// Canonical hot spots referenced:
//   - Anupubbasikkhā (gradual training) — bump offer body
//   - Padhāna Sutta Sn 3.2 — intention inset's five-hindrance-to-army mapping
//   - Buddha's "consistency over duration" — downgrade offer body
//
// ----------------------------------------------------------------------------
// Dependencies (all read from the concatenated global scope):
//
//   State:     state (log, path, habits, members, currentStage, questActive,
//                     questStartDate, stageStartDate, keyHabitDaysAtStage,
//                     pendingBumpOffer, pendingDowngradeOffer, dismissedStagePreview,
//                     reflectionLog, sitRecords, diagnostics, questPaused)
//              view (currentMember)
//
//   Engine:    t() from engine/i18n.js
//              diagnostic-related: (none directly, but many callers)
//              rank-gate-related: (none directly)
//
//   Helpers:   todayKey, dayScore, maxDayScore, daysBetween
//              isDailyReflectionDoneToday, isMonthlyReflectionAvailable,
//                isWeeklyReflectionAvailable, isWeeklySummaryDue,
//                getCurrentMonthly, getCurrentWeekly, daysSinceReflectionStart
//              getDailyTeaching, quoteIsSaved
//              isQuestPaused, getFocusForNow, topTwoHindrances
//              pickNextStep, classifyMeditationHabit
//              getCurrentFoundation, hasReadSutta, computeMemberRank
//              srsCardsForSutta
//              getTodayIntention, getSanghaActivityToday
//
//   Data:      STAGES, FIVE_HINDRANCES, MARA_ARMIES, SUTTA_LIBRARY
//
// When Level 3 refactoring completes, these dependencies will be split into
// src/state/, src/systems/, and src/data/ modules — all still resolved from
// global scope in the built single-file artifact.
// ============================================================================

function renderToday() {
  const habits = state.habits.filter(h => h.who === 'all' || h.who === view.currentMember);
  if (habits.length === 0) {
    return `<div class="parchment rounded-xl p-8 text-center fade-in">
      <div class="text-5xl mb-3">🌱</div>
      <p class="text-amber-100/70 mb-4">${t('today.no_habits.body')}</p>
      <button class="btn btn-gold" onclick="showTab('habits')">${t('today.no_habits.button')}</button>
    </div>`;
  }

  const log = (state.log[todayKey()] && state.log[todayKey()][view.currentMember]) || {};
  const score = dayScore(view.currentMember, todayKey());
  const max = maxDayScore(view.currentMember);
  const pct = max > 0 ? Math.round((score/max)*100) : 0;

  // v9.2: the old "armies in this stage" variable was removed along with
  // the Today-tab Māra's forces block. The hindrances and defilements now
  // live canonically in the path viewer, not on the dashboard.

  // v9.3: sustained-day advance toast — quiet feedback when the three-legged
  // gate passed today and the sustained counter ticked up by one. Not a
  // celebration, just an acknowledgment. Dismissible with a tap.
  let sustainedAdvanceBanner = '';
  const pathRec = state.path?.[view.currentMember];
  if (pathRec?.pendingSustainedAdvance) {
    const adv = pathRec.pendingSustainedAdvance;
    sustainedAdvanceBanner = `
      <button onclick="dismissSustainedAdvance()" class="rounded-xl p-3 mb-4 w-full text-left border border-emerald-700/40 bg-emerald-900/15 hover:bg-emerald-900/25 transition flex items-center gap-3">
        <div class="text-lg">🌱</div>
        <div class="flex-1">
          <div class="text-[10px] uppercase tracking-wider text-emerald-300/80">${t('today.sustained_advance.eyebrow')}</div>
          <div class="text-xs text-emerald-100">${t('today.sustained_advance.body', {day: adv.toDay})}</div>
        </div>
        <div class="text-[10px] text-emerald-300/50">${t('today.sustained_advance.dismiss_hint')}</div>
      </button>
    `;
  }

  // v8: ONE primary alert at the top, prioritized.
  // Priority: monthly reflection > weekly summary due > weekly reflection >
  //           daily reflection (only late in the day, only if actually missing)
  const dailyDone = isDailyReflectionDoneToday();
  const monthlyAvail = isMonthlyReflectionAvailable();
  const weeklyAvail = isWeeklyReflectionAvailable();
  const weeklySummaryDue = isWeeklySummaryDue();
  const nowHour = new Date().getHours();
  let primaryAlert = '';
  if (monthlyAvail) {
    const mref = getCurrentMonthly();
    primaryAlert = `
      <button onclick="showTab('reflection')" class="parchment lotus-glow rounded-2xl p-4 mb-6 w-full text-left hover:parchment-active transition">
        <div class="flex items-center gap-3">
          <div class="text-3xl">🌕</div>
          <div class="flex-1">
            <div class="text-[10px] uppercase tracking-wider text-amber-300">${t('today.primary_alert.monthly_eyebrow')}</div>
            <div class="font-bold text-amber-100">${mref?.title || t('today.primary_alert.monthly_title_fallback')}</div>
            <div class="text-xs text-amber-100/60 mt-0.5">${t('today.primary_alert.monthly_sub')}</div>
          </div>
        </div>
      </button>
    `;
  } else if (weeklySummaryDue) {
    primaryAlert = `
      <button onclick="openWeeklySummary()" class="parchment rounded-2xl p-4 mb-6 w-full text-left hover:parchment-active transition border-amber-500/40">
        <div class="flex items-center gap-3">
          <div class="text-3xl">📊</div>
          <div class="flex-1">
            <div class="text-[10px] uppercase tracking-wider text-amber-300">${t('today.primary_alert.weekly_summary_eyebrow')}</div>
            <div class="text-xs text-amber-100/70 mt-0.5">${t('today.primary_alert.weekly_summary_sub')}</div>
          </div>
        </div>
      </button>
    `;
  } else if (weeklyAvail && (daysSinceReflectionStart() % 7) >= 5) {
    const wref = getCurrentWeekly();
    primaryAlert = `
      <button onclick="showTab('reflection')" class="parchment rounded-2xl p-4 mb-6 w-full text-left hover:parchment-active transition border-amber-500/40">
        <div class="flex items-center gap-3">
          <div class="text-3xl">📖</div>
          <div class="flex-1">
            <div class="text-[10px] uppercase tracking-wider text-amber-300">${t('today.primary_alert.weekly_eyebrow')}</div>
            <div class="font-bold text-amber-100">${wref?.title || t('today.primary_alert.weekly_title_fallback')}</div>
            <div class="text-xs text-amber-100/60 mt-0.5">${t('today.primary_alert.weekly_sub')}</div>
          </div>
        </div>
      </button>
    `;
  } else if (!dailyDone && nowHour >= 17) {
    primaryAlert = `
      <button onclick="showTab('reflection')" class="rounded-xl p-3 mb-6 w-full text-left hover:bg-amber-900/10 transition border border-amber-700/20 flex items-center gap-2">
        <div class="text-base">🪞</div>
        <div class="flex-1 text-xs text-amber-300/70">${t('today.primary_alert.daily_sub')}</div>
      </button>
    `;
  }

  // Helper: slot label via stable ID → t() map (lesson #7).
  const slotLabel = (slot) => {
    if (slot === 'morning') return t('today.slot.morning');
    if (slot === 'midday')  return t('today.slot.midday');
    if (slot === 'evening') return t('today.slot.evening');
    return slot;
  };

  // Bump offer — kept separate from the primary alert because it's an OFFER,
  // not an alert about something missing. Visually quieter than v7.
  let bumpBanner = '';
  if (state.pendingBumpOffer) {
    const offer = state.pendingBumpOffer;
    const bumpsText = offer.bumps.map(b => {
      if (b.addMidday) return t('today.bump.add_midday', {to: b.to});
      return t('today.bump.slot_change', {slot: slotLabel(b.slot), from: b.from, to: b.to});
    }).join(' • ');
    // v14.1 — polish. Previous copy was very short and framed acceptance as
    // the default. The dhamma-way framing is: growth is offered, not assumed.
    // Both buttons get equal visual weight so "hold steady" doesn't feel like
    // refusing a gift. The copy names that holding steady is a valid answer.
    bumpBanner = `
      <div class="parchment rounded-2xl p-4 mb-6 border border-amber-700/40 bg-amber-950/10">
        <div class="flex items-start gap-3">
          <div class="text-2xl">📈</div>
          <div class="flex-1">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/85">${t('today.bump.eyebrow')}</div>
            <p class="text-sm text-amber-100 mt-1 leading-relaxed">${t('today.bump.body')}</p>
            <div class="text-xs text-amber-100/70 mt-2 italic">${bumpsText}</div>
            <div class="flex gap-2 mt-3">
              <button class="btn btn-gold text-xs" onclick="acceptBumpOffer()">${t('today.bump.accept_button')}</button>
              <button class="btn btn-gold text-xs" onclick="declineBumpOffer()" style="background:linear-gradient(135deg,rgba(244,228,188,0.15),rgba(212,168,87,0.1));color:#e6dcc8;border:1px solid rgba(212,168,87,0.4);box-shadow:none;">${t('today.bump.hold_button')}</button>
            </div>
            <p class="text-[10px] text-amber-100/50 italic mt-2">${t('today.bump.footer_note')}</p>
          </div>
        </div>
      </div>
    `;
  }

  // v11: compassionate downgrade — mirrors the bump offer in tone, but the
  // language is teacher-voice and the framing is the Buddha's ("consistency
  // over duration"). No penalty either way, and the Shadow is released on
  // accept so the rollout doesn't punish the adjustment.
  let downgradeBanner = '';
  if (state.pendingDowngradeOffer) {
    const d = state.pendingDowngradeOffer;
    const dropsText = d.drops.map(x => {
      if (x.removeMidday) return t('today.downgrade.remove_midday');
      return t('today.bump.slot_change', {slot: slotLabel(x.slot), from: x.from, to: x.to});
    }).join(' • ');
    // v14.1 — polish. Equal button weight so neither choice is framed as
    // the correct one. The copy already named both as honorable; the visual
    // now matches.
    downgradeBanner = `
      <div class="parchment rounded-2xl p-4 mb-6 border border-purple-500/40 bg-purple-950/15">
        <div class="flex items-start gap-3">
          <div class="text-2xl">🪷</div>
          <div class="flex-1">
            <div class="text-[10px] uppercase tracking-wider text-purple-300/85">${t('today.downgrade.eyebrow')}</div>
            <p class="text-sm text-amber-100 mt-1 leading-relaxed">${t('today.downgrade.body', {misses: d.misses, windowDays: d.windowDays})}</p>
            <div class="text-xs text-amber-100/70 mt-2 italic">${dropsText}</div>
            <div class="flex gap-2 mt-3">
              <button class="btn btn-gold text-xs" onclick="acceptDowngradeOffer()">${t('today.downgrade.accept_button')}</button>
              <button class="btn btn-gold text-xs" onclick="declineDowngradeOffer()" style="background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(120,50,200,0.1));color:#e6dcc8;border:1px solid rgba(168,85,247,0.4);box-shadow:none;">${t('today.downgrade.keep_button')}</button>
            </div>
            <p class="text-[10px] text-amber-100/50 italic mt-2">${t('today.downgrade.footer_note')}</p>
          </div>
        </div>
      </div>
    `;
  }

  // v11.1 — weekly arc preview. When the practitioner is within 3 days of
  // advancing to the next stage AND the current stage is not the last,
  // a quiet preview card appears. This gives the day-to-day a seasonal
  // arc — "what's coming" is visible before it arrives. Not celebratory,
  // not aggressive. Just: there is more ahead, and it looks like this.
  let stagePreviewBanner = '';
  if (state.questActive && state.currentStage < STAGES.length - 1) {
    const curStage = STAGES[state.currentStage];
    const nextStage = STAGES[state.currentStage + 1];
    const daysAtStage = state.stageStartDate ? daysBetween(state.stageStartDate, todayKey()) : 0;
    const keyDays = state.keyHabitDaysAtStage || 0;
    const daysLeft = Math.max(0, curStage.minDays - daysAtStage);
    const keyDaysLeft = Math.max(0, curStage.requiredKeyHabitDays - keyDays);
    const nearAdvance = daysLeft <= 3 && keyDaysLeft <= 3 && (daysLeft > 0 || keyDaysLeft > 0);
    const dismissed = state.dismissedStagePreview === state.currentStage;
    if (nearAdvance && !dismissed && nextStage) {
      const ahead = Math.max(daysLeft, keyDaysLeft);
      // Plural split via static keys (lesson #8).
      const aheadLabel = ahead === 1
        ? t('today.stage_preview.days_ahead_one', {ref: nextStage.suttaRef})
        : t('today.stage_preview.days_ahead_many', {ref: nextStage.suttaRef, n: ahead});
      stagePreviewBanner = `
        <div class="parchment rounded-2xl p-4 mb-6 border border-emerald-700/40 bg-emerald-950/10">
          <div class="flex items-start gap-3">
            <div class="text-2xl">${nextStage.icon}</div>
            <div class="flex-1">
              <div class="text-[10px] uppercase tracking-wider text-emerald-300/80">${t('today.stage_preview.eyebrow')}</div>
              <div class="text-sm font-bold text-amber-100 mt-0.5">${nextStage.name} <span class="text-xs text-amber-200/60 font-normal italic">— ${nextStage.subtitle}</span></div>
              <p class="text-xs text-amber-100/75 italic mt-1 leading-relaxed">${nextStage.description.split('.').slice(0, 2).join('.')}...</p>
              <div class="text-[10px] text-amber-100/55 mt-2">${aheadLabel}</div>
              <button onclick="dismissStagePreview()" class="text-[10px] text-amber-300/60 hover:text-amber-200 underline mt-2">${t('today.stage_preview.dismiss')}</button>
            </div>
          </div>
        </div>
      `;
    }
  }

  // v8.1: Today's Practice bar REMOVED — per-member progress is already shown
  // in the members bar at the top of the page. Showing it again here was
  // duplicate noise. The Ajahn Chah teaching earns the prime position instead.
  const ajahnChah = getDailyTeaching();
  // Source-dependent header — static key per branch (lesson #3).
  const teachingHeader = ajahnChah.source && ajahnChah.source.startsWith('The Buddha') ? t('today.teaching.header_buddha')
    : ajahnChah.source === 'Ajahn Chah' ? t('today.teaching.header_chah')
    : ajahnChah.source === 'Thich Nhat Hanh' ? t('today.teaching.header_nhat_hanh')
    : ajahnChah.source && ajahnChah.source.includes('Dalai Lama') ? t('today.teaching.header_dalai_lama')
    : t('today.teaching.header_generic');
  // v13.5 — save-quote feature: tap the heart to add this teaching to your
  // collection. Saved quotes live in state.savedQuotes[memberId] as an array
  // of { index, savedAt }. They are reviewable in the Review tab and
  // exportable alongside reflections.
  const isQuoteSaved = quoteIsSaved(view.currentMember, ajahnChah.index);
  const ajahnCard = `
    <div data-component="today.daily_teaching_card" class="parchment rounded-2xl p-5 mb-5 fade-in border-amber-700/30">
      <div class="flex items-start gap-3">
        <div class="text-3xl">🌳</div>
        <div class="flex-1">
          <div class="flex items-start justify-between gap-2 mb-1">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${teachingHeader}</div>
            <button data-component="today.daily_teaching_card.save_button" onclick="toggleQuoteSaved(${ajahnChah.index})"
                    class="flex items-center gap-1 text-xs ${isQuoteSaved ? 'text-rose-400 hover:text-rose-300' : 'text-amber-300/70 hover:text-rose-300'} transition shrink-0"
                    title="${isQuoteSaved ? t('today.teaching.saved_tooltip') : t('today.teaching.save_tooltip')}">
              <span class="text-lg">${isQuoteSaved ? '♥' : '♡'}</span>
              <span class="hidden sm:inline">${isQuoteSaved ? t('today.teaching.saved_label') : t('today.teaching.save_label')}</span>
            </button>
          </div>
          <p class="serif text-base text-amber-100/95 leading-relaxed italic">"${ajahnChah.text}"</p>
          <p class="text-[10px] text-amber-300/60 mt-2 text-right">— ${ajahnChah.source}</p>
        </div>
      </div>
    </div>
  `;

  // v10.1: paused banner at top of Today when quest is paused
  let pausedBanner = '';
  if (isQuestPaused()) {
    const p = state.questPaused;
    const sinceDate = new Date(p.since);
    const daysPaused = Math.max(1, Math.round((Date.now() - sinceDate.getTime()) / 86400000));
    // Plural via static keys (lesson #8). Reason falls back to a translatable key.
    const reasonStr = p.reason || t('today.paused.reason_fallback');
    const pausedBody = daysPaused === 1
      ? t('today.paused.body_one', {reason: reasonStr})
      : t('today.paused.body_many', {reason: reasonStr, n: daysPaused});
    pausedBanner = `
      <button onclick="openResumeModal()" class="parchment rounded-xl p-3 mb-4 w-full text-left border border-purple-500/50 bg-purple-950/20 hover:bg-purple-900/25 transition flex items-center gap-3">
        <div class="text-2xl">⏸</div>
        <div class="flex-1">
          <div class="text-[10px] uppercase tracking-wider text-purple-300/80">${t('today.paused.eyebrow')}</div>
          <div class="text-sm text-amber-100">${pausedBody}</div>
          <div class="text-[11px] text-purple-200/70 italic mt-0.5">${t('today.paused.tap_to_resume')}</div>
        </div>
      </button>
    `;
  }
  let html = pausedBanner + sustainedAdvanceBanner + primaryAlert + bumpBanner + downgradeBanner + stagePreviewBanner;

  // v9.11: NEXT STEP HERO + AJAHN CHAH QUOTE — two-column row.
  // Left column (60%): the Next Step CTA, the single decision-point card.
  // Right column (40%): the day's Ajahn Chah quote, where the engine tries
  // to match the quote to the current dominant hindrance when possible.
  // On mobile the columns stack; on laptop they sit side by side.
  const nextStep = pickNextStep(view.currentMember);
  const nextStepBgClass = nextStep.color === 'amber-bright' ? 'bg-amber-900/30 border-amber-500/70'
    : nextStep.color === 'amber-quiet' ? 'bg-amber-950/30 border-amber-900/40 opacity-75'
    : nextStep.color === 'emerald' ? 'bg-emerald-900/20 border-emerald-600/60'
    : nextStep.color === 'rest' ? 'bg-purple-950/20 border-purple-700/40'
    : 'bg-amber-950/30 border-amber-900/40';
  const nextStepCtaClass = nextStep.color === 'amber-bright' ? 'btn-gold'
    : nextStep.color === 'emerald' ? 'btn-gold'
    : 'btn-ghost';

  // Pre-sit intention inset — only when next step is a sit
  let intentionInset = '';
  if ((nextStep.type === 'morning_sit' || nextStep.type === 'midday_sit' || nextStep.type === 'evening_sit') && view.currentMember) {
    const focus = getFocusForNow(view.currentMember);
    const top = topTwoHindrances(view.currentMember);
    const dom = top[0] ? FIVE_HINDRANCES.find(h => h.id === top[0].id) : null;
    // v12 — name the Māra army that corresponds to the dominant hindrance,
    // so the sit has a named opponent. The five hindrances map to specific
    // armies from the Padhāna Sutta (Sn 3.2). Makes the canonical frame
    // ("you are facing the forces the Bodhisatta faced") felt in the
    // daily loop, not just visible in the Path tab.
    const hindranceToArmy = {
      sensual: 1,   // Kāmā — sense pleasures
      restless: 2,  // Arati — discontent (closest match to restlessness)
      sloth: 5,     // Thīna-middha — sloth and torpor
      doubt: 7,     // Vicikicchā — doubt
      illwill: 8    // Makkha-thambha — stubbornness/hypocrisy (closest of the ten)
    };
    const maraArmy = dom ? MARA_ARMIES.find(a => a.id === hindranceToArmy[dom.id]) : null;
    // Cultivate focus — if release mode, the focus is sati; otherwise the
    // bare title (with the "Let go of:"/"Cultivate:"/"Deepen:" prefix stripped).
    const cultivateFocus = focus.mode === 'release'
      ? t('today.intention.cultivate_sati')
      : focus.title.replace(/^(Let go of: |Cultivate: |Deepen: )/, '');
    intentionInset = `
      <div class="mt-3 pt-3 border-t border-amber-900/30 text-[11px] text-amber-100/80">
        <div class="text-[9px] uppercase tracking-wider text-amber-300/65 mb-1">${t('today.intention.eyebrow')}</div>
        <div>${t('today.intention.cultivate_with_focus', {focus: cultivateFocus})}</div>
        ${dom
          ? `<div class="mt-0.5">${t('today.intention.observe_with_hindrance', {icon: dom.icon, pali: dom.pali, english: dom.english})}</div>`
          : `<div class="mt-0.5 text-amber-100/55 italic">${t('today.intention.no_dominant')}</div>`}
        ${maraArmy ? `<div class="mt-0.5">${t('today.intention.stand_against', {icon: maraArmy.icon, name: maraArmy.name, english: maraArmy.english, suttaRef: maraArmy.suttaRef})}</div>` : ''}
        <div class="text-[10px] text-amber-100/50 italic mt-1">${t('today.intention.footer_note')}</div>
      </div>
    `;
  }

  // Left card — the Next Step
  const nextStepCard = `
    <div data-component="today.next_step_card" class="parchment rounded-2xl p-5 border-2 ${nextStepBgClass} h-full flex flex-col">
      <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('today.next_step.eyebrow')}</div>
      <div class="flex items-start gap-3 flex-1">
        <div class="text-5xl">${nextStep.icon}</div>
        <div class="flex-1">
          <h2 class="text-xl font-bold gold-text leading-tight">${nextStep.title}</h2>
          <p class="text-sm text-amber-100/75 italic mt-1">${nextStep.subtitle}</p>
          ${nextStep.cta && nextStep.action ? `
            <button onclick="${nextStep.action}" class="btn ${nextStepCtaClass} mt-3 text-sm">${nextStep.cta}</button>
          ` : ''}
          ${intentionInset}
        </div>
      </div>
    </div>
  `;

  // Right card — curated teaching (matched to dominant hindrance when possible)
  const matchedHindrance = ajahnChah.matchedTo ? FIVE_HINDRANCES.find(h => h.id === ajahnChah.matchedTo) : null;
  const quoteCard = `
    <div class="parchment rounded-2xl p-5 h-full flex flex-col border border-amber-700/30">
      <div class="flex items-start gap-3 flex-1">
        <div class="text-2xl">🌳</div>
        <div class="flex-1">
          <div class="flex items-baseline justify-between mb-1">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${teachingHeader}</div>
            ${matchedHindrance ? `<div class="text-[9px] text-amber-300/55 italic" title="${t('today.teaching.matched_tooltip')}">${t('today.teaching.matched_to', {pali: matchedHindrance.pali})}</div>` : ''}
          </div>
          <p class="serif text-sm text-amber-100/95 leading-relaxed italic">"${ajahnChah.text}"</p>
          <p class="text-[10px] text-amber-300/60 mt-2 text-right">— ${ajahnChah.source}</p>
        </div>
      </div>
    </div>
  `;

  // Two-column laptop layout, stacks on mobile
  const heroRow = `
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
      <div class="md:col-span-3">${nextStepCard}</div>
      <div class="md:col-span-2">${quoteCard}</div>
    </div>
  `;
  html = heroRow + html;

  // v10.1: Today — three-column grid (Meditation / Reading / Reflection)
  // The whole day's arc visible at a glance. Each column owns one category;
  // each item is clickable directly. Next Step CTA above pulls the next
  // undone item across all three columns.
  if (view.currentMember) {
    const mid = view.currentMember;
    const dk = todayKey();

    // Category subtitle via stable ID → t() map (lesson #7).
    const medCategorySub = (cat) => {
      if (cat === 'sit') return t('today.med.sub_sit');
      if (cat === 'walking') return t('today.med.sub_walking');
      if (cat === 'metta') return t('today.med.sub_metta');
      return t('today.med.sub_meditation');
    };

    // ---- Meditation column items: classify configured habits ----
    const medItems = [];
    for (const h of habits) {
      const cat = classifyMeditationHabit(h);
      if (cat) {
        medItems.push({
          icon: cat === 'sit' ? '🪑' : cat === 'walking' ? '🚶' : cat === 'metta' ? '🤲' : '🧘',
          label: h.name,
          sub: medCategorySub(cat),
          done: log[h.id] === true,
          action: `handleHabitTap('${h.id}')`,
          category: cat
        });
      }
    }
    // Show metta as a faded suggestion if not yet configured
    if (!medItems.find(x => x.category === 'metta')) {
      medItems.push({
        icon: '🤲',
        label: t('today.med.metta_label'),
        sub: t('today.med.suggestion_sub'),
        done: false,
        action: `showTab('habits')`,
        category: 'metta',
        suggestion: true
      });
    }
    if (!medItems.find(x => x.category === 'walking')) {
      medItems.push({
        icon: '🚶',
        label: t('today.med.walking_label'),
        sub: t('today.med.suggestion_sub'),
        done: false,
        action: `showTab('habits')`,
        category: 'walking',
        suggestion: true
      });
    }

    // ---- Reading column items: foundation + sutta of the day ----
    const readItems = [];
    const foundation = getCurrentFoundation();
    const foundationSutta = foundation ? SUTTA_LIBRARY.find(s => s.id === foundation.suttaId) : null;
    const foundationRead = foundationSutta ? hasReadSutta(mid, foundationSutta.id) : false;
    if (foundationSutta) {
      readItems.push({
        icon: foundationRead ? '✓' : '☸️',
        label: t('today.reading.foundation_label', {week: foundation.week}),
        sub: t('today.reading.foundation_sub', {ref: foundationSutta.ref, name: foundationSutta.name}),
        done: foundationRead,
        action: `openSutta('${foundationSutta.id}')`
      });
    }
    if (foundationRead) {
      // v11.1 — contract week 1 for beginners. A first-time practitioner
      // on day 3 does not need a hindrance-matched sutta alongside the
      // foundation reading; it multiplies cognitive load. The extra
      // reading opens on day 8. Experienced practitioners see it
      // immediately because they asked for rich material.
      const firstDiag = state.diagnostics?.onboarding?.[mid]?.answers;
      const isBeginner = firstDiag && (firstDiag.experience === 'none' || firstDiag.experience === 'some');
      const daysIntoQuest = state.questStartDate ? daysBetween(state.questStartDate, todayKey()) : 0;
      const weekOneContraction = isBeginner && daysIntoQuest < 7;
      if (!weekOneContraction) {
        const top = topTwoHindrances(mid);
        const myRank = computeMemberRank(mid);
        if (top && top[0]) {
          const tag = top[0].id;
          const candidates = SUTTA_LIBRARY.filter(s =>
            s.teaches.includes(tag) &&
            s.minRank <= myRank &&
            !hasReadSutta(mid, s.id) &&
            (!foundationSutta || s.id !== foundationSutta.id)
          );
          if (candidates.length > 0) {
            const dayHash = todayKey().split('-').reduce((s, n) => s + parseInt(n, 10), 0);
            const sotd = candidates[dayHash % candidates.length];
            const matchHind = FIVE_HINDRANCES.find(h => h.id === tag);
            const sotdSub = matchHind
              ? t('today.reading.sotd_sub_matched', {ref: sotd.ref, name: sotd.name, pali: matchHind.pali})
              : t('today.reading.sotd_sub', {ref: sotd.ref, name: sotd.name});
            readItems.push({
              icon: '📜',
              label: t('today.reading.sotd_label'),
              sub: sotdSub,
              done: false,
              action: `openSutta('${sotd.id}')`
            });
          }
        }
      }
    }

    // ---- Reflection column items: journal, evening close, weekly, monthly ----
    const reflItems = [];
    const dailyReflection = state.reflectionLog?.[dk]?.[mid]?.daily;
    const oneliner = state.reflectionLog?.[dk]?.[mid]?.oneline;
    const journalDone = !!(dailyReflection || oneliner);
    const journalText = oneliner?.text || dailyReflection?.answer || '';
    // Journal sub: excerpt (data), fallback to "written" label, or default prompt.
    const journalSub = journalDone
      ? ((journalText.length > 50 ? journalText.slice(0, 50) + '…' : journalText) || t('today.refl.journal_sub_written'))
      : t('today.refl.journal_sub_default');
    reflItems.push({
      icon: journalDone ? '✓' : '✍️',
      label: t('today.refl.journal_label'),
      sub: journalSub,
      done: journalDone,
      action: journalDone ? `showTab('reflection')` : 'openOnelineJournal()'
    });
    // v13.4 — evening close "done" state actually reflects whether the
    // evening reflection was completed today. Without this the item stays
    // visually undone all day even after a real close.
    const eveningCloseDone = !!(state.reflectionLog?.[dk]?.[mid]?.daily?.eveningClose
      || state.reflectionLog?.[dk]?.[mid]?.deeper
      || state.reflectionLog?.[dk]?.[mid]?.evening);
    reflItems.push({
      icon: eveningCloseDone ? '✓' : '🪞',
      label: t('today.refl.evening_label'),
      sub: eveningCloseDone ? t('today.refl.evening_sub_done') : t('today.refl.evening_sub_undone'),
      done: eveningCloseDone,
      action: eveningCloseDone ? `showTab('reflection')` : 'openEveningClose()'
    });
    const weeklyAvail = !!(typeof isWeeklyReflectionAvailable === 'function' && isWeeklyReflectionAvailable());
    const monthlyAvail = !!(typeof isMonthlyReflectionAvailable === 'function' && isMonthlyReflectionAvailable());
    const weeklyDone = state.reflectionLog?.[dk]?.[mid]?.weekly;
    const monthlyDone = state.reflectionLog?.[dk]?.[mid]?.monthly;
    // v13.4 — only surface weekly/monthly when they are genuinely due now
    // (or completed this period so the practitioner can see the ✓).
    // An "available in 6 days" tile in the column was noise the user asked
    // to remove — same principle we applied to the Reflection tab in v12.6.
    if (weeklyAvail) {
      reflItems.push({
        icon: weeklyDone ? '✓' : '📖',
        label: t('today.refl.weekly_label'),
        sub: weeklyDone ? t('today.refl.weekly_sub_done') : t('today.refl.weekly_sub_undone'),
        done: !!weeklyDone,
        action: `showTab('reflection')`
      });
    }
    if (monthlyAvail) {
      reflItems.push({
        icon: monthlyDone ? '✓' : '🌕',
        label: t('today.refl.monthly_label'),
        sub: monthlyDone ? t('today.refl.monthly_sub_done') : t('today.refl.monthly_sub_undone'),
        done: !!monthlyDone,
        action: `showTab('reflection')`
      });
    }

    // ---- Render the three-column grid ----
    const renderItem = (it) => `
      <button onclick="${it.action}" class="w-full text-left p-2.5 hover:bg-amber-900/10 transition flex items-start gap-2.5 ${it.done ? 'opacity-65' : ''} ${it.suggestion ? 'opacity-50 italic' : ''}">
        <div class="text-lg shrink-0 mt-0.5">${it.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="text-[12px] text-amber-100 leading-tight">${it.label}</div>
          <div class="text-[10px] text-amber-100/60 italic mt-0.5 leading-snug">${it.sub}</div>
        </div>
      </button>
    `;
    const renderColumn = (headerText, items, doneCount) => `
      <div class="parchment rounded-xl border border-amber-900/40 flex flex-col">
        <div class="px-3 py-2 border-b border-amber-900/30 flex items-baseline justify-between">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${headerText}</div>
          <div class="text-[10px] text-amber-100/50">${t('today.columns.progress', {done: doneCount, total: items.length})}</div>
        </div>
        <div class="divide-y divide-amber-900/20 flex-1">
          ${items.length > 0 ? items.map(renderItem).join('') : `<div class="text-[11px] text-amber-100/45 italic p-3">${t('today.columns.empty')}</div>`}
        </div>
      </div>
    `;

    const medDone = medItems.filter(x => x.done && !x.suggestion).length;
    const medTotal = medItems.filter(x => !x.suggestion).length;
    const readDone = readItems.filter(x => x.done).length;
    const reflDone = reflItems.filter(x => x.done).length;

    html += `
      <div class="mb-5">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2 px-2">${t('today.columns.today_label')}</div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          ${renderColumn(t('today.columns.meditation_header'), medItems, medDone)}
          ${renderColumn(t('today.columns.reading_header'), readItems, readDone)}
          ${renderColumn(t('today.columns.reflection_header'), reflItems, reflDone)}
        </div>
      </div>
    `;
  }

  // v9.11 Turn B: Today's intention readback. After any sit has been done,
  // show the day's intention quietly at the bottom — what the player set
  // out to cultivate and observe this morning. Adhitthāna made trackable.
  if (view.currentMember) {
    const intent = getTodayIntention(view.currentMember);
    if (intent) {
      const dk = todayKey();
      const sitsToday = (state.sitRecords || []).filter(r => r.memberId === view.currentMember && r.date === dk).length;
      if (sitsToday > 0) {
        const obs = intent.observe ? FIVE_HINDRANCES.find(h => h.id === intent.observe) : null;
        // Static key per branch — with vs without observe (lesson #3).
        const readbackBody = obs
          ? t('today.intention_readback.with_observe', {cultivate: intent.cultivate, pali: obs.pali, english: obs.english})
          : t('today.intention_readback.no_observe', {cultivate: intent.cultivate});
        html += `
          <div class="rounded-xl p-3 mb-5 border border-amber-700/20 bg-amber-950/15">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('today.intention_readback.eyebrow')}</div>
            <div class="text-[11px] text-amber-100/80 leading-relaxed">
              ${readbackBody}
            </div>
          </div>
        `;
      }
    }
  }

  // v8: Sangha presence — only shown when there's actually something to say.
  // Quiet days show nothing here; active sanghas with triggered abilities or
  // crossed thresholds get a small acknowledgment.
  const sanghaActivity = getSanghaActivityToday(view.currentMember);
  if (sanghaActivity.length > 0) {
    html += `<div class="mb-5">
      <div class="text-[10px] uppercase tracking-wider text-amber-300/60 mb-2 px-2">${t('today.sangha.section_label')}</div>
      <div class="parchment rounded-2xl p-4 space-y-2">
        ${sanghaActivity.map(line => `
          <div class="flex items-start gap-2">
            <div class="text-base leading-tight">${line.icon}</div>
            <div class="text-xs text-amber-100/80 leading-relaxed flex-1">
              <span class="text-amber-200 font-bold">${line.char}</span> ${line.text}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  // v10.1: removed standalone "Teacher's guidance" card. The pre-sit intention
  // inset inside the Next Step card now carries the same canonical guidance,
  // surfaced exactly when the player is about to act on it (rather than as
  // a separate row at the bottom of Today competing for attention).

  // v9.2: the old "Māra's forces active" Today-tab section has been removed.
  // It contradicted the Layer 2 framing in the path viewer — the same armies
  // were shown as both "defeatable in 3 days" (old) and "lifelong persistent
  // work" (new). The armies now live canonically in the path viewer only.

  // v8.1: Ajahn Chah is now in prime position at the top, no footer version.
  return html;
}
