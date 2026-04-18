// ============================================================================
// src/modals/path-viewer.js
// ----------------------------------------------------------------------------
// Extracted in Turn 29 from renderModal() dispatch.
// Branch type: 'path_viewer'
//
// The dispatch in renderModal() now calls renderPathViewerModal(m) for this m.type.
// All user-facing strings pass through t() from engine/i18n.js and resolve
// at build time from src/content/strings/en.json.
// ============================================================================

function renderPathViewerModal(m) {
  let content = '';

    const member = state.members.find(x => x.id === m.memberId);
    if (!member) {
      content = `
        <div class="fade-in text-center">
          <h2 class="text-xl font-bold gold-text mb-2">${t('path_viewer.member_not_found')}</h2>
          <button class="btn btn-gold" onclick="closeModal()">${t('technique_teaching.close_button')}</button>
        </div>
      `;
    } else {
      // Ensure record exists and get a fresh summary (non-writing).
      ensurePathRecord(m.memberId);
      const summary = getPathSummary(m.memberId);
      const gate = summary.gate;
      const dom = summary.dominantHindrance;
      const domInfo = dom ? getHindranceInfo(dom) : null;
      const char = CHARACTERS[member.character];

      // ---- Layer 1: The Five Hindrances (active) ----
      const hCompRaw = gate.metrics.hindranceComposite;
      const hCompStr = hCompRaw === null ? '—' : hCompRaw.toFixed(1);
      const legRow = (pass, label, valueStr) => `
        <div class="flex items-start gap-3 py-2 border-b border-amber-900/20">
          <div class="text-lg" style="line-height:1.2">${pass ? '<span class="text-green-400">✓</span>' : '<span class="text-amber-500/60">○</span>'}</div>
          <div class="flex-1">
            <div class="text-xs text-amber-100/90 leading-snug">${label}</div>
            <div class="text-[11px] text-amber-300/70 mt-0.5">${valueStr}</div>
          </div>
        </div>
      `;

      const layer1 = PATH_LAYERS[0];
      const sustainedPct = Math.min(100, Math.round((summary.sustainedDays / summary.targetDays) * 100));
      const stage1PassedNote = summary.stage1PassedAt
        ? `<div class="text-xs text-green-300 italic mt-2">${t('path_viewer.layer1.stage1_passed_note', {date: new Date(summary.stage1PassedAt).toLocaleDateString()})}</div>`
        : '';

      const layer1Html = `
        <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/50">
          <div class="flex items-baseline justify-between mb-1">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('path_viewer.layer1.eyebrow')}</div>
              <h3 class="text-lg font-bold gold-text">${layer1.title}</h3>
              <div class="text-[11px] text-amber-200/60 italic">${layer1.pali} · ${layer1.suttaRef}</div>
            </div>
          </div>
          <p class="text-xs text-amber-100/80 leading-relaxed mt-2">${layer1.teaser}</p>

          ${domInfo ? `
            <div class="bg-amber-900/25 border border-amber-700/40 rounded-lg p-3 mt-3">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('path_viewer.layer1.dominant_label')}</div>
              <div class="flex items-center gap-2">
                <div class="text-2xl">${domInfo.icon}</div>
                <div class="flex-1">
                  <div class="text-sm font-bold text-amber-100">${domInfo.pali} <span class="font-normal text-amber-200/60">— ${domInfo.english}</span></div>
                  <div class="text-[11px] text-amber-100/70 italic">${t('path_viewer.layer1.dominant_note')}</div>
                </div>
              </div>
            </div>
          ` : `
            <div class="text-[11px] text-amber-100/50 italic mt-3">${t('path_viewer.layer1.no_dominant')}</div>
          `}

          <div class="mt-4">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('path_viewer.layer1.three_legs_label')}</div>
            <p class="text-[11px] text-amber-100/60 italic mb-2">${t('path_viewer.layer1.three_legs_intro')}</p>
            ${legRow(
              gate.hindranceAvgPass,
              `Hindrance composite ≤ ${summary.thresholds.HINDRANCE_CEILING} / 10 (rolling ${summary.thresholds.ROLLING_WINDOW_DAYS}-day average across all five)`,
              `current: <b class="text-amber-200">${hCompStr}</b>`
            )}
            ${legRow(
              gate.sitsInWindowPass,
              `At least ${summary.thresholds.MIN_SITS_IN_WINDOW} sits logged in the last ${summary.thresholds.ROLLING_WINDOW_DAYS} days`,
              `current: <b class="text-amber-200">${gate.metrics.sitsInWindow}</b> sits`
            )}
            ${legRow(
              gate.journalEvidencePass,
              `At least ${summary.thresholds.MIN_JOURNAL_ENTRIES_NAMING} reflection entries that name a hindrance`,
              `current: <b class="text-amber-200">${gate.metrics.journalEvidence}</b> entries in window`
            )}
          </div>

          <div class="mt-4 pt-3 border-t border-amber-900/30">
            <div class="flex items-baseline justify-between mb-1">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('path_viewer.layer1.sustained_label')}</div>
              <div class="text-xs text-amber-200"><b>${summary.sustainedDays}</b> / ${summary.targetDays} days</div>
            </div>
            <div class="w-full bg-amber-900/30 rounded-full h-1.5 overflow-hidden">
              <div class="h-full bg-amber-400/70" style="width:${sustainedPct}%"></div>
            </div>
            <p class="text-[11px] text-amber-100/60 italic mt-2">${t('path_viewer.layer1.sustained_note')}</p>
            ${stage1PassedNote}
          </div>

          <div class="mt-4 pt-3 border-t border-amber-900/30">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('path_viewer.layer1.graduation_label')}</div>
            <p class="text-[11px] text-amber-100/75 italic leading-relaxed">${layer1.graduation}</p>
          </div>
        </div>
      `;

      // ---- Layer 2: Māra's Ten Armies (scaffolding active when Layer 1 has been tasted) ----
      const layer2 = PATH_LAYERS[1];
      const layer2Active = summary.layer >= 2;
      const layer2Available = isLayer2Available(m.memberId); // at least 1 day sustained
      const pRec = ensurePathRecord(m.memberId);
      const engagedId = pRec.activeArmyEngagement;
      const layer2Html = `
        <div class="parchment rounded-xl p-4 mb-4 ${layer2Available ? 'border border-amber-700/50' : 'border border-amber-900/40 opacity-90'}">
          <div class="flex items-baseline justify-between mb-1">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70">Layer 2 · ${layer2Available ? 'open · engagement available' : 'preview only'}</div>
              <h3 class="text-lg font-bold ${layer2Available ? 'gold-text' : 'text-amber-200/80'}">${layer2.title}</h3>
              <div class="text-[11px] text-amber-200/60 italic">${layer2.pali} · ${layer2.suttaRef}</div>
            </div>
          </div>
          <p class="text-xs text-amber-100/80 leading-relaxed mt-2">${layer2.teaser}</p>
          <p class="text-[11px] text-amber-100/60 italic mt-2">${layer2.gateDescription}</p>

          ${layer2Available ? `
            <div class="mt-3 bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-2">${t('path_viewer.layer2.engagement_label')}</div>
              <p class="text-[11px] text-amber-100/70 italic mb-2">${t('path_viewer.layer2.engagement_intro')}</p>
              <div class="space-y-1">
                ${MARA_ARMIES.map(a => {
                  const entry = pRec.armies[a.id] || { status: 'dormant', consecutiveDays: 0 };
                  const disp = getArmyStatusDisplay(entry.status);
                  const isEngaged = engagedId === a.id;
                  const btn = isEngaged
                    ? `<button onclick="releasePathArmyEngagement()" class="text-[10px] text-amber-300/80 hover:text-amber-200 underline">release</button>`
                    : `<button onclick="engagePathArmy(${a.id})" class="text-[10px] text-amber-300/60 hover:text-amber-200 underline">${t('path_viewer.layer2.engage_button')}</button>`;
                  return `
                    <div class="flex items-center gap-2 text-[11px] py-1 border-b border-amber-900/20 ${isEngaged ? 'bg-amber-900/20 -mx-1 px-1 rounded' : ''}">
                      <div class="text-sm">${a.icon}</div>
                      <div class="flex-1">
                        <div class="text-amber-100/85"><b class="text-amber-200/90">${a.name}</b> <span class="text-amber-100/55">— ${a.english}</span></div>
                        ${entry.consecutiveDays > 0 ? `<div class="text-[10px] ${disp.color}">${disp.label} · ${entry.consecutiveDays} day${entry.consecutiveDays === 1 ? '' : 's'} sustained</div>` : `<div class="text-[10px] ${disp.color}">${disp.label}</div>`}
                      </div>
                      ${btn}
                    </div>
                  `;
                }).join('')}
              </div>
              ${engagedId ? `
                <p class="text-[11px] text-emerald-300/70 italic mt-2">${t('path_viewer.layer2.engaged_footer', {name: MARA_ARMIES.find(a => a.id === engagedId)?.name || '?'})}</p>
              ` : `
                <p class="text-[11px] text-amber-100/55 italic mt-2">${t('path_viewer.layer2.not_engaged_footer')}</p>
              `}
            </div>
          ` : `
            <div class="mt-3 bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-2">${t('path_viewer.layer2.preview_label')}</div>
              <div class="space-y-1">
                ${MARA_ARMIES.map(a => `
                  <div class="flex items-center gap-2 text-[11px] text-amber-100/75">
                    <div class="text-sm">${a.icon}</div>
                    <div class="flex-1"><b class="text-amber-200/90">${a.name}</b> <span class="text-amber-100/55">— ${a.english}</span></div>
                  </div>
                `).join('')}
              </div>
              <p class="text-[11px] text-amber-100/60 italic mt-3 leading-relaxed">${t('path_viewer.layer2.preview_note')}</p>
            </div>
          `}

          <div class="mt-3 pt-3 border-t border-amber-900/30">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('path_viewer.layer1.graduation_label')}</div>
            <p class="text-[11px] text-amber-100/75 italic leading-relaxed">${layer2.graduation}</p>
          </div>
        </div>
      `;

      // ---- Layer 3: The Ten Fetters + Four Noble Persons (preview only) ----
      const layer3 = PATH_LAYERS[2];
      const layer3Html = `
        <div class="parchment rounded-xl p-4 mb-4 border border-amber-900/40 opacity-90">
          <div class="flex items-baseline justify-between mb-1">
            <div>
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('path_viewer.layer3.eyebrow')}</div>
              <h3 class="text-lg font-bold text-amber-200/80">${layer3.title}</h3>
              <div class="text-[11px] text-amber-200/60 italic">${layer3.pali} · ${layer3.suttaRef}</div>
            </div>
          </div>
          <p class="text-xs text-amber-100/80 leading-relaxed mt-2">${layer3.teaser}</p>
          <p class="text-[11px] text-amber-100/60 italic mt-2">${layer3.gateDescription}</p>

          <div class="mt-3 bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-2">${t('path_viewer.layer3.lower_fetters_label')}</div>
            <div class="space-y-1">
              ${TEN_FETTERS.filter(f => f.tier === 'lower').map(f => `
                <div class="text-[11px] text-amber-100/75">
                  <b class="text-amber-200/90">${f.pali}</b> <span class="text-amber-100/55">— ${f.english}</span>
                  <div class="text-[10px] text-amber-300/50 italic ml-2">${t('path_viewer.layer3.removed_by', {removedBy: f.removedBy})}</div>
                </div>
              `).join('')}
            </div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mt-3 mb-2">${t('path_viewer.layer3.higher_fetters_label')}</div>
            <div class="space-y-1">
              ${TEN_FETTERS.filter(f => f.tier === 'higher').map(f => `
                <div class="text-[11px] text-amber-100/75">
                  <b class="text-amber-200/90">${f.pali}</b> <span class="text-amber-100/55">— ${f.english}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="mt-3 bg-amber-900/15 border border-amber-700/25 rounded-lg p-3">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-2">${t('path_viewer.layer3.noble_persons_label')}</div>
            <div class="space-y-2">
              ${NOBLE_PERSONS.map(np => `
                <div class="text-[11px] text-amber-100/75 leading-snug">
                  <b class="text-amber-200/90">${np.pali}</b> <span class="text-amber-100/55">— ${np.english}</span>
                  <div class="text-[10px] text-amber-300/60 italic ml-2">${np.removes}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-amber-900/30">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('path_viewer.layer3.graduation_label')}</div>
            <p class="text-[11px] text-amber-100/80 italic leading-relaxed">${layer3.graduation}</p>
          </div>
        </div>
      `;

      content = `
        <div class="fade-in">
          <div class="text-center mb-4">
            <div class="text-5xl mb-2">${char?.icon || '🧘'}</div>
            <h2 class="text-xl font-bold gold-text">${t('path_viewer.main_heading', {name: member.name})}</h2>
            <p class="text-[11px] text-amber-100/60 italic">${t('path_viewer.main_subtitle')}</p>
          </div>

          ${(() => {
            const rk = summary.rank;
            const ri = summary.rankInfo;
            const nextReq = summary.nextRankRequirements;
            const tierColor = ri.tier === 'pre-training' ? 'border-amber-900/40'
              : ri.tier === 'training' ? 'border-amber-700/60'
              : ri.tier === 'approaching' ? 'border-emerald-600/60'
              : 'border-purple-600/60';
            // Ladder — show all 10 ranks with current highlighted
            const ladder = PATH_RANKS.map(r => {
              const cls = r.id === rk ? 'bg-amber-700/40 border border-amber-400 text-amber-100 font-bold'
                : r.id < rk ? 'bg-amber-900/25 text-amber-200/70 line-through decoration-amber-600/40'
                : r.uncertifiable ? 'bg-purple-900/10 text-purple-200/50 italic'
                : 'bg-amber-900/10 text-amber-100/40';
              const marker = r.id === rk ? '◆' : r.id < rk ? '✓' : r.uncertifiable ? '◇' : '○';
              return `<div class="flex items-center gap-2 text-[11px] px-2 py-1 rounded ${cls}">
                <div class="w-3">${marker}</div>
                <div class="flex-1 ${r.uncertifiable ? 'text-purple-200/60' : ''}">${r.pali}</div>
                <div class="text-[10px] opacity-70">${r.english}</div>
              </div>`;
            }).join('');
            const nextHtml = nextReq ? `
              <div class="mt-3 pt-3 border-t border-amber-900/30">
                <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">To reach ${nextReq.nextInfo.pali}</div>
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
              <div class="mt-3 pt-3 border-t border-amber-900/30">
                <p class="text-[11px] text-amber-100/75 italic leading-relaxed">From here, rank advancement stops. The next transition — into the ariya tiers — is beyond what any self-report tool can certify. Keep practicing. Find a teacher in the living tradition.</p>
              </div>
            `;
            return `
              <div class="parchment rounded-xl p-4 mb-4 border-2 ${tierColor}">
                <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('path_viewer.rank.current_eyebrow')}</div>
                <h3 class="text-lg font-bold gold-text mt-1">${ri.pali}</h3>
                <div class="text-[11px] text-amber-200/80 italic">${ri.english} · ${ri.suttaRef}</div>
                <p class="text-xs text-amber-100/80 leading-relaxed mt-2">${ri.description}</p>
                ${ri.note ? `<p class="text-[11px] text-amber-300/80 italic mt-2">${ri.note}</p>` : ''}
                ${rk <= 1 ? `
                  <div class="mt-3 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                    <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('path_viewer.rank.beginning_label')}</div>
                    <p class="text-[11px] text-amber-100/80 leading-relaxed">${t('path_viewer.rank.beginning_body')}</p>
                  </div>
                ` : ''}

                <div class="mt-4 pt-3 border-t border-amber-900/30">
                  <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-2">${t('path_viewer.rank.ladder_label')}</div>
                  <div class="space-y-0.5">
                    ${ladder}
                  </div>
                  <p class="text-[10px] text-amber-100/50 italic mt-2">${t('path_viewer.rank.ladder_note')}</p>
                </div>

                ${nextHtml}
              </div>
            `;
          })()}

          ${(() => {
            // v9.3 — Trends: a compact sparkline card summarizing the last
            // 30 days of gate telemetry from state.path[memberId].rankHistory.
            // Only rendered if at least 3 snapshots exist (anything less is
            // noise). The data source is the daily snapshot appended by
            // writePathGateEvaluation — no historical recomputation here.
            const p = ensurePathRecord(m.memberId);
            const hist = (p.rankHistory || []).slice(-30);
            if (hist.length < 3) {
              return `
                <div class="parchment rounded-xl p-3 mb-4 border border-amber-900/30">
                  <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('path_viewer.trends.eyebrow_empty')}</div>
                  <p class="text-[11px] text-amber-100/55 italic">${t('path_viewer.trends.empty_note')}</p>
                </div>
              `;
            }
            const ranks = hist.map(s => s.rank);
            const gateDays = hist.map(s => s.gatePass ? 1 : 0);
            const hindranceSeries = hist.map(s => s.hindranceAvg == null ? 10 : s.hindranceAvg);
            const sitsSeries = hist.map(s => s.sits);
            const satiSeries = hist.map(s => s.sati == null ? 0 : s.sati);
            const viriyaSeries = hist.map(s => s.viriya == null ? 0 : s.viriya);
            const samadhiSeries = hist.map(s => s.samadhi == null ? 0 : s.samadhi);
            const firstDate = hist[0].date;
            const lastDate = hist[hist.length - 1].date;
            const trendRow = (label, series, min, max, color) => `
              <div class="flex items-center gap-3 py-1.5 border-b border-amber-900/20">
                <div class="flex-1 min-w-0">
                  <div class="text-[11px] text-amber-100/85">${label}</div>
                </div>
                <div>${renderSparkline(series, { width: 140, height: 28, min, max, color })}</div>
                <div class="text-[11px] text-amber-200 font-bold w-8 text-right">${series[series.length-1]?.toFixed?.(1) ?? series[series.length-1]}</div>
              </div>
            `;
            return `
              <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
                <div class="flex items-baseline justify-between mb-1">
                  <div>
                    <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('path_viewer.trends.eyebrow', {n: hist.length})}</div>
                    <h3 class="text-sm font-bold gold-text mt-1">${t('path_viewer.trends.heading')}</h3>
                  </div>
                  <div class="text-[10px] text-amber-100/45">${firstDate} → ${lastDate}</div>
                </div>
                <p class="text-[11px] text-amber-100/65 italic mb-2">${t('path_viewer.trends.intro_note')}</p>
                <div class="mt-2">
                  ${trendRow(t('path_viewer.trends.row_rank'), ranks, 0, 5, '#d4a857')}
                  ${trendRow(t('path_viewer.trends.row_hindrance'), hindranceSeries, 0, 10, '#f59e0b')}
                  ${trendRow(t('path_viewer.trends.row_sits'), sitsSeries, 0, 30, '#fbbf24')}
                  ${trendRow(t('path_viewer.trends.row_sati'), satiSeries, 0, 10, '#34d399')}
                  ${trendRow(t('path_viewer.trends.row_viriya'), viriyaSeries, 0, 10, '#f97316')}
                  ${trendRow(t('path_viewer.trends.row_samadhi'), samadhiSeries, 0, 10, '#60a5fa')}
                </div>
              </div>
            `;
          })()}

          <div class="parchment rounded-xl p-3 mb-4 bg-amber-900/15 border border-amber-700/30">
            <p class="text-[11px] text-amber-100/75 italic leading-relaxed">The cloud simile: the hindrances and defilements are weather passing through the sky of mind. The sky is not damaged when clouds pass through it. The damage comes from believing you are the clouds. Naming a state as "${domInfo ? domInfo.pali + ' is present' : 'a hindrance is present'}" — rather than "I am this" — is already half the work.</p>
          </div>

          ${(() => {
            // v9.2: the Seven Awakening Factors — parallel cultivation track
            // v9.3: first-time empty state — if every factor is null/zero,
            // show a welcoming "these are what will develop" message instead
            // of a wall of zeros.
            const rows = getAllFactorScores(m.memberId);
            const allEmpty = rows.every(r => r.score === null || r.score === 0);
            if (allEmpty) {
              return `
                <div class="parchment rounded-xl p-4 mb-4 border border-emerald-700/30">
                  <div class="text-[10px] uppercase tracking-wider text-emerald-300/80">${t('path_viewer.factors.eyebrow')}</div>
                  <h3 class="text-lg font-bold text-emerald-200 mt-1">The Seven Awakening Factors</h3>
                  <div class="text-[11px] text-emerald-200/60 italic">Satta Bojjhaṅgā · SN 46 · MN 118</div>
                  <div class="mt-3 p-3 bg-emerald-900/15 border border-emerald-700/25 rounded-lg">
                    <p class="text-[12px] text-emerald-100/85 leading-relaxed serif">${t('path_viewer.factors.empty_body')}</p>
                  </div>
                  <div class="mt-3 space-y-1">
                    ${SEVEN_FACTORS.map((f, i) => `
                      <div class="flex items-center gap-2 py-1 opacity-60">
                        <div class="w-4 text-center text-emerald-300/60 text-[10px]">${i + 1}</div>
                        <div class="text-base">${f.icon}</div>
                        <div class="flex-1">
                          <div class="text-[11px] text-emerald-100/70"><b>${f.pali}</b> <span class="text-amber-100/50">— ${f.english}</span></div>
                        </div>
                        <div class="text-[11px] text-emerald-400/40 w-8 text-right">○</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }
            const barFor = (score) => {
              if (score === null) return '';
              const pct = Math.round((score / 10) * 100);
              return `<div class="w-20 h-1 rounded-full bg-amber-900/40 overflow-hidden"><div class="h-full bg-emerald-400/70" style="width:${pct}%"></div></div>`;
            };
            return `
              <div class="parchment rounded-xl p-4 mb-4 border border-emerald-700/30">
                <div class="text-[10px] uppercase tracking-wider text-emerald-300/80">${t('path_viewer.factors.eyebrow')}</div>
                <h3 class="text-lg font-bold text-emerald-200 mt-1">The Seven Awakening Factors</h3>
                <div class="text-[11px] text-emerald-200/60 italic">Satta Bojjhaṅgā · SN 46 · MN 118</div>
                <p class="text-[11px] text-amber-100/75 leading-relaxed mt-2">${t('path_viewer.factors.populated_intro')}</p>
                <div class="mt-3 space-y-1.5">
                  ${rows.map(row => {
                    const f = row.factor;
                    if (row.measurable) {
                      const scoreStr = row.score !== null ? row.score.toFixed(1) : '—';
                      return `
                        <div class="flex items-center gap-2 py-1 border-b border-emerald-900/20">
                          <div class="text-base">${f.icon}</div>
                          <div class="flex-1">
                            <div class="text-xs text-emerald-100"><b>${f.pali}</b> <span class="text-amber-100/55">— ${f.english}</span></div>
                            <div class="text-[10px] text-emerald-300/60 italic">${f.derivation}</div>
                          </div>
                          ${barFor(row.score)}
                          <div class="text-[11px] text-emerald-200 font-bold w-8 text-right">${scoreStr}</div>
                        </div>
                      `;
                    } else {
                      const emerged = row.emerged;
                      return `
                        <div class="flex items-center gap-2 py-1 border-b border-emerald-900/20 ${emerged ? '' : 'opacity-55'}">
                          <div class="text-base">${f.icon}</div>
                          <div class="flex-1">
                            <div class="text-xs ${emerged ? 'text-emerald-100' : 'text-emerald-200/60'}"><b>${f.pali}</b> <span class="text-amber-100/50">— ${f.english}</span></div>
                            <div class="text-[10px] text-emerald-300/50 italic">${emerged ? t('path_viewer.factors.non_measurable_emerged') : 'arises when ' + f.emergentWhen}</div>
                          </div>
                          <div class="text-[11px] ${emerged ? 'text-emerald-200 font-bold' : 'text-emerald-400/40'} w-8 text-right">${emerged ? '✦' : '○'}</div>
                        </div>
                      `;
                    }
                  }).join('')}
                </div>
                <p class="text-[11px] text-amber-100/55 italic mt-3 leading-relaxed">${t('path_viewer.factors.footer_note')}</p>
              </div>
            `;
          })()}

          ${layer1Html}
          ${layer2Html}
          ${layer3Html}

          <div class="flex justify-between gap-2 items-center">
            <button class="text-[11px] text-amber-300/80 hover:text-amber-200 underline" onclick="exportPracticeHistory()">${t('path_viewer.export_button')}</button>
            <button class="btn btn-gold" onclick="closeModal()">${t('technique_teaching.close_button')}</button>
          </div>
        </div>
      `;
    }

  return content;
}
