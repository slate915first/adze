// ============================================================================
// render/path.js
// ----------------------------------------------------------------------------
// The Path tab — the liberation-path dashboard. This is the deepest
// dhamma surface in the app, and the one most likely to drift if edited
// casually. The framing contract is:
//
//   The path of liberation is ONE PATH in nine ranks, from puthujjana
//   (worldling) to arahant. Progress along it is NOT the same thing as
//   progress through the story-quest stages. The story-quest is narrative
//   scaffolding that runs alongside; the path rank is tracked separately,
//   per the canonical 10-fetter model (sakkāya-diṭṭhi, vicikicchā, ...).
//
//   Each rank has a "what opens at this rank" teaching card keyed to the
//   Pāli name. Adze is deliberately conservative here — the app does not
//   claim to deliver rank attainment; it tracks self-reported gates and
//   offers the ladder as a map, not a scoreboard. The SN 22.101 adze
//   simile is the frame ("the carpenter cannot see the daily wearing").
//
// Three entry points:
//
//   renderPathMapSVG(memberId)   The SVG path-map — a vertical ribbon
//                                with nodes for each rank. Tap any node
//                                to openRankCheckpoint(rankId) and read
//                                the per-rank teaching.
//
//   openRankCheckpoint(rankId)   Tiny helper that opens the rank_checkpoint
//                                modal. Defined here because it's tightly
//                                coupled to the path map — no other caller.
//
//   renderPath()                 The tab body. Composed of these cards:
//                                  - tisikkhā progress (top)
//                                  - your work (current rank + what opens)
//                                  - details (collapsed tri-training bars)
//                                  - layer-2 preview (Māra's armies active
//                                    at this rank, if any)
//                                  - the 9-rank ladder (using the SVG map)
//                                  - tail teaching card
//
// Canonical hot spots referenced by this file's string keys (defined in
// en.json, applied via t()):
//   - SN 22.101 adze simile (the frame)
//   - Padhāna Sutta Sn 3.2 (army labels)
//   - MN 10 / MN 118 (sati foundations, when relevant)
//
// Dependencies (all read from global scope):
//   State:     state (members, path, currentStage, questActive, log,
//                     diagnostics, reflectionLog, sitRecords)
//              view (currentMember, modal)
//   Engine:    t() from engine/i18n.js
//   Helpers:   todayKey, daysBetween, computeMemberRank, getRankInfo,
//              getTisikkha, getTisikkhaThresholds, shadowFloorForRank,
//              dominantHindranceForMember, getHindranceInfo, getSittingStats,
//              classifyPathStage, getCurrentStageArmies, hasReadSutta,
//              streakForHabit, maraPressureThisWeek, recentPathGates
//   Data:      STAGES, RANK_LADDER, FIVE_HINDRANCES, MARA_ARMIES,
//              SUTTA_LIBRARY, FETTERS (from rank-gate module)
// ============================================================================

function renderPathMapSVG(memberId) {
  const currentRank = computeMemberRank(memberId);
  const p = ensurePathRecord(memberId);
  const liberated = !!p.liberated;

  // Build the trail as a polyline connecting all 10 points
  const trailPoints = PATH_MAP_CHECKPOINTS.map(c => `${c.x},${c.y}`).join(' ');

  // Split the trail visually: walked portion (solid gold) up to current rank,
  // ahead portion (dashed) beyond it
  const walkedPoints = PATH_MAP_CHECKPOINTS.filter(c => c.id <= currentRank).map(c => `${c.x},${c.y}`).join(' ');
  const aheadPoints = PATH_MAP_CHECKPOINTS.filter(c => c.id >= currentRank).map(c => `${c.x},${c.y}`).join(' ');

  // Build the checkpoint circles
  const circles = PATH_MAP_CHECKPOINTS.map(c => {
    const ri = getRankInfo(c.id);
    const isWalked = c.id < currentRank;
    const isCurrent = c.id === currentRank;
    const isAhead = c.id > currentRank;
    const isAriya = c.id >= 6;

    let fill = '#451a03';  // dark fallback
    let stroke = '#78350f';
    let strokeWidth = 2;
    let radius = 18;
    let textColor = '#fcd34d';
    let opacity = 1;

    if (isWalked) {
      fill = '#b45309'; stroke = '#fcd34d'; strokeWidth = 2;
    } else if (isCurrent) {
      fill = liberated ? '#a855f7' : '#fbbf24';
      stroke = '#fef3c7'; strokeWidth = 3; radius = 24;
      textColor = '#1f1310';
    } else if (isAhead) {
      if (isAriya) {
        fill = 'rgba(88, 28, 135, 0.25)'; stroke = 'rgba(168, 85, 247, 0.45)';
        textColor = 'rgba(196, 181, 253, 0.65)';
      } else {
        fill = 'rgba(69, 26, 3, 0.3)'; stroke = 'rgba(180, 83, 9, 0.45)';
        textColor = 'rgba(252, 211, 77, 0.55)';
      }
      opacity = 0.85;
    }

    const labelClass = isCurrent ? 'font-bold' : '';
    const labelColor = isWalked ? '#fcd34d'
      : isCurrent ? (liberated ? '#e9d5ff' : '#fef3c7')
      : isAriya ? 'rgba(196, 181, 253, 0.7)'
      : 'rgba(252, 211, 77, 0.6)';

    return `
      <g class="cursor-pointer path-checkpoint ${isCurrent ? 'path-checkpoint-current' : ''}" onclick="openRankCheckpoint(${c.id})" opacity="${opacity}">
        ${isCurrent ? `<circle cx="${c.x}" cy="${c.y}" r="${radius + 8}" fill="none" stroke="${liberated ? '#a855f7' : '#fbbf24'}" stroke-width="2" opacity="0.4"><animate attributeName="r" values="${radius + 4};${radius + 14};${radius + 4}" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.5;0.05;0.5" dur="2.5s" repeatCount="indefinite"/></circle>` : ''}
        <circle cx="${c.x}" cy="${c.y}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>
        <text x="${c.x}" y="${c.y + 5}" text-anchor="middle" font-size="${isCurrent ? 18 : 14}" fill="${textColor}" font-weight="${isCurrent ? 'bold' : 'normal'}">${c.id}</text>
        <text x="${c.labelX}" y="${c.labelY}" text-anchor="${c.labelAnchor}" font-size="11" fill="${labelColor}" class="${labelClass}">${ri.pali}</text>
        ${isWalked ? `<text x="${c.x + (c.labelAnchor === 'end' ? -2 : 2)}" y="${c.y - radius - 4}" text-anchor="${c.labelAnchor === 'end' ? 'end' : 'start'}" font-size="10" fill="#86efac">✓</text>` : ''}
      </g>
    `;
  }).join('');

  // Tier-shift indicator at the rank 5→6 boundary — a subtle horizontal marker
  // showing "the stream" — the threshold into the ariya game ranks
  const streamY = (PATH_MAP_CHECKPOINTS[5].y + PATH_MAP_CHECKPOINTS[6].y) / 2;

  return `
    <div class="relative">
      <svg viewBox="0 0 380 700" xmlns="http://www.w3.org/2000/svg" class="w-full" style="max-height: 80vh">
        <defs>
          <linearGradient id="trailWalked" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#78350f" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.9"/>
          </linearGradient>
          <linearGradient id="trailAriya" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="rgba(180, 83, 9, 0.3)"/>
            <stop offset="50%" stop-color="rgba(180, 83, 9, 0.3)"/>
            <stop offset="50.1%" stop-color="rgba(168, 85, 247, 0.35)"/>
            <stop offset="100%" stop-color="rgba(168, 85, 247, 0.35)"/>
          </linearGradient>
        </defs>

        <!-- Decorative top: the endpoint halo -->
        <circle cx="195" cy="45" r="38" fill="none" stroke="rgba(168, 85, 247, 0.15)" stroke-width="1"/>
        <circle cx="195" cy="45" r="48" fill="none" stroke="rgba(168, 85, 247, 0.08)" stroke-width="1"/>

        <!-- Full trail (dim background) -->
        <polyline points="${trailPoints}" fill="none" stroke="rgba(120, 53, 15, 0.4)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 6"/>

        <!-- Walked trail (solid gradient) -->
        ${walkedPoints.split(' ').length > 1 ? `
          <polyline points="${walkedPoints}" fill="none" stroke="url(#trailWalked)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        ` : ''}

        <!-- "The stream" marker between rank 5 and rank 6 -->
        <line x1="20" y1="${streamY}" x2="360" y2="${streamY}" stroke="rgba(168, 85, 247, 0.25)" stroke-width="1" stroke-dasharray="2 4"/>
        <text x="20" y="${streamY - 4}" font-size="9" fill="rgba(196, 181, 253, 0.5)" font-style="italic">— the stream · ariya tier —</text>

        <!-- Checkpoints -->
        ${circles}

        <!-- Top label: the endpoint -->
        <text x="195" y="18" text-anchor="middle" font-size="10" fill="rgba(196, 181, 253, 0.7)" font-style="italic">the game's endpoint</text>

        <!-- Bottom label: start -->
        <text x="190" y="690" text-anchor="middle" font-size="10" fill="rgba(252, 211, 77, 0.6)" font-style="italic">you begin here</text>
      </svg>

      <style>
        .path-checkpoint:hover circle { filter: brightness(1.15); }
        .path-checkpoint-current { filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.4)); }
      </style>
    </div>
  `;
}

// Open the rank-checkpoint detail modal from anywhere on the path map.
function openRankCheckpoint(rankId) {
  view.modal = { type: 'rank_checkpoint', rankId: rankId, memberId: view.currentMember };
  renderModal();
}

function renderPath() {
  if (!view.currentMember) view.currentMember = state.members[0]?.id;
  const memberId = view.currentMember;
  if (!memberId) {
    return `<div class="parchment rounded-xl p-5"><p class="text-amber-100/70">${t('path.no_member')}</p></div>`;
  }

  ensurePathRecord(memberId);
  const summary = getPathSummary(memberId);
  const rk = summary.rank;
  const ri = summary.rankInfo;
  const nextReq = summary.nextRankRequirements;
  const focus = getFocusForNow(memberId);
  const hindranceRows = getHindranceRemovalProgress(memberId);
  const factorRows = getAllFactorScores(memberId);
  const member = state.members.find(m => m.id === memberId);
  const memberName = member?.name || 'Practitioner';

  // Static label map for hindrance status — stable IDs in data, translated labels here.
  // Same pattern as study-tab groups and wisdom-tab tag labels.
  const hStatusLabels = {
    quiet:     t('path.hindrances.status.quiet'),
    weakening: t('path.hindrances.status.weakening'),
    present:   t('path.hindrances.status.present'),
    strong:    t('path.hindrances.status.strong'),
    no_data:   t('path.hindrances.status.no_data')
  };

  // Tier color for the rank header
  const tierColor = ri.tier === 'pre-training' ? 'border-amber-900/40'
    : ri.tier === 'training' ? 'border-amber-700/60'
    : ri.tier === 'approaching' ? 'border-emerald-600/60'
    : 'border-purple-600/60';

  // ---- Rank header card ----
  const rankCard = `
    <div class="parchment rounded-xl p-5 mb-4 border-2 ${tierColor}">
      <div class="flex items-baseline justify-between mb-2">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('path.rank_header.eyebrow', {name: memberName})}</div>
          <h2 class="text-2xl font-bold gold-text mt-1">${ri.pali}</h2>
          <div class="text-xs text-amber-200/80 italic">${ri.english} · ${ri.suttaRef}</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/60">${t('path.rank_header.rank_label')}</div>
          <div class="text-3xl font-bold gold-text">${rk}<span class="text-base text-amber-300/60">/9</span></div>
        </div>
      </div>
      <p class="text-xs text-amber-100/85 leading-relaxed mt-2 serif">${ri.description}</p>
      ${nextReq ? `
        <div class="mt-4 pt-3 border-t border-amber-900/30">
          <div class="flex items-baseline justify-between mb-2">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('path.rank_header.to_reach', {pali: nextReq.nextInfo.pali})}</div>
            <div class="text-[10px] text-amber-100/60">${t('path.rank_header.requirements_met', {met: nextReq.rows.filter(r => r.pass).length, total: nextReq.rows.length})}</div>
          </div>
          <div class="space-y-1">
            ${nextReq.rows.map(row => `
              <div class="flex items-start gap-2 text-[11px]">
                <div class="text-sm">${row.pass ? '<span class="text-green-400">✓</span>' : '<span class="text-amber-500/60">○</span>'}</div>
                <div class="flex-1 text-amber-100/80">${row.label}</div>
                <div class="text-amber-300/60 text-[10px]">${row.detail}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="mt-4 pt-3 border-t border-amber-900/30">
          <p class="text-[11px] text-amber-100/75 italic leading-relaxed">${t('path.rank_header.rank_9_tail')}</p>
        </div>
      `}
    </div>
  `;

  // ---- v9.9: Tisikkhā progress bars toward next rank ----
  let tisikkhaProgressCard = '';
  if (rk < 9) {
    const tis = getTisikkha(memberId);
    const nextRank = rk + 1;
    const thresh = getTisikkhaThresholds(nextRank);
    const nextRi = getRankInfo(nextRank);
    const bar = (cur, max, color) => {
      if (max === 0) return '';
      const pct = Math.round(Math.min(100, (cur / max) * 100));
      const met = cur >= max;
      return `
        <div class="w-full bg-amber-900/30 rounded-full h-2 overflow-hidden">
          <div class="h-full ${met ? 'bg-emerald-400/80' : color}" style="width:${pct}%"></div>
        </div>
      `;
    };
    if (thresh.sila > 0 || thresh.samadhi > 0 || thresh.panna > 0) {
      tisikkhaProgressCard = `
        <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
          <div class="flex items-baseline justify-between mb-2">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('path.tisikkha.toward_label', {pali: nextRi.pali})}</div>
            <button class="text-[10px] text-amber-300/70 hover:text-amber-200 underline" onclick="openRulesCard()">${t('path.tisikkha.how_to_earn')}</button>
          </div>
          <div class="space-y-2.5">
            <div>
              <div class="flex items-baseline justify-between text-[11px] mb-1">
                <div><span class="text-base">⚖️</span> <b class="text-amber-200">${t('path.tisikkha.sila')}</b></div>
                <div class="text-amber-100/70"><b class="text-amber-200">${tis.sila}</b> / ${thresh.sila}</div>
              </div>
              ${bar(tis.sila, thresh.sila, 'bg-amber-400/70')}
            </div>
            <div>
              <div class="flex items-baseline justify-between text-[11px] mb-1">
                <div><span class="text-base">🪷</span> <b class="text-amber-200">${t('path.tisikkha.samadhi')}</b></div>
                <div class="text-amber-100/70"><b class="text-amber-200">${tis.samadhi}</b> / ${thresh.samadhi}</div>
              </div>
              ${bar(tis.samadhi, thresh.samadhi, 'bg-amber-400/70')}
            </div>
            <div>
              <div class="flex items-baseline justify-between text-[11px] mb-1">
                <div><span class="text-base">💡</span> <b class="text-emerald-200">${t('path.tisikkha.panna')}</b></div>
                <div class="text-amber-100/70"><b class="text-emerald-200">${tis.panna}</b> / ${thresh.panna}</div>
              </div>
              ${bar(tis.panna, thresh.panna, 'bg-emerald-400/70')}
            </div>
          </div>
          <p class="text-[10px] text-amber-100/55 italic mt-3 leading-relaxed">${t('path.tisikkha.note')}</p>
        </div>
      `;
    }
  }

  // ---- Focus right now card ----
  const focusBgClass = focus.mode === 'release' ? 'border-amber-700/60 bg-amber-900/15' : 'border-emerald-700/60 bg-emerald-900/15';
  const focusModeLabel = focus.mode === 'release' ? t('path.focus.mode_release') : t('path.focus.mode_cultivate');
  const focusBarPct = Math.round((focus.progressValue / focus.progressMax) * 100);
  const focusBarColor = focus.mode === 'release' ? 'bg-amber-400/70' : 'bg-emerald-400/70';
  const focusCard = `
    <div class="parchment rounded-xl p-5 mb-4 border-2 ${focusBgClass}">
      <div class="flex items-baseline justify-between mb-2">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('path.focus.eyebrow')}</div>
        <div class="text-[10px] uppercase tracking-wider text-amber-300/60">${t('path.focus.eyebrow_sub')}</div>
      </div>
      <div class="flex items-start gap-3 mt-2">
        <div class="text-4xl">${focus.icon}</div>
        <div class="flex-1">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${focusModeLabel}</div>
          <h3 class="text-lg font-bold gold-text">${focus.title}</h3>
          <div class="text-[11px] text-amber-200/70 italic">${focus.subtitle}</div>
        </div>
      </div>
      <p class="text-xs text-amber-100/85 leading-relaxed mt-3 serif">${focus.detail}</p>
      <div class="mt-3">
        <div class="flex items-baseline justify-between mb-1">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${focus.progressLabel}</div>
          <div class="text-xs text-amber-200"><b>${focus.progressValue.toFixed(1)}</b> / ${focus.progressMax}</div>
        </div>
        <div class="w-full bg-amber-900/30 rounded-full h-2 overflow-hidden">
          <div class="h-full ${focusBarColor}" style="width:${focusBarPct}%"></div>
        </div>
      </div>
    </div>
  `;

  // ---- Five hindrances grid ----
  const hindrancesCard = `
    <div class="parchment rounded-xl p-5 mb-4 border border-amber-700/40">
      <button onclick="openTeachingDetail('layer',1)" class="block w-full text-left mb-2 hover:opacity-90 transition">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('path.hindrances.eyebrow')}</div>
        <h3 class="text-lg font-bold gold-text">${t('path.hindrances.heading')}</h3>
        <div class="text-[11px] text-amber-200/60 italic">${t('path.hindrances.subtitle')}</div>
      </button>
      <p class="text-[11px] text-amber-100/70 italic mb-3">${t('path.hindrances.intro')}</p>
      <div class="space-y-2">
        ${hindranceRows.map(row => {
          const h = row.hindrance;
          const pct = row.severity === null ? 0 : Math.round((row.removalProgress / 10) * 100);
          const barColor = row.status === 'quiet' ? 'bg-emerald-400/80'
            : row.status === 'weakening' ? 'bg-amber-300/80'
            : row.status === 'present' ? 'bg-amber-500/70'
            : 'bg-red-500/70';
          const statusColor = row.status === 'quiet' ? 'text-emerald-300'
            : row.status === 'weakening' ? 'text-amber-300'
            : row.status === 'present' ? 'text-amber-200/70'
            : 'text-red-300';
          const statusLabel = hStatusLabels[row.status] || row.status;
          const severityLabel = row.severity === null
            ? t('path.hindrances.no_data_short')
            : t('path.hindrances.severity', {n: row.severity.toFixed(1)});
          return `
            <button onclick="openTeachingDetail('hindrance','${h.id}')" class="block w-full text-left border-b border-amber-900/20 py-2 hover:bg-amber-900/15 transition rounded">
              <div class="flex items-center gap-2 mb-1">
                <div class="text-xl">${h.icon}</div>
                <div class="flex-1">
                  <div class="text-xs"><b class="text-amber-100">${h.pali}</b> <span class="text-amber-100/55">— ${h.english}</span></div>
                </div>
                <div class="text-[10px] ${statusColor} font-bold uppercase">${statusLabel}</div>
              </div>
              <div class="flex items-center gap-2">
                <div class="flex-1 bg-amber-900/30 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full ${barColor}" style="width:${pct}%"></div>
                </div>
                <div class="text-[10px] text-amber-300/70 w-16 text-right">${severityLabel}</div>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // ---- Seven awakening factors compact ----
  const factorsCard = `
    <div class="parchment rounded-xl p-5 mb-4 border border-emerald-700/40">
      <div class="block w-full text-left mb-3">
        <div class="text-[10px] uppercase tracking-wider text-emerald-300/80 mb-1">${t('path.factors.eyebrow')}</div>
        <h3 class="text-lg font-bold text-emerald-200">${t('path.factors.heading')}</h3>
        <div class="text-[11px] text-emerald-200/60 italic">${t('path.factors.subtitle')}</div>
      </div>
      <div class="space-y-1.5">
        ${factorRows.map(row => {
          const f = row.factor;
          if (row.measurable) {
            const score = row.score === null ? 0 : row.score;
            const pct = Math.round((score / 10) * 100);
            return `
              <button onclick="openTeachingDetail('factor','${f.id}')" class="block w-full text-left flex items-center gap-2 py-1 border-b border-emerald-900/20 hover:bg-emerald-900/15 transition rounded">
                <div class="text-base">${f.icon}</div>
                <div class="flex-1">
                  <div class="text-[11px] text-emerald-100"><b>${f.pali}</b> <span class="text-amber-100/55">— ${f.english}</span></div>
                </div>
                <div class="w-24 bg-emerald-900/30 rounded-full h-1.5 overflow-hidden">
                  <div class="h-full bg-emerald-400/70" style="width:${pct}%"></div>
                </div>
                <div class="text-[10px] text-emerald-200 font-bold w-8 text-right">${score.toFixed(1)}</div>
              </button>
            `;
          } else {
            const emerged = row.emerged;
            const emergedLabel = emerged ? t('path.factors.arising') : t('path.factors.arises_later');
            return `
              <button onclick="openTeachingDetail('factor','${f.id}')" class="block w-full text-left flex items-center gap-2 py-1 border-b border-emerald-900/20 hover:bg-emerald-900/15 transition rounded ${emerged ? '' : 'opacity-55'}">
                <div class="text-base">${f.icon}</div>
                <div class="flex-1">
                  <div class="text-[11px] ${emerged ? 'text-emerald-100' : 'text-emerald-200/60'}"><b>${f.pali}</b> <span class="text-amber-100/50">— ${f.english}</span></div>
                </div>
                <div class="text-[10px] ${emerged ? 'text-emerald-300' : 'text-emerald-400/40'} italic w-32 text-right">${emergedLabel}</div>
              </button>
            `;
          }
        }).join('')}
      </div>
    </div>
  `;

  // ---- Layer 2 preview / engagement (always visible — preview before unlock, engagement after) ----
  const p = ensurePathRecord(memberId);
  const layer2Available = isLayer2Available(memberId);
  const engagedId = p.activeArmyEngagement;
  const layer2Suffix = layer2Available
    ? t('path.layer2.eyebrow_open')
    : t('path.layer2.eyebrow_not_active');
  const layer2PreviewCard = `
    <div class="parchment rounded-xl p-5 mb-4 border ${layer2Available ? 'border-amber-700/60' : 'border-amber-900/40'}">
      <button onclick="openTeachingDetail('layer',2)" class="block w-full text-left mb-2 hover:opacity-90 transition">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('path.layer2.eyebrow_prefix')} ${layer2Suffix}</div>
        <h3 class="text-lg font-bold ${layer2Available ? 'gold-text' : 'text-amber-200/80'}">${t('path.layer2.heading')}</h3>
        <div class="text-[11px] text-amber-200/60 italic">${t('path.layer2.subtitle')}</div>
      </button>
      ${!layer2Available ? `
        <div class="mb-3 p-2 rounded border border-amber-900/40 bg-amber-950/20">
          <p class="text-[11px] text-amber-200/85 leading-relaxed"><b class="text-amber-300">${t('path.layer2.not_active_heading')}</b> ${t('path.layer2.not_active_body')}</p>
        </div>
      ` : ''}
      <p class="text-[11px] text-amber-100/75 leading-relaxed mt-2">${t('path.layer2.intro')}</p>
      ${layer2Available ? (engagedId ? `
        <div class="mt-3 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('path.layer2.currently_engaging')}</div>
          ${(() => {
            const army = MARA_ARMIES.find(a => a.id === engagedId);
            const entry = p.armies[engagedId] || {};
            const disp = getArmyStatusDisplay(entry.status);
            const days = entry.consecutiveDays || 0;
            const engagedStatusLine = days === 1
              ? t('path.layer2.engaged_status_one', {label: disp.label})
              : t('path.layer2.engaged_status_many', {label: disp.label, n: days});
            return `
              <div class="flex items-center gap-2">
                <div class="text-2xl">${army?.icon || '?'}</div>
                <div class="flex-1">
                  <div class="text-sm"><b class="text-amber-200">${army?.name || '?'}</b> <span class="text-amber-100/60">— ${army?.english || '?'}</span></div>
                  <div class="text-[10px] ${disp.color}">${engagedStatusLine}</div>
                </div>
                <button onclick="openPathView('${memberId}')" class="text-[10px] text-amber-300/80 hover:text-amber-200 underline">${t('path.layer2.manage')}</button>
              </div>
            `;
          })()}
        </div>
      ` : `
        <div class="mt-3">
          <button onclick="openPathView('${memberId}')" class="text-xs text-amber-300/80 hover:text-amber-200 underline">${t('path.layer2.engage_link')}</button>
        </div>
      `) : ''}
      <div class="mt-3 grid grid-cols-1 gap-1">
        ${MARA_ARMIES.map(a => `
          <button onclick="openTeachingDetail('army',${a.id})" class="text-left text-[11px] text-amber-100/70 hover:bg-amber-900/15 rounded px-2 py-1 transition flex items-center gap-2">
            <span class="text-base">${a.icon}</span>
            <span><b class="text-amber-200">${a.name}</b> <span class="text-amber-100/55">— ${a.english}</span></span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // ---- v9.6: Visual SVG path map (replaces the flat ladder) ----
  const ladderCard = `
    <div class="parchment rounded-xl p-4 mb-4 border border-amber-900/40">
      <div class="flex items-baseline justify-between mb-2">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('path.ladder.eyebrow')}</div>
        <div class="text-[10px] text-amber-100/55">${t('path.ladder.counter', {rk})}</div>
      </div>
      ${renderPathMapSVG(memberId)}
      <p class="text-[10px] text-amber-100/55 italic mt-2 leading-relaxed">${t('path.ladder.footer_note')}</p>
    </div>
  `;

  // ---- Cloud simile + open-detail link ----
  const tailCard = `
    <div class="parchment rounded-xl p-4 mb-4 bg-amber-900/15 border border-amber-700/30">
      <p class="text-[11px] text-amber-100/75 italic leading-relaxed serif">${t('path.tail.cloud_simile')}</p>
      <div class="mt-2 text-right">
        <button onclick="openPathView('${memberId}')" class="text-[11px] text-amber-300/80 hover:text-amber-200 underline">${t('path.tail.full_detail_link')}</button>
      </div>
    </div>
  `;

  // ---- v9.11 Turn B: unified "your work right now" card ----
  // Consolidates the dominant hindrance (release) and the weakest measurable
  // factor (cultivate) into a two-column primary view. The existing detailed
  // grids (full five hindrances, full seven factors) move below as collapsible
  // expanders — available but not the first thing the eye lands on.
  const top = topTwoHindrances(memberId) || [];
  const dom = top[0] ? FIVE_HINDRANCES.find(h => h.id === top[0].id) : null;
  const domAvg = top[0] ? top[0].avg : null;
  // Find the weakest measurable factor (sati, dhammavicaya, viriya, samadhi)
  const measurableFactors = ['sati', 'dhammavicaya', 'viriya', 'samadhi'];
  let weakestFactor = null;
  let weakestScore = 11;
  for (const fid of measurableFactors) {
    const s = factorScore(memberId, fid);
    if (s !== null && s < weakestScore) {
      weakestScore = s;
      weakestFactor = SEVEN_FACTORS.find(f => f.id === fid);
    }
  }
  const yourWorkCard = `
    <div class="parchment rounded-xl p-4 mb-4 border-2 border-amber-700/50">
      <div class="flex items-baseline justify-between mb-3">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('path.your_work.eyebrow')}</div>
        <div class="text-[10px] uppercase tracking-wider text-amber-300/55">${t('path.your_work.eyebrow_sub')}</div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div class="rounded-lg p-3 border border-amber-800/50 bg-amber-950/30">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/75 mb-1">${t('path.your_work.release_label')}</div>
          ${dom ? `
            <div class="flex items-baseline gap-2 mb-1">
              <div class="text-2xl">${dom.icon}</div>
              <div>
                <div class="text-base font-bold text-amber-200">${dom.pali}</div>
                <div class="text-[10px] text-amber-100/65 italic">${dom.english}</div>
              </div>
            </div>
            <div class="flex items-baseline justify-between text-[10px] mb-1">
              <span class="text-amber-100/70">${t('path.your_work.severity_14d')}</span>
              <span class="text-amber-200"><b>${domAvg.toFixed(1)}</b> / 10</span>
            </div>
            <div class="w-full bg-amber-900/30 rounded-full h-1.5 overflow-hidden">
              <div class="h-full bg-amber-400/70" style="width:${Math.min(100, domAvg * 10)}%"></div>
            </div>
            <p class="text-[11px] text-amber-100/80 italic mt-2 leading-relaxed">${dom.antidote || t('path.your_work.default_antidote')}</p>
          ` : `
            <p class="text-[11px] text-amber-100/65 italic">${t('path.your_work.release_no_data')}</p>
          `}
        </div>
        <div class="rounded-lg p-3 border border-emerald-800/50 bg-emerald-950/20">
          <div class="text-[10px] uppercase tracking-wider text-emerald-300/75 mb-1">${t('path.your_work.cultivate_label')}</div>
          ${weakestFactor ? `
            <div class="flex items-baseline gap-2 mb-1">
              <div class="text-2xl">${weakestFactor.icon}</div>
              <div>
                <div class="text-base font-bold text-emerald-200">${weakestFactor.pali}</div>
                <div class="text-[10px] text-emerald-100/65 italic">${weakestFactor.english}</div>
              </div>
            </div>
            <div class="flex items-baseline justify-between text-[10px] mb-1">
              <span class="text-emerald-100/70">${t('path.your_work.strength')}</span>
              <span class="text-emerald-200"><b>${weakestScore.toFixed(1)}</b> / 10</span>
            </div>
            <div class="w-full bg-emerald-900/30 rounded-full h-1.5 overflow-hidden">
              <div class="h-full bg-emerald-400/70" style="width:${Math.min(100, weakestScore * 10)}%"></div>
            </div>
            <p class="text-[11px] text-amber-100/80 italic mt-2 leading-relaxed">${t('path.your_work.cultivate_tail')}</p>
          ` : `
            <p class="text-[11px] text-amber-100/65 italic">${t('path.your_work.cultivate_no_data')}</p>
          `}
        </div>
      </div>
      <div class="text-[10px] text-amber-100/50 italic text-center mt-3">${t('path.your_work.footer_note')}</div>
    </div>
  `;

  // Wrap the detailed focus + hindrances + factors cards in collapsible details
  const detailsCard = `
    <details class="mb-4">
      <summary class="cursor-pointer text-[11px] text-amber-300/75 hover:text-amber-200 px-3 py-1.5 rounded border border-amber-900/30 bg-amber-950/20">${t('path.details_collapsible')}</summary>
      <div class="mt-3">
        ${focusCard}
        ${hindrancesCard}
        ${factorsCard}
      </div>
    </details>
  `;

  return `
    <div class="fade-in">
      ${rankCard}
      ${tisikkhaProgressCard}
      ${yourWorkCard}
      ${detailsCard}
      ${layer2PreviewCard}
      ${ladderCard}
      ${tailCard}
    </div>
  `;
}
