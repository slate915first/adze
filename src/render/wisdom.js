// ============================================================================
// render/wisdom.js
// ----------------------------------------------------------------------------
// The 📜 Wisdom tab — collected teachings, canonical sutta library,
// saved quotes.
//
// Three collapsible sections (v13.6 refactor — Dirk feedback that the
// tab scrolled forever in the pre-13.6 flat layout):
//
//   - Wisdom scrolls      narrative scrolls collected at story-quest
//                         milestones. Tap to re-read.
//   - Sutta library       the canonical Pāli map (39 suttas). Each entry
//                         shows ref, name, english title, rank gate, and
//                         whether it's been read. Gated suttas show
//                         "unlocks at rank N" instead of opening.
//   - Saved quotes        daily Ajahn Chah / Buddha / Nhat Hanh /
//                         Dalai Lama / generic teachings that the user
//                         tapped the heart on.
//
// The library section is filterable via `view.wisdomFilter` — "all" /
// "available" (rank-gated passed) / "read" (already opened).
//
// Dependencies (from global scope):
//   State:     state (wisdomCollected, savedQuotes, srs)
//              view (currentMember, wisdomFilter, wisdomExpand)
//   Engine:    t() from engine/i18n.js
//   Helpers:   computeMemberRank, hasReadSutta, srsDueToday, showWisdom,
//              showSuttaSubcategory, openSutta, openSuttaStudy
//   Data:      WISDOM_SCROLLS, SUTTA_LIBRARY, SUTTA_SUBCATEGORIES
// ============================================================================

function renderWisdom() {
  const collected = WISDOM_SCROLLS.filter(w => state.wisdomCollected.includes(w.id));
  const sealed = WISDOM_SCROLLS.filter(w => !state.wisdomCollected.includes(w.id));

  // v13.6 — collapsible sections. Dirk feedback: the tab scrolls forever.
  // Only the first ("Meditation guidance") is expanded by default; the rest
  // collapse behind tappable headers. State lives on view.wisdomExpand so
  // the user's open/closed choices survive within the session.
  if (!view.wisdomExpand) {
    view.wisdomExpand = { guidance: true, foundations: false, struggle: false, library: false, codex: false, savedQuotes: false };
  }
  if (typeof view.wisdomExpand.savedQuotes === 'undefined') view.wisdomExpand.savedQuotes = false;
  const we = view.wisdomExpand;
  const chevron = (open) => `<span class="text-amber-300/70 text-lg">${open ? '▾' : '▸'}</span>`;

  return `
    <div class="fade-in">
      <div class="parchment rounded-xl p-5 mb-4">
        <h2 class="text-xl font-bold gold-text mb-1">${t('wisdom.heading')}</h2>
        <p class="text-sm text-amber-100/75 italic">${t('wisdom.intro')}</p>
      </div>

      <!-- Meditation guidance -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
        <button onclick="toggleWisdomExpand('guidance')" class="w-full text-left flex items-baseline justify-between">
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('wisdom.container_1_of_2')}</div>
            <h3 class="text-lg font-bold gold-text">${t('wisdom.guidance.heading')}</h3>
            ${we.guidance
              ? `<p class="text-xs text-amber-100/70 italic mt-1">${t('wisdom.guidance.expanded_note')}</p>`
              : `<p class="text-[11px] text-amber-100/55 italic mt-1">${t('wisdom.guidance.collapsed_note')}</p>`}
          </div>
          ${chevron(we.guidance)}
        </button>
        ${we.guidance ? `
        <div class="mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('wisdom.guidance.basics_label')}</div>
          <button onclick="openMeditationTutorial(0)" class="parchment rounded-lg p-3 w-full text-left hover:parchment-active transition">
            <div class="flex items-center gap-2">
              <div class="text-xl">🌱</div>
              <div class="flex-1">
                <div class="text-sm font-bold text-amber-100">${t('wisdom.guidance.tutorial_title')}</div>
                <div class="text-[11px] text-amber-100/65">${t('wisdom.guidance.tutorial_desc')}</div>
              </div>
            </div>
          </button>
        </div>

        <div class="mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('wisdom.guidance.guided_flows_label')}</div>
          <div class="space-y-2">
            ${Object.values(GUIDED_FLOWS).map(flow => `
              <button onclick="openGuidedFlow('${flow.id}')" class="parchment rounded-lg p-3 w-full text-left hover:parchment-active transition">
                <div class="flex items-start gap-2">
                  <div class="text-xl">${flow.icon || '🪷'}</div>
                  <div class="flex-1">
                    <div class="text-sm font-bold text-amber-100">${flow.title}</div>
                    <div class="text-[11px] text-amber-100/65">${flow.subtitle || ''}</div>
                  </div>
                </div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="mb-3">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('wisdom.guidance.four_foundations_label')}</div>
          <p class="text-[11px] text-amber-100/60 italic mb-2">${t('wisdom.guidance.four_foundations_intro')}</p>
          <div class="space-y-1">
            <button onclick="openTeachingDetail('foundation_satipatthana', 'body')" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition text-[11px]">
              <b class="text-amber-200">${t('wisdom.guidance.foundation_body_label')}</b> <span class="text-amber-100/60">${t('wisdom.guidance.foundation_body_desc')}</span>
            </button>
            <button onclick="openTeachingDetail('foundation_satipatthana', 'feeling')" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition text-[11px]">
              <b class="text-amber-200">${t('wisdom.guidance.foundation_feeling_label')}</b> <span class="text-amber-100/60">${t('wisdom.guidance.foundation_feeling_desc')}</span>
            </button>
            <button onclick="openTeachingDetail('foundation_satipatthana', 'mind')" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition text-[11px]">
              <b class="text-amber-200">${t('wisdom.guidance.foundation_mind_label')}</b> <span class="text-amber-100/60">${t('wisdom.guidance.foundation_mind_desc')}</span>
            </button>
            <button onclick="openTeachingDetail('foundation_satipatthana', 'dhammas')" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition text-[11px]">
              <b class="text-amber-200">${t('wisdom.guidance.foundation_dhammas_label')}</b> <span class="text-amber-100/60">${t('wisdom.guidance.foundation_dhammas_desc')}</span>
            </button>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Foundations -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
        <button onclick="toggleWisdomExpand('foundations')" class="w-full text-left flex items-baseline justify-between">
          <div>
            <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('wisdom.container_2_of_2')}</div>
            <h3 class="text-lg font-bold gold-text">${t('wisdom.foundations.heading')}</h3>
            ${we.foundations
              ? `<p class="text-xs text-amber-100/70 italic mt-1">${t('wisdom.foundations.expanded_note')}</p>`
              : `<p class="text-[11px] text-amber-100/55 italic mt-1">${t('wisdom.foundations.collapsed_note')}</p>`}
          </div>
          ${chevron(we.foundations)}
        </button>
        ${we.foundations ? `
        <button onclick="openFoundations()" class="parchment rounded-lg p-3 w-full text-left hover:parchment-active transition mb-3">
          <div class="flex items-center gap-2">
            <div class="text-xl">☸️</div>
            <div class="flex-1">
              <div class="text-sm font-bold text-amber-100">${t('wisdom.foundations.four_truths_title')}</div>
              <div class="text-[11px] text-amber-100/65">${t('wisdom.foundations.four_truths_desc')}</div>
            </div>
          </div>
        </button>

        <div class="grid grid-cols-2 gap-2 mb-3">
          <button onclick="openTeachingDetail('layer', 1)" class="parchment rounded-lg p-2 text-left hover:parchment-active transition">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('wisdom.foundations.layer_1_label')}</div>
            <div class="text-xs font-bold text-amber-100">${t('wisdom.foundations.layer_1_title')}</div>
            <div class="text-[10px] text-amber-100/60">${t('wisdom.foundations.layer_1_pali')}</div>
          </button>
          <button onclick="openTeachingDetail('layer', 2)" class="parchment rounded-lg p-2 text-left hover:parchment-active transition">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('wisdom.foundations.layer_2_label')}</div>
            <div class="text-xs font-bold text-amber-100">${t('wisdom.foundations.layer_2_title')}</div>
            <div class="text-[10px] text-amber-100/60">${t('wisdom.foundations.layer_2_pali')}</div>
          </button>
          <button onclick="openTeachingDetail('layer', 3)" class="parchment rounded-lg p-2 text-left hover:parchment-active transition">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('wisdom.foundations.layer_3_label')}</div>
            <div class="text-xs font-bold text-amber-100">${t('wisdom.foundations.layer_3_title')}</div>
            <div class="text-[10px] text-amber-100/60">${t('wisdom.foundations.layer_3_pali')}</div>
          </button>
          <button onclick="openTeachingDetail('ladder', 'all')" class="parchment rounded-lg p-2 text-left hover:parchment-active transition">
            <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${t('wisdom.foundations.ladder_label')}</div>
            <div class="text-xs font-bold text-amber-100">${t('wisdom.foundations.ladder_title')}</div>
            <div class="text-[10px] text-amber-100/60">${t('wisdom.foundations.ladder_pali')}</div>
          </button>
        </div>

        <div class="mb-2">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('wisdom.foundations.five_hindrances_list_label')}</div>
          <div class="grid grid-cols-1 gap-1">
            ${FIVE_HINDRANCES.map(h => `
              <button onclick="openTeachingDetail('hindrance', '${h.id}')" class="rounded-lg p-2 text-left hover:bg-amber-900/20 transition text-[11px] border border-amber-900/20">
                <span class="text-base">${h.icon}</span>
                <b class="text-amber-200 ml-1">${h.pali}</b>
                <span class="text-amber-100/60">— ${h.english}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="mb-2">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('wisdom.foundations.seven_factors_list_label')}</div>
          <div class="grid grid-cols-1 gap-1">
            ${SEVEN_FACTORS.map(f => `
              <button onclick="openTeachingDetail('factor', '${f.id}')" class="rounded-lg p-2 text-left hover:bg-emerald-900/20 transition text-[11px] border border-emerald-900/20">
                <span class="text-base">${f.icon}</span>
                <b class="text-emerald-200 ml-1">${f.pali}</b>
                <span class="text-amber-100/60">— ${f.english}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="mb-2">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${t('wisdom.foundations.mara_armies_list_label')}</div>
          <div class="grid grid-cols-1 gap-1">
            ${MARA_ARMIES.map(a => `
              <button onclick="openTeachingDetail('army', ${a.id})" class="rounded-lg p-2 text-left hover:bg-amber-900/20 transition text-[11px] border border-amber-900/20">
                <span class="text-base">${a.icon}</span>
                <b class="text-amber-200 ml-1">${a.name}</b>
                <span class="text-amber-100/60">— ${a.english}</span>
              </button>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>

      <!-- v13.1: Browse suttas by practical subcategory (life struggles) -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
        <button onclick="toggleWisdomExpand('struggle')" class="w-full text-left flex items-baseline justify-between">
          <div>
            <h3 class="text-lg font-bold text-amber-200">${t('wisdom.struggle.heading')}</h3>
            ${we.struggle
              ? `<p class="text-[11px] text-amber-100/70 italic mt-1">${t('wisdom.struggle.expanded_note')}</p>`
              : `<p class="text-[11px] text-amber-100/55 italic mt-1">${t('wisdom.struggle.collapsed_note')}</p>`}
          </div>
          ${chevron(we.struggle)}
        </button>
        ${we.struggle ? `
        ${SUTTA_SUBCATEGORY_GROUPS.map(grp => {
          const subsInGroup = SUTTA_SUBCATEGORIES.filter(s => s.group === grp.id);
          return `
            <div class="mb-3 mt-3">
              <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-0.5">${grp.label}</div>
              <div class="text-[10px] text-amber-100/50 italic mb-2">${grp.blurb}</div>
              <div class="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                ${subsInGroup.map(sub => {
                  const count = suttasBySubcategory(sub.id).length;
                  const countText = count === 1
                    ? t('wisdom.struggle.sutta_count_one')
                    : t('wisdom.struggle.sutta_count_many', {n: count});
                  return `
                    <button onclick="openSuttaSubcategory('${sub.id}')"
                            class="parchment rounded-lg p-2 text-left hover:parchment-active transition border border-amber-700/20">
                      <div class="flex items-baseline gap-1.5">
                        <span class="text-base">${sub.icon}</span>
                        <div class="flex-1 min-w-0">
                          <div class="text-[11px] font-bold text-amber-100 truncate">${sub.label}</div>
                          <div class="text-[9px] text-amber-200/55">${countText}</div>
                        </div>
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
        ` : ''}
      </div>

      <!-- v9.10: Sutta library — canonical reading map with readiness gating -->
      <div class="parchment rounded-xl p-4 mb-4 border border-emerald-700/40">
        <button onclick="toggleWisdomExpand('library')" class="w-full text-left flex items-baseline justify-between">
          <div>
            <h3 class="text-lg font-bold text-emerald-200">${t('wisdom.library.heading')}</h3>
            ${we.library
              ? `<p class="text-[11px] text-amber-100/70 italic mt-1">${t('wisdom.library.expanded_note', {total: SUTTA_LIBRARY.length})}</p>`
              : `<p class="text-[11px] text-amber-100/55 italic mt-1">${t('wisdom.library.collapsed_note', {total: SUTTA_LIBRARY.length})}</p>`}
          </div>
          ${chevron(we.library)}
        </button>
        ${we.library ? `        ${(() => {
          const mid = view.currentMember;
          const myRank = mid ? computeMemberRank(mid) : 0;
          const readCount = mid ? suttasReadCount(mid) : 0;
          const total = SUTTA_LIBRARY.length;
          const grouped = groupSuttasByTag();

          // Display order: foundation first, then hindrances, then awakening factors, then advanced.
          // Labels come from t() so this array is rebuilt per render (cheap).
          const tagOrder = [
            { tag: 'foundation',   label: t('wisdom.library.tag.foundation'),   icon: '☸️' },
            { tag: 'sensual',      label: t('wisdom.library.tag.sensual'),      icon: '🔥' },
            { tag: 'illwill',      label: t('wisdom.library.tag.illwill'),      icon: '⚔️' },
            { tag: 'sloth',        label: t('wisdom.library.tag.sloth'),        icon: '😴' },
            { tag: 'restless',     label: t('wisdom.library.tag.restless'),     icon: '🌪️' },
            { tag: 'doubt',        label: t('wisdom.library.tag.doubt'),        icon: '❓' },
            { tag: 'sati',         label: t('wisdom.library.tag.sati'),         icon: '🪷' },
            { tag: 'samadhi',      label: t('wisdom.library.tag.samadhi'),      icon: '◯' },
            { tag: 'dhammavicaya', label: t('wisdom.library.tag.dhammavicaya'), icon: '🔍' },
            { tag: 'speech',       label: t('wisdom.library.tag.speech'),       icon: '💬' },
            { tag: 'effort',       label: t('wisdom.library.tag.effort'),       icon: '⚡' },
            { tag: 'view',         label: t('wisdom.library.tag.view'),         icon: '👁️' }
          ];
          const seenIds = new Set();
          let sections = '';
          for (const tag of tagOrder) {
            const list = grouped[tag.tag];
            if (!list || list.length === 0) continue;
            // Sort each section by minRank ascending so beginners see beginner texts first
            const sorted = [...list].sort((a, b) => a.minRank - b.minRank);
            sections += `
              <div class="mb-3">
                <div class="text-[10px] uppercase tracking-wider text-emerald-300/70 mb-1">${tag.icon} ${tag.label}</div>
                <div class="space-y-1">
                  ${sorted.map(s => {
                    const ready = myRank >= s.minRank;
                    const read = mid ? hasReadSutta(mid, s.id) : false;
                    const minRi = getRankInfo(s.minRank);
                    const stateLabel = read
                      ? t('wisdom.library.state_read')
                      : ready
                        ? t('wisdom.library.state_ready', {n: s.minRank})
                        : t('wisdom.library.state_above_rank', {pali: minRi.pali});
                    const stateColor = read ? 'text-emerald-300'
                      : ready ? 'text-amber-200/70'
                      : 'text-purple-300/70';
                    return `
                      <button onclick="openSutta('${s.id}')" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition ${read ? 'opacity-70' : ''}">
                        <div class="flex items-baseline justify-between gap-2">
                          <div class="flex-1 min-w-0">
                            <div class="text-[12px]"><b class="text-amber-100">${s.ref}</b> <span class="text-amber-200">${s.name}</span></div>
                            <div class="text-[10px] text-amber-100/55 truncate">${s.english}</div>
                          </div>
                          <div class="text-[10px] ${stateColor} shrink-0 italic">${stateLabel}</div>
                        </div>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
            sorted.forEach(s => seenIds.add(s.id));
          }

          return `
            <div class="text-[11px] text-emerald-300/80 mb-3">${t('wisdom.library.reading_log_count', {read: readCount, total})}</div>
            ${sections}
            <p class="text-[10px] text-amber-100/55 italic mt-3 leading-relaxed">${t('wisdom.library.bottom_note')}</p>
          `;
        })()}
        ` : ''}
      </div>

      <!-- v15.14 — Saved teachings (the personal collection of quotes the
           practitioner bookmarked from Today's "Word from the Buddha" card).
           Slotted after the Sutta library + before the Codex: the library is
           canonical content, this is curated personal content, the codex is
           narrative-quest rewards. Default collapsed (anti-scroll intent). -->
      <div class="parchment rounded-xl p-4 mb-4 border border-rose-700/30">
        ${(() => {
          const list = savedQuotesForMember(view.currentMember);
          const n = list.length;
          return `
            <button onclick="toggleWisdomExpand('savedQuotes')" class="w-full text-left flex items-baseline justify-between">
              <div>
                <h3 class="text-lg font-bold gold-text">${t('wisdom.saved_quotes.heading')}</h3>
                ${we.savedQuotes
                  ? `<p class="text-[11px] text-amber-100/70 italic mt-1">${t('wisdom.saved_quotes.expanded_note', {n})}</p>`
                  : `<p class="text-[11px] text-amber-100/55 italic mt-1">${n === 0 ? t('wisdom.saved_quotes.collapsed_empty') : t('wisdom.saved_quotes.collapsed_note', {n})}</p>`}
              </div>
              ${chevron(we.savedQuotes)}
            </button>
            ${we.savedQuotes ? (n === 0 ? `
              <p class="text-[11px] text-amber-100/55 italic mt-3">${t('wisdom.saved_quotes.empty_body')}</p>
            ` : `
              <div class="mt-3 mb-3 flex gap-2 flex-wrap">
                <button onclick="printSavedQuotes('${view.currentMember}')" class="btn btn-ghost text-xs">${t('wisdom.saved_quotes.print_button')}</button>
                <button onclick="copySavedQuotesToClipboard('${view.currentMember}')" class="btn btn-ghost text-xs">${t('wisdom.saved_quotes.copy_all_button')}</button>
              </div>
              ${(() => {
                const bySource = {};
                for (const q of list) {
                  if (!bySource[q.source]) bySource[q.source] = [];
                  bySource[q.source].push(q);
                }
                return Object.entries(bySource).map(([src, qs]) => `
                  <div class="mb-3">
                    <div class="text-[10px] uppercase tracking-wider text-amber-300/60 mb-1.5">${src}</div>
                    <div class="space-y-1.5">
                      ${qs.map(q => `
                        <div class="parchment rounded-lg p-2.5 border border-amber-700/20 flex items-start gap-2">
                          <div class="flex-1 min-w-0">
                            <p class="serif text-[12px] text-amber-100/90 italic leading-relaxed">"${q.text}"</p>
                            <div class="text-[9px] text-amber-100/40 mt-1">${t('wisdom.saved_quotes.saved_on', {date: q.savedAt || ''})}</div>
                          </div>
                          <div class="flex flex-col gap-1 shrink-0">
                            <button onclick="copyQuoteToClipboard('${q.id}')" class="text-amber-300/70 hover:text-amber-200 text-xs" title="${t('wisdom.saved_quotes.copy_one_title')}">⧉</button>
                            <button onclick="toggleQuoteSaved('${q.id}')" class="text-rose-400/80 hover:text-rose-300 text-lg" title="${t('wisdom.saved_quotes.unsave_title')}">♥</button>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                `).join('');
              })()}
            `) : ''}
          `;
        })()}
      </div>

      <!-- Collected wisdom scrolls -->
      <div class="parchment rounded-xl p-4 mb-4 border border-amber-900/40">
        <button onclick="toggleWisdomExpand('codex')" class="w-full text-left flex items-baseline justify-between">
          <div>
            <h3 class="text-lg font-bold gold-text">${t('wisdom.codex.heading')}</h3>
            ${we.codex
              ? `<p class="text-[11px] text-amber-100/70 italic mt-1">${t('wisdom.codex.expanded_note')}</p>`
              : `<p class="text-[11px] text-amber-100/55 italic mt-1">${t('wisdom.codex.collapsed_note', {collected: collected.length, total: WISDOM_SCROLLS.length, sealed: sealed.length})}</p>`}
          </div>
          ${chevron(we.codex)}
        </button>
        ${we.codex ? `
        <div class="text-[11px] text-amber-300/80 mb-3 mt-3">${t('wisdom.codex.collected_header', {collected: collected.length, total: WISDOM_SCROLLS.length})}</div>
        ${collected.length > 0 ? `
          <div class="space-y-1 mb-3">
            ${collected.map(w => `
              <button onclick="showWisdom('${w.id}')" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition text-[11px]">
                <b class="text-amber-100">${w.title}</b>
                <span class="text-amber-300/60 text-[10px]"> · ${w.source}</span>
              </button>
            `).join('')}
          </div>
        ` : `<p class="text-[11px] text-amber-100/50 italic mb-3">${t('wisdom.codex.empty')}</p>`}
        ${sealed.length > 0 ? `
          <div class="text-[10px] uppercase tracking-wider text-amber-300/60 mb-1">${t('wisdom.codex.sealed_label', {n: sealed.length})}</div>
          <p class="text-[10px] text-amber-100/50 italic">${t('wisdom.codex.sealed_note')}</p>
        ` : ''}
        ` : ''}
      </div>
    </div>
  `;
}
