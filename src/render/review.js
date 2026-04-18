// ============================================================================
// render/review.js
// ----------------------------------------------------------------------------
// The 📈 Review tab — quiet totals and 12-week trend charts.
//
// Contract (v12.5): Review leads toward shedding (seeing the work done),
// not accumulation (piling up numbers to impress). AN 8.51 filter check:
// leads toward contentment ("this is what is"), not discontent ("I should
// do more"). This is why there's no "streak compared to best streak" or
// "you're X% below your peak" framing — those are Strava-cosmetic.
//
// Cards (in order):
//   - Totals since starting (small, factual)
//   - Minutes sat per week, last 12 weeks (bar chart via renderSparkline)
//   - Reflections written, last 12 weeks
//   - Dominant hindrance per week, last 8 weeks (trend)
//
// Gated for beginners in their first 7 days (same logic as Path tab) —
// a trend chart with 3 data points is just empty space that invites
// comparison-mind.
//
// Dependencies (from global scope):
//   State:     state (sitRecords, reflectionLog, diagnostics, questStartDate,
//                     members, wisdomCollected, path)
//              view (currentMember)
//   Engine:    t() from engine/i18n.js
//   Helpers:   todayKey, daysBetween, getTisikkha, computeMemberRank,
//              totalXP, getSittingStats, weekOf, isoWeekKey,
//              dominantHindrancePerWeek, reflectionsPerWeek, minutesPerWeek
//   Renderers: renderSparkline (SVG helper)
// ============================================================================


// ============================================================================
// v9.5 — WISDOM TAB (consolidates Foundations + Meditation guidance + Codex)
// ============================================================================
// The Wisdom tab is a reading / reference tab — the heavy teaching material
// lives here, while the Path tab is the visual at-a-glance status. Everything
// clickable from the Path tab lands here. No new teaching content is written;
// this tab routes to existing constants (FOUR_NOBLE_TRUTHS, EIGHTFOLD_PATH,
// FIVE_HINDRANCES, SEVEN_FACTORS, MARA_ARMIES, PATH_RANKS, PATH_LAYERS,
// TEN_FETTERS, NOBLE_PERSONS, WISDOM_SCROLLS, GUIDED_FLOWS) and existing
// modals (openFoundations, openMeditationTutorial, openGuidedFlow).
// ============================================================================

// ============================================================================
// v12.2 — REVIEW TAB (engagement chart)
// ============================================================================
// The long-arc view. What you did over weeks and months, so that the work
// the adze has done on the handle becomes visible (SN 22.101). Deliberately
// NOT pressuring: no comparison to other users, no "goal lines," no streaks
// on the front, no "you should have done X this week" messaging. The chart
// is descriptive only.
//
// What it shows:
//   — sits per week, last 12 weeks (bar chart)
//   — minutes sat per week, last 12 weeks (bar chart)
//   — reflections written, last 12 weeks
//   — which hindrance was dominant in each of the last 8 weeks (trend)
//   — a small "totals since starting" block
//
// AN 8.51 filter check: leads toward shedding (seeing the work done),
// not accumulation (piling up numbers to impress). Leads toward contentment
// ("this is what is"), not discontent ("I should do more"). Passes.
// ============================================================================

function renderReview() {
  const mid = view.currentMember;
  if (!mid) return `<div class="parchment rounded-xl p-6 text-center text-amber-100/70">${t('review.no_member')}</div>`;

  // v12.5 — how long has this practitioner actually been going? Don't
  // visualize 12 weeks if they started 3 days ago. That's Strava-cosmetic;
  // the tradition says descriptive, not decorative.
  const questStart = state.questStartDate || todayKey();
  const daysOnPath = Math.max(1, daysBetween(questStart, todayKey()) + 1);
  // Number of weekly buckets to show: at least the weeks they've been here
  // (rounded up), capped at 12.
  const weeksToShow = Math.min(12, Math.max(1, Math.ceil(daysOnPath / 7)));

  // Build the buckets — week 0 = this week, week N-1 = oldest visible week.
  const weekBuckets = [];
  for (let w = weeksToShow - 1; w >= 0; w--) {
    const end = daysAgo(w * 7);
    const start = daysAgo(w * 7 + 6);
    weekBuckets.push({ start, end, index: (weeksToShow - 1) - w, sits: 0, minutes: 0, reflections: 0 });
  }

  // Count sits + minutes per bucket
  for (const r of (state.sitRecords || [])) {
    if (r.memberId !== mid) continue;
    const dk = r.date || (r.completedAt || r.at || '').slice(0, 10);
    if (!dk) continue;
    for (const b of weekBuckets) {
      if (dk >= b.start && dk <= b.end) {
        b.sits++;
        b.minutes += Math.round((r.actualSec || 0) / 60);
        break;
      }
    }
  }

  // Count reflections per bucket (any kind)
  const reflLog = state.reflectionLog || {};
  for (const dk of Object.keys(reflLog)) {
    const entry = reflLog[dk]?.[mid];
    if (!entry) continue;
    const wrote = !!(entry.daily || entry.oneline || entry.weekly || entry.monthly);
    if (!wrote) continue;
    for (const b of weekBuckets) {
      if (dk >= b.start && dk <= b.end) { b.reflections++; break; }
    }
  }

  const maxSits = Math.max(1, ...weekBuckets.map(b => b.sits));
  const maxMinutes = Math.max(1, ...weekBuckets.map(b => b.minutes));
  const maxRefls = Math.max(1, ...weekBuckets.map(b => b.reflections));

  // Totals since starting
  const totalSits = (state.sitRecords || []).filter(r => r.memberId === mid).length;
  const totalMinutes = (state.sitRecords || [])
    .filter(r => r.memberId === mid)
    .reduce((s, r) => s + Math.round((r.actualSec || 0) / 60), 0);
  const totalReflections = Object.keys(reflLog)
    .filter(dk => {
      const e = reflLog[dk]?.[mid];
      return e && (e.daily || e.oneline || e.weekly || e.monthly);
    }).length;

  // v12.5 — also tally suttas read (new card)
  const totalSuttasRead = (state.suttaRead && state.suttaRead[mid]) ? Object.keys(state.suttaRead[mid]).length : 0;
  // v13.5 — saved quotes count
  const savedQuotes = savedQuotesForMember(mid);

  // v13.0 — sutta-comprehension SRS: cards due today, total cards in study,
  // and the per-sutta breakdown for the due-now panel.
  const srsDue = srsDueToday(mid);
  const srsBySutta = {};
  for (const item of srsDue) {
    if (!srsBySutta[item.suttaId]) srsBySutta[item.suttaId] = 0;
    srsBySutta[item.suttaId]++;
  }
  const srsHasAny = (() => {
    const all = (state.suttaSrs && state.suttaSrs[mid]) || {};
    for (const sid of Object.keys(all)) {
      if (Object.keys(all[sid]).length > 0) return true;
    }
    return false;
  })();

  // Pluralized unit labels — static t() per branch.
  const daysLabel = daysOnPath === 1 ? t('review.totals.days_one') : t('review.totals.days_many');
  const sitsLabel = totalSits === 1 ? t('review.totals.sits_one') : t('review.totals.sits_many');
  const minutesLabel = totalMinutes === 1 ? t('review.totals.minutes_one') : t('review.totals.minutes_many');
  const reflLabel = totalReflections === 1 ? t('review.totals.reflections_one') : t('review.totals.reflections_many');
  const suttasLabel = totalSuttasRead === 1 ? t('review.totals.suttas_one') : t('review.totals.suttas_many');

  // Range label for chart subtitles — used in 4 places.
  const rangeLabel = weeksToShow === 1 ? t('review.charts.range_one') : t('review.charts.range_many', {n: weeksToShow});

  // Helper to render a small bar chart row. Adaptive label width so 3-week
  // views don't look stretched out.
  const barRow = (label, count, max, color) => `
    <div class="flex items-center gap-2 text-[10px]">
      <div class="w-14 text-right text-amber-100/55 truncate">${label}</div>
      <div class="flex-1 bg-amber-950/40 rounded-full h-2 overflow-hidden">
        <div class="h-full ${color}" style="width:${Math.max(2, (count / max) * 100)}%; min-width:${count > 0 ? '4px' : '0'};"></div>
      </div>
      <div class="w-8 text-amber-100/80 text-right font-mono">${count}</div>
    </div>
  `;

  // v12.5 — week labels use the dynamic weeksToShow so "12w ago" only
  // appears when there actually are 12 weeks of data. For a 3-week range
  // the oldest bucket is "3w ago", not "12w ago".
  const weekLabel = (b) => {
    const ago = (weeksToShow - 1) - b.index;
    if (ago === 0) return t('review.week_label.this_wk');
    if (ago === 1) return t('review.week_label.last_wk');
    return t('review.week_label.n_wk_ago', {n: ago});
  };

  // --- Hindrance trend ---
  // v12.5 — clamp to the same weeksToShow as the charts above. For a
  // three-week practitioner, we show three weekly glyphs, not eight.
  // Uses reflection entries' hindrance tags where present; falls back to a
  // dot when no data for that week.
  const hindranceWeeksCount = Math.min(weeksToShow, 8);
  const hindranceWeeks = [];
  for (let w = hindranceWeeksCount - 1; w >= 0; w--) {
    const end = daysAgo(w * 7);
    const start = daysAgo(w * 7 + 6);
    const counts = {};
    for (const dk of Object.keys(reflLog)) {
      if (dk < start || dk > end) continue;
      const entry = reflLog[dk]?.[mid];
      if (!entry) continue;
      const hidTag = entry.hindrance || entry.daily?.hindrance || entry.weekly?.hindrance;
      if (hidTag) counts[hidTag] = (counts[hidTag] || 0) + 1;
    }
    let dominant = null;
    for (const k of Object.keys(counts)) {
      if (!dominant || counts[k] > counts[dominant]) dominant = k;
    }
    hindranceWeeks.push({ index: (hindranceWeeksCount - 1) - w, dominant });
  }
  const hindranceRow = hindranceWeeks.map(hw => {
    const info = hw.dominant ? FIVE_HINDRANCES.find(h => h.id === hw.dominant) : null;
    const ago = (hindranceWeeksCount - 1) - hw.index;
    const label = ago === 0 ? t('review.hindrance.label_now') : t('review.hindrance.label_n_wk', {n: ago});
    const tooltip = info
      ? t('review.hindrance.tooltip_pali_english', {pali: info.pali, english: info.english})
      : t('review.hindrance.tooltip_no_data');
    return `
      <div class="flex flex-col items-center gap-0.5 flex-1">
        <div class="text-xl" title="${tooltip}">${info ? info.icon : '·'}</div>
        <div class="text-[9px] text-amber-100/40">${label}</div>
      </div>
    `;
  }).join('');

  // v12.5 — if it's still the first week, show a gentle message instead of
  // a bar chart that barely has any data to plot.
  const earlyDays = weeksToShow === 1 && daysOnPath < 7;
  const earlyDaysBody = daysOnPath === 1
    ? t('review.early_days_one')
    : t('review.early_days_many', {n: daysOnPath});

  // v13.3 — "What I cultivated" aggregates. Shows the practitioner what the
  // practice has actually consisted of: flavor distribution (breath/metta/
  // walking), and the emotional arc — what I tend to arrive at the cushion
  // holding (pre-chips) versus what I tend to leave with (post-chips). The
  // arc is the more interesting number: it shows the practice as a transit,
  // not a count.
  const memberSits = (state.sitRecords || []).filter(r => r.memberId === mid);
  const flavorCounts = { breath: 0, metta: 0, walking: 0 };
  const preCounts = {};
  const postCounts = {};
  for (const r of memberSits) {
    const flav = r.flavor || 'breath';
    if (flavorCounts[flav] != null) flavorCounts[flav]++;
    for (const id of (r.preChips || [])) preCounts[id] = (preCounts[id] || 0) + 1;
    for (const id of (r.postChips || [])) postCounts[id] = (postCounts[id] || 0) + 1;
  }
  const flavorTotal = flavorCounts.breath + flavorCounts.metta + flavorCounts.walking;
  const preChipsUsed = Object.keys(preCounts).length > 0;
  const postChipsUsed = Object.keys(postCounts).length > 0;

  // Helper: render a chip with count, in descending order
  const chipRow = (counts, chipDef) => {
    const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return ordered.map(([id, n]) => {
      const def = chipDef.find(c => c.id === id);
      if (!def) return '';
      return `
        <div class="flex items-center gap-1.5 bg-amber-950/30 rounded-full px-2 py-0.5 text-[10px]">
          <span>${def.icon}</span>
          <span class="text-amber-100/85">${def.label}</span>
          <span class="text-amber-300/70 font-mono">×${n}</span>
        </div>
      `;
    }).join('');
  };

  // Weekly-charts toggle note — singular/plural static keys.
  const chartsToggleNote = weeksToShow === 1
    ? t('review.charts.toggle_note_one')
    : t('review.charts.toggle_note_many', {n: weeksToShow});

  return `
    <div class="fade-in">
      <div class="parchment rounded-xl p-5 mb-4">
        <h2 class="text-xl font-bold gold-text mb-1">${t('review.heading')}</h2>
        <p class="text-sm text-amber-100/75 italic">${t('review.intro')}</p>
      </div>

      <!-- Totals since starting -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('review.totals.eyebrow')}</div>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <div>
            <div class="text-2xl font-bold gold-text">${daysOnPath}</div>
            <div class="text-[10px] text-amber-100/60 uppercase tracking-wider">${daysLabel}</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-amber-200">${totalSits}</div>
            <div class="text-[10px] text-amber-100/60 uppercase tracking-wider">${sitsLabel}</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-amber-200">${totalMinutes}</div>
            <div class="text-[10px] text-amber-100/60 uppercase tracking-wider">${minutesLabel}</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-emerald-300">${totalReflections}</div>
            <div class="text-[10px] text-amber-100/60 uppercase tracking-wider">${reflLabel}</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-amber-300">${totalSuttasRead}</div>
            <div class="text-[10px] text-amber-100/60 uppercase tracking-wider">${suttasLabel}</div>
          </div>
        </div>
        <p class="text-[10px] text-amber-100/50 italic mt-3 text-center">${t('review.totals.footer_note')}</p>
      </div>

      ${srsHasAny ? `
        <!-- v13.0 — sutta-comprehension SRS due-today panel -->
        <div class="parchment rounded-xl p-4 mb-4 border ${srsDue.length > 0 ? 'border-emerald-700/50 bg-emerald-950/15' : 'border-amber-700/30'}">
          <div class="flex items-baseline justify-between mb-2">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('review.srs.eyebrow')}</div>
            <div class="text-[10px] text-amber-100/55">${srsDue.length === 0 ? t('review.srs.nothing_due') : t('review.srs.n_due_now', {n: srsDue.length})}</div>
          </div>
          ${srsDue.length === 0 ? `
            <p class="text-[11px] text-amber-100/70 italic">${t('review.srs.scheduled_body')}</p>
          ` : `
            <div class="space-y-1.5">
              ${Object.entries(srsBySutta).map(([sid, count]) => {
                const sutta = SUTTA_LIBRARY.find(s => s.id === sid);
                if (!sutta) return '';
                return `
                  <button onclick="openSuttaStudy('${sid}')" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition flex items-center justify-between gap-2 border border-amber-700/20">
                    <div class="min-w-0 flex-1">
                      <div class="text-[11px] font-bold text-amber-100 truncate">${sutta.ref} · ${sutta.name}</div>
                      <div class="text-[10px] text-amber-200/60 truncate italic">${sutta.english}</div>
                    </div>
                    <div class="text-[10px] text-emerald-300 whitespace-nowrap">${t('review.srs.per_sutta_due', {n: count})}</div>
                  </button>
                `;
              }).join('')}
            </div>
            <p class="text-[10px] text-amber-100/50 italic mt-2 text-center">${t('review.srs.footer')}</p>
          `}
        </div>
      ` : ''}

      ${(flavorTotal > 0 || preChipsUsed || postChipsUsed) ? `
        <!-- v13.3 — What I cultivated: the shape of the practice, not just the count -->
        <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('review.cultivated.eyebrow')}</div>
          <p class="text-[10px] text-amber-100/55 italic mb-3">${t('review.cultivated.subtitle')}</p>

          ${flavorTotal > 0 ? `
            <div class="mb-3">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-2">${t('review.cultivated.flavor_label')}</div>
              <div class="flex items-center gap-1 h-4 rounded-full overflow-hidden bg-amber-950/40 mb-1.5">
                ${flavorCounts.breath > 0 ? `<div class="h-full bg-amber-400/70" style="width:${(flavorCounts.breath / flavorTotal) * 100}%" title="breath"></div>` : ''}
                ${flavorCounts.metta > 0 ? `<div class="h-full bg-rose-400/70" style="width:${(flavorCounts.metta / flavorTotal) * 100}%" title="metta"></div>` : ''}
                ${flavorCounts.walking > 0 ? `<div class="h-full bg-emerald-400/70" style="width:${(flavorCounts.walking / flavorTotal) * 100}%" title="walking"></div>` : ''}
              </div>
              <div class="flex gap-3 text-[10px] flex-wrap">
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-amber-400/70 rounded-sm"></span> ${t('review.cultivated.flavor_breath')} · <b>${flavorCounts.breath}</b></span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-rose-400/70 rounded-sm"></span> ${t('review.cultivated.flavor_metta')} · <b>${flavorCounts.metta}</b></span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-emerald-400/70 rounded-sm"></span> ${t('review.cultivated.flavor_walking')} · <b>${flavorCounts.walking}</b></span>
              </div>
            </div>
          ` : ''}

          ${preChipsUsed ? `
            <div class="mb-3">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-2">${t('review.cultivated.pre_label')}</div>
              <div class="flex flex-wrap gap-1.5">${chipRow(preCounts, PRE_SIT_CHIPS)}</div>
            </div>
          ` : ''}

          ${postChipsUsed ? `
            <div class="mb-1">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-2">${t('review.cultivated.post_label')}</div>
              <div class="flex flex-wrap gap-1.5">${chipRow(postCounts, POST_SIT_CHIPS)}</div>
            </div>
          ` : ''}

          ${(preChipsUsed && postChipsUsed) ? `
            <p class="text-[10px] text-amber-100/50 italic mt-3 leading-relaxed">${t('review.cultivated.arc_note')}</p>
          ` : ''}
        </div>
      ` : ''}

      ${savedQuotes.length > 0 ? `
        <!-- v13.5 — saved quotes: teachings that resonated. Grouped by source
             so Ajahn Chah, the Buddha, Thich Nhat Hanh, and the Dalai Lama
             each form a small pocket-collection. Printable alongside
             reflections (next turn). -->
        <div class="parchment rounded-xl p-4 mb-4 border border-rose-700/30">
          <div class="flex items-baseline justify-between mb-1">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('review.quotes.eyebrow')}</div>
            <div class="text-[10px] text-amber-100/55">${t('review.quotes.count_saved', {n: savedQuotes.length})}</div>
          </div>
          <p class="text-[10px] text-amber-100/55 italic mb-3">${t('review.quotes.subtitle')}</p>
          ${(() => {
            // Group by source for visual pocket-collections
            const bySource = {};
            for (const q of savedQuotes) {
              if (!bySource[q.source]) bySource[q.source] = [];
              bySource[q.source].push(q);
            }
            return Object.entries(bySource).map(([src, list]) => `
              <div class="mb-3">
                <div class="text-[10px] uppercase tracking-wider text-amber-300/60 mb-1.5">${src}</div>
                <div class="space-y-1.5">
                  ${list.map(q => `
                    <div class="parchment rounded-lg p-2.5 border border-amber-700/20 flex items-start gap-2">
                      <div class="flex-1 min-w-0">
                        <p class="serif text-[12px] text-amber-100/90 italic leading-relaxed">"${q.text}"</p>
                        <div class="text-[9px] text-amber-100/40 mt-1">${t('review.quotes.saved_on', {date: q.savedAt})}</div>
                      </div>
                      <button onclick="toggleQuoteSaved(${q.index})" class="text-rose-400/80 hover:text-rose-300 text-lg shrink-0" title="${t('review.quotes.unsave_title')}">♥</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('');
          })()}
        </div>
      ` : ''}

      ${earlyDays ? `
        <div class="parchment rounded-xl p-5 mb-4 border border-amber-700/30 bg-amber-950/20">
          <div class="text-center">
            <div class="text-4xl mb-2">🌱</div>
            <p class="text-sm text-amber-100/85 leading-relaxed serif italic">${earlyDaysBody}</p>
          </div>
        </div>
      ` : `
      <!-- v14.1 — Weekly charts collapsed behind one toggle. Dirk feedback:
           the Review tab scrolls forever. Default: collapsed (the totals and
           SRS above are the high-frequency content). Tap to expand all four
           charts at once. -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
        <button onclick="toggleReviewCharts()" class="w-full text-left flex items-baseline justify-between">
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('review.charts.toggle_eyebrow')}</div>
            <div class="text-sm font-bold text-amber-100 mt-0.5">${t('review.charts.toggle_heading')}</div>
            ${!view.reviewChartsExpand ? `<p class="text-[11px] text-amber-100/55 italic mt-1">${chartsToggleNote}</p>` : ''}
          </div>
          <span class="text-amber-300/70 text-lg">${view.reviewChartsExpand ? '▾' : '▸'}</span>
        </button>
      </div>

      ${view.reviewChartsExpand ? `
      <!-- Weekly bars: sits -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
        <div class="flex items-baseline justify-between mb-2">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('review.charts.sits_eyebrow')}</div>
          <div class="text-[10px] text-amber-100/50">${rangeLabel}</div>
        </div>
        <div class="space-y-1.5">
          ${weekBuckets.map(b => barRow(weekLabel(b), b.sits, maxSits, 'bg-amber-400/70')).join('')}
        </div>
      </div>

      <!-- Weekly bars: minutes -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
        <div class="flex items-baseline justify-between mb-2">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('review.charts.minutes_eyebrow')}</div>
          <div class="text-[10px] text-amber-100/50">${rangeLabel}</div>
        </div>
        <div class="space-y-1.5">
          ${weekBuckets.map(b => barRow(weekLabel(b), b.minutes, maxMinutes, 'bg-amber-300/70')).join('')}
        </div>
      </div>

      <!-- Weekly bars: reflections -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
        <div class="flex items-baseline justify-between mb-2">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('review.charts.reflections_eyebrow')}</div>
          <div class="text-[10px] text-amber-100/50">${rangeLabel}</div>
        </div>
        <div class="space-y-1.5">
          ${weekBuckets.map(b => barRow(weekLabel(b), b.reflections, maxRefls, 'bg-emerald-400/70')).join('')}
        </div>
      </div>

      <!-- Hindrance trend -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
        <div class="flex items-baseline justify-between mb-2">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('review.charts.hindrance_eyebrow')}</div>
          <div class="text-[10px] text-amber-100/50">${hindranceWeeksCount === 1 ? t('review.charts.range_one') : t('review.charts.range_many', {n: hindranceWeeksCount})}</div>
        </div>
        <div class="flex gap-1 mb-2">
          ${hindranceRow}
        </div>
        <p class="text-[10px] text-amber-100/55 italic leading-relaxed">${t('review.charts.hindrance_footer')}</p>
      </div>
      ` : ''}
      `}

      <!-- The anchor teaching -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/30 bg-amber-950/20">
        <p class="serif text-xs text-amber-100/85 leading-relaxed italic">
          ${t('review.anchor.quote')}
        </p>
        <p class="text-[10px] text-amber-300/60 mt-2 text-right">${t('reflection.adze_attribution')}</p>
      </div>
    </div>
  `;
}
