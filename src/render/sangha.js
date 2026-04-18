// ============================================================================
// render/sangha.js
// ----------------------------------------------------------------------------
// The 🪷 Sangha tab — "where each companion stands."
//
// v9.5 redesign: replaced the earlier character-card / ability-card
// layout with a supportive-companions view. Each member shows current
// rank, dominant hindrance, current focus, sit count, and a simple
// progress bar. The framing is supportive, not competitive — a shared
// map of where everyone is on the path so the household can help each
// other (practical "who needs what" rather than leaderboard).
//
// Solo users see a gentle solo-walker message — the word "sangha" in
// the suttas does not mean "household", it means the community of
// practitioners, extending back to the Buddha's time. The tab is
// honest about this.
//
// Also includes a player-standing export per member that excludes any
// reflection text — this is explicitly for sharing progress with a
// teacher or spiritual friend without leaking private journaling.
//
// v14.1: Sangha-meaning teaching is collapsed to a one-line summary by
// default (with expand chevron). The full 4-paragraph teaching was
// important on first read but became scroll-weight forever.
//
// Dependencies (from global scope):
//   State:     state (members, path, diagnostics, sitRecords,
//                     reflectionLog, abilityStatus, questActive)
//              view (currentMember, sanghaTeachingExpanded)
//   Engine:    t() from engine/i18n.js
//   Helpers:   todayKey, computeMemberRank, getRankInfo,
//              dominantHindranceForMember, getHindranceInfo,
//              getFocusForNow, getSittingStats, exportMemberStanding
//   Data:      CHARACTERS, RANK_LADDER
// ============================================================================


// INLINE-JS: render/path.js

// ============================================================================
// v9.5 — SANGHA TAB (redesigned: "where each companion stands")
// ============================================================================
// Replaced the character-card / ability-card layout with a supportive
// companions view: each member shows their current rank, dominant hindrance,
// current focus, sit count, and a simple progress bar. The framing is
// supportive, not competitive — a shared map of where everyone is on the
// path so the household can help each other. Solo users see a gentle
// solo-walker message. Includes a lightweight player-standing export per
// member that excludes any reflection text.
// ============================================================================

function renderSangha() {
  const members = state.members || [];
  const isSolo = members.length <= 1;

  // v14.1 — Sangha tab collapse. The full "what a sangha means in the
  // suttas / why this tab is honestly not one / here's your real sangha"
  // teaching was 4 paragraphs of always-visible text. Important on first
  // read, then just scroll weight forever. Default to a one-line summary
  // with an "expand" chevron; full teaching stays one tap away.
  if (typeof view.sanghaExpand === 'undefined') view.sanghaExpand = false;
  const se = view.sanghaExpand;

  return `
    <div class="fade-in">
      <div class="parchment rounded-xl p-5 mb-4">
        <button onclick="toggleSanghaExpand()" class="w-full text-left flex items-baseline justify-between">
          <div>
            <h2 class="text-xl font-bold gold-text">${t('sangha.heading')}</h2>
            ${!se ? `<p class="text-xs text-amber-100/60 italic mt-1">${isSolo ? t('sangha.collapsed_sub_solo') : t('sangha.collapsed_sub_group')}</p>` : ''}
          </div>
          <span class="text-amber-300/70 text-lg">${se ? '▾' : '▸'}</span>
        </button>
        ${se ? (isSolo ? `
          <p class="text-sm text-amber-100/85 serif leading-relaxed mb-3 mt-3">
            ${t('sangha.expanded_solo_para1')}
          </p>
          <p class="text-sm text-amber-100/75 serif leading-relaxed mb-3">
            ${t('sangha.expanded_solo_para2')}
          </p>
          <p class="text-sm text-amber-100/75 serif leading-relaxed">
            ${t('sangha.expanded_solo_para3')}
          </p>
          <p class="text-[11px] text-amber-100/55 italic mt-3">${t('sangha.privacy_note')}</p>
        ` : `
          <p class="text-sm text-amber-100/75 italic mt-3">${t('sangha.expanded_group_intro')}</p>
          <p class="text-[11px] text-amber-100/55 italic mt-3">${t('sangha.privacy_note')}</p>
        `) : ''}
      </div>

      <div class="space-y-3">
        ${members.map(m => {
          const char = CHARACTERS[m.character] || {};
          const rk = computeMemberRank(m.id);
          const ri = getRankInfo(rk);
          const isCurrent = view.currentMember === m.id;

          // Tier color
          const tierColor = ri.tier === 'pre-training' ? 'border-amber-900/40 text-amber-100/55'
            : ri.tier === 'training' ? 'border-amber-700/60 text-amber-200'
            : ri.tier === 'approaching' ? 'border-emerald-600/60 text-emerald-200'
            : 'border-purple-600/60 text-purple-200';

          // Current focus — focusModeLabel via stable decision → t() map (lesson #7).
          const focus = getFocusForNow(m.id);
          const focusModeLabel = focus.mode === 'release'
            ? t('sangha.member.focus_mode_release')
            : (focus.mode === 'cultivate' && focus.title.startsWith('Deepen')
                ? t('sangha.member.focus_mode_deepen')
                : t('sangha.member.focus_mode_cultivate'));
          const focusBare = focus.title.replace(/^(Let go of: |Cultivate: |Deepen: )/, '');

          // Dominant hindrance
          const topHs = topTwoHindrances(m.id);
          const dominantHindrance = topHs[0];
          const dominantInfo = dominantHindrance ? FIVE_HINDRANCES.find(h => h.id === dominantHindrance.id) : null;

          // Sit count
          const sitsTotal = (state.sitRecords || []).filter(r => r.memberId === m.id).length;
          const sits30 = sitCountInWindow(m.id, 30);

          // Path summary for the gate
          const p = ensurePathRecord(m.id);
          const sustained = p.sustainedDays || 0;
          const maxSustained = p.maxSustainedDays || 0;

          // Liberation state
          const liberated = !!p.liberated;

          return `
            <div class="parchment ${isCurrent ? 'parchment-active' : ''} rounded-xl p-4 border-2 ${tierColor}">
              <div class="flex items-start gap-3">
                <div class="text-4xl">${char.icon || '🧘'}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline justify-between gap-2 flex-wrap">
                    <div>
                      <h3 class="text-lg font-bold" style="color:${char.color || '#f4e4bc'}">${m.name}</h3>
                      <div class="text-[11px] ${tierColor} italic">${t('sangha.member.rank_label', {pali: ri.pali})} <span class="text-amber-100/55 not-italic">${t('sangha.member.rank_sub', {rk, english: ri.english})}</span></div>
                    </div>
                    ${liberated ? `<div class="text-[10px] uppercase tracking-wider text-purple-300 font-bold">${t('sangha.member.liberated_badge')}</div>` : ''}
                  </div>

                  <div class="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div class="bg-amber-950/30 rounded p-1.5">
                      <div class="text-base font-bold text-amber-300">${sitsTotal}</div>
                      <div class="text-[9px] text-amber-100/55 uppercase tracking-wider">${t('sangha.member.stat_sits_total')}</div>
                    </div>
                    <div class="bg-amber-950/30 rounded p-1.5">
                      <div class="text-base font-bold text-amber-300">${sits30}</div>
                      <div class="text-[9px] text-amber-100/55 uppercase tracking-wider">${t('sangha.member.stat_sits_30d')}</div>
                    </div>
                    <div class="bg-amber-950/30 rounded p-1.5">
                      <div class="text-base font-bold text-amber-300">${sustained}</div>
                      <div class="text-[9px] text-amber-100/55 uppercase tracking-wider">${t('sangha.member.stat_gate_days')}</div>
                    </div>
                  </div>

                  <button onclick="switchMember('${m.id}'); showTab('path')" class="block w-full text-left mt-3 p-2 rounded border border-amber-900/30 hover:bg-amber-900/15 transition">
                    <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('sangha.member.focus_eyebrow')}</div>
                    <div class="text-xs text-amber-100/85 mt-0.5"><span class="text-base">${focus.icon}</span> <b class="text-amber-200">${focusModeLabel}:</b> ${focusBare}</div>
                  </button>

                  ${dominantInfo ? `
                    <div class="mt-2 p-2 rounded border border-amber-900/30 bg-amber-950/20">
                      <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('sangha.member.strongest_hindrance_eyebrow')}</div>
                      <div class="text-xs text-amber-100/85"><span class="text-base">${dominantInfo.icon}</span> <b class="text-amber-200">${dominantInfo.pali}</b> <span class="text-amber-100/55">— ${dominantInfo.english}</span> <span class="text-amber-300/60">${t('sangha.member.severity_suffix', {severity: dominantHindrance.avg.toFixed(1)})}</span></div>
                    </div>
                  ` : `
                    <div class="mt-2 text-[10px] text-amber-100/45 italic px-2">${t('sangha.member.no_dominant')}</div>
                  `}

                  <div class="mt-3 flex flex-wrap gap-3">
                    ${!isCurrent ? `<button onclick="switchMember('${m.id}')" class="text-[11px] text-amber-300/80 hover:text-amber-200 underline">${t('sangha.member.switch_to', {name: m.name})}</button>` : ''}
                    <button onclick="exportPlayerStanding('${m.id}')" class="text-[11px] text-amber-300/80 hover:text-amber-200 underline">${t('sangha.member.export_standing')}</button>
                    <button onclick="switchMember('${m.id}'); showTab('path')" class="text-[11px] text-amber-300/80 hover:text-amber-200 underline">${t('sangha.member.open_path')}</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="parchment rounded-xl p-4 mt-4 bg-amber-900/15 border border-amber-700/30">
        <p class="text-[11px] text-amber-100/75 italic leading-relaxed serif">${isSolo ? t('sangha.footer_solo') : t('sangha.footer_group')}</p>
      </div>
    </div>
  `;
}
