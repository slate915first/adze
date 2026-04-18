// ============================================================================
// render/study.js
// ----------------------------------------------------------------------------
// The 🎴 Study tab — the SRS flashcard system as a first-class surface.
//
// Before v13.6 the SRS engine was already fully implemented (srsEnsure,
// srsRate, srsDueToday, srsCardsForSutta, box/nextDue scheduling) but it
// was buried inside the Wisdom tab behind small "→ study this sutta"
// buttons. Dirk feedback: the teaching material is rich, but if nobody
// knows the flashcard system exists, it can't serve anyone. This tab
// makes the whole Q&A library visible at a glance.
//
// Three collapsible sections:
//
//   - Library       canonical map of every sutta with Q&A cards available
//   - Active        suttas the practitioner has started studying
//                   (expanded by default)
//   - Read          suttas that have been read but have no active study
//                   (expanded by default)
//
// The "Begin review session" CTA at the top kicks off the first card
// from the sutta with the most due cards — keeps a session coherent
// inside one text rather than jumping between them.
//
// Functions exported:
//   renderStudy()               tab body
//   toggleStudyExpand(key)      expand/collapse helper
//   beginStudyReviewSession()   review-session opener
//
// Dependencies (from global scope):
//   State:     state (srs)
//              view (currentMember, studyExpand)
//   Engine:    t() from engine/i18n.js
//   Helpers:   srsDueToday, srsCardsForSutta, hasReadSutta,
//              hasStartedSutta, openSuttaStudy, render
//   Data:      SUTTA_LIBRARY
// ============================================================================

// ============================================================================
// v13.6 — STUDY TAB
// Surfaces the SRS flashcard system (previously buried inside the Wisdom tab
// behind "→ study this sutta" buttons) as a first-class tool for retention.
// Dirk feedback: the teaching material is rich, but if nobody knows the
// flashcard system exists, it can't serve anyone. This tab makes the whole
// Q&A library visible at a glance: what's due today, what you've started,
// what the canonical map looks like.
//
// The SRS engine (srsEnsure, srsRate, srsDueToday, srsCardsForSutta, the
// box/nextDue scheduling) was already implemented. This function is UI only.
// ============================================================================

function renderStudy() {
  const mid = view.currentMember;
  if (!mid) {
    return `<div class="parchment rounded-xl p-8 text-center fade-in">
      <p class="text-amber-100/70">${t('study.no_member')}</p>
    </div>`;
  }

  // Compute the overview numbers.
  const due = srsDueToday(mid);
  const dueBySutta = {};
  for (const d of due) {
    if (!dueBySutta[d.suttaId]) dueBySutta[d.suttaId] = 0;
    dueBySutta[d.suttaId]++;
  }
  const dueCount = due.length;

  // Suttas the practitioner has read but not yet turned into study cards.
  // state.suttasRead[memberId] is an object keyed by suttaId (truthy values
  // indicate read). suttasRead.length would not work.
  const readRecord = state.suttasRead?.[mid] || {};
  const readUnstarted = Object.keys(readRecord).filter(sid => !srsHasStarted(mid, sid));

  // Suttas with active study in progress (started but not fully mastered)
  const activeStudies = [];
  for (const sutta of SUTTA_LIBRARY) {
    if (!srsHasStarted(mid, sutta.id)) continue;
    const info = srsCardsForSutta(mid, sutta.id);
    if (info.total === 0) continue;
    activeStudies.push({ sutta, info });
  }
  // Sort: most-due first, then most-recent
  activeStudies.sort((a, b) => b.info.due - a.info.due);

  // Library, grouped by teaching category using the SUTTA_LIBRARY order
  // (already curated by foundation, hindrance, awakening, speech, deeper, endgame).
  // Each sutta shows its progress so the user sees what they've touched vs not.
  // Group IDs are stable; display labels come from t() so groups survive translation.
  const groupOf = (sutta) => {
    const t = sutta.teaches || [];
    if (t.includes('foundation')) return 'foundations';
    if (t.some(x => ['sensual','illwill','sloth','restless','doubt'].includes(x))) return 'hindrances';
    if (t.includes('awakening')) return 'awakening';
    if (t.some(x => ['speech','conduct','sila'].includes(x))) return 'speech';
    if (t.some(x => ['anatta','view','dependent'].includes(x))) return 'deeper';
    if (t.includes('endgame')) return 'endgame';
    return 'other';
  };
  const GROUP_ORDER = ['foundations', 'hindrances', 'awakening', 'speech', 'deeper', 'endgame', 'other'];
  const groupLabels = {
    foundations: t('study.groups.foundations'),
    hindrances:  t('study.groups.hindrances'),
    awakening:   t('study.groups.awakening'),
    speech:      t('study.groups.speech'),
    deeper:      t('study.groups.deeper'),
    endgame:     t('study.groups.endgame'),
    other:       t('study.groups.other')
  };
  const groups = { foundations: [], hindrances: [], awakening: [], speech: [], deeper: [], endgame: [], other: [] };
  for (const sutta of SUTTA_LIBRARY) {
    if (!SUTTA_QUESTIONS[sutta.id] || SUTTA_QUESTIONS[sutta.id].length === 0) continue;
    groups[groupOf(sutta)].push(sutta);
  }

  // v13.6 — collapsible expand flags live on the view object so they persist
  // across re-renders within a session but not across page loads.
  if (!view.studyExpand) view.studyExpand = { library: false, active: true, read: true };

  // Pluralization helpers — static t() keys per branch so verify_strings detects both.
  const dueHeading = dueCount === 1
    ? t('study.due.heading_one')
    : t('study.due.heading_many', {n: dueCount});
  const suttaCount = Object.keys(dueBySutta).length;
  const dueBody = suttaCount === 1
    ? t('study.due.body_one')
    : t('study.due.body_many', {n: suttaCount});
  const emptyTail = activeStudies.length === 0
    ? t('study.empty.tail_no_active')
    : t('study.empty.tail_has_active');

  // ----- Due Today hero card -----
  const dueHero = dueCount > 0 ? `
    <div class="parchment rounded-xl p-5 mb-4 lotus-glow border border-amber-400/50">
      <div class="flex items-start gap-3">
        <div class="text-4xl">🎴</div>
        <div class="flex-1">
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80">${t('study.due.eyebrow')}</div>
          <h2 class="text-2xl font-bold gold-text">${dueHeading}</h2>
          <p class="text-xs text-amber-100/70 italic mt-1 leading-relaxed">${dueBody}</p>
          <button onclick="beginStudyReviewSession()" class="btn btn-gold mt-3 text-sm">${t('study.due.begin_review')}</button>
        </div>
      </div>
    </div>
  ` : `
    <div class="parchment rounded-xl p-5 mb-4 border border-emerald-700/30">
      <div class="flex items-start gap-3">
        <div class="text-3xl">🪷</div>
        <div class="flex-1">
          <div class="text-[10px] uppercase tracking-wider text-emerald-300/80">${t('study.empty.eyebrow')}</div>
          <h2 class="text-lg font-bold gold-text">${t('study.empty.heading')}</h2>
          <p class="text-xs text-amber-100/70 italic mt-1 leading-relaxed">${t('study.empty.body_prefix')} ${emptyTail}</p>
        </div>
      </div>
    </div>
  `;

  // ----- Intro/header -----
  const header = `
    <div class="parchment rounded-xl p-5 mb-4">
      <h2 class="text-xl font-bold gold-text mb-1">${t('study.header.heading')}</h2>
      <p class="text-sm text-amber-100/80 serif leading-relaxed">
        ${t('study.header.body')}
      </p>
      <p class="text-[11px] text-amber-100/55 italic mt-2">${t('study.header.note')}</p>
    </div>
  `;

  // ----- Read-but-not-started -----
  const readHeading = readUnstarted.length === 1
    ? t('study.read.heading_one')
    : t('study.read.heading_many', {n: readUnstarted.length});
  const readBlock = readUnstarted.length > 0 ? `
    <div class="parchment rounded-xl p-4 mb-4 border border-purple-700/30 bg-purple-950/10">
      <button onclick="toggleStudyExpand('read')" class="w-full text-left flex items-baseline justify-between">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-purple-300/80 mb-1">${t('study.read.eyebrow')}</div>
          <h3 class="text-base font-bold text-amber-100">${readHeading}</h3>
        </div>
        <span class="text-amber-300/70 text-lg">${view.studyExpand.read ? '▾' : '▸'}</span>
      </button>
      ${view.studyExpand.read ? `
        <p class="text-[11px] text-amber-100/65 italic mt-2 leading-relaxed">${t('study.read.body')}</p>
        <div class="space-y-1.5 mt-3">
          ${readUnstarted.map(sid => {
            const s = SUTTA_LIBRARY.find(x => x.id === sid);
            if (!s) return '';
            const qcount = (SUTTA_QUESTIONS[sid] || []).length;
            if (qcount === 0) return '';
            const cardsReady = qcount === 1
              ? t('study.read.cards_ready_one')
              : t('study.read.cards_ready_many', {n: qcount});
            return `
              <button onclick="openSuttaStudy('${sid}')" class="parchment rounded-lg p-2 w-full text-left hover:parchment-active transition">
                <div class="flex items-start gap-2">
                  <div class="text-base mt-0.5">📜</div>
                  <div class="flex-1 min-w-0">
                    <div class="text-[11px] font-bold text-amber-100">${s.ref} · ${s.name}</div>
                    <div class="text-[10px] text-amber-100/60 italic">${s.english} · ${cardsReady}</div>
                  </div>
                  <div class="text-[10px] text-amber-300/70 shrink-0">${t('study.read.start_action')}</div>
                </div>
              </button>
            `;
          }).filter(Boolean).join('')}
        </div>
      ` : ''}
    </div>
  ` : '';

  // ----- Active studies -----
  const activeHeading = activeStudies.length === 1
    ? t('study.active.heading_one')
    : t('study.active.heading_many', {n: activeStudies.length});
  const activeBlock = activeStudies.length > 0 ? `
    <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
      <button onclick="toggleStudyExpand('active')" class="w-full text-left flex items-baseline justify-between">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('study.active.eyebrow')}</div>
          <h3 class="text-base font-bold text-amber-100">${activeHeading}</h3>
        </div>
        <span class="text-amber-300/70 text-lg">${view.studyExpand.active ? '▾' : '▸'}</span>
      </button>
      ${view.studyExpand.active ? `
        <div class="space-y-1.5 mt-3">
          ${activeStudies.map(({ sutta, info }) => {
            const pct = info.total > 0 ? Math.round((info.mastered / info.total) * 100) : 0;
            const dueBadge = info.due > 0 ? `<span class="text-[10px] bg-amber-600/40 text-amber-100 px-1.5 py-0.5 rounded">${t('study.active.due_badge', {n: info.due})}</span>` : '';
            const masteredBadge = info.mastered > 0
              ? `<span class="text-[10px] text-emerald-300/80">${t('study.active.mastered_badge', {n: info.mastered, total: info.total})}</span>`
              : `<span class="text-[10px] text-amber-100/55">${t('study.active.started_badge', {n: info.started, total: info.total})}</span>`;
            return `
              <button onclick="openSuttaStudy('${sutta.id}')" class="parchment rounded-lg p-2.5 w-full text-left hover:parchment-active transition">
                <div class="flex items-start gap-2">
                  <div class="text-base mt-0.5">🎴</div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-baseline gap-2 flex-wrap">
                      <div class="text-[11px] font-bold text-amber-100">${sutta.ref} · ${sutta.name}</div>
                      ${dueBadge}
                    </div>
                    <div class="text-[10px] text-amber-100/60 italic mt-0.5">${sutta.english}</div>
                    <div class="mt-1 flex items-center gap-2">
                      <div class="flex-1 h-1 bg-amber-900/30 rounded-full overflow-hidden">
                        <div class="h-full bg-amber-400/70 transition-all" style="width:${pct}%"></div>
                      </div>
                      ${masteredBadge}
                    </div>
                  </div>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
  ` : '';

  // ----- Library -----
  const libraryBlock = `
    <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/30">
      <button onclick="toggleStudyExpand('library')" class="w-full text-left flex items-baseline justify-between">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-amber-300/80 mb-1">${t('study.library.eyebrow')}</div>
          <h3 class="text-base font-bold text-amber-100">${t('study.library.heading')}</h3>
        </div>
        <span class="text-amber-300/70 text-lg">${view.studyExpand.library ? '▾' : '▸'}</span>
      </button>
      ${view.studyExpand.library ? `
        <p class="text-[11px] text-amber-100/55 italic mt-2">${t('study.library.body')}</p>
        <div class="space-y-3 mt-3">
          ${GROUP_ORDER.filter(gid => groups[gid].length > 0).map(gid => `
            <div>
              <div class="text-[10px] uppercase tracking-wider text-amber-300/70 mb-1">${groupLabels[gid]} <span class="opacity-60">· ${groups[gid].length}</span></div>
              <div class="space-y-1">
                ${groups[gid].map(sutta => {
                  const ready = isSuttaReadyForMember(mid, sutta.id);
                  const started = srsHasStarted(mid, sutta.id);
                  const qcount = (SUTTA_QUESTIONS[sutta.id] || []).length;
                  const info = started ? srsCardsForSutta(mid, sutta.id) : null;
                  const lockedClass = ready ? '' : 'opacity-60';
                  const lockedIcon = ready ? '📜' : '🔒';
                  const cardsTag = qcount === 1
                    ? t('study.library.cards_tag_one')
                    : t('study.library.cards_tag_many', {n: qcount});
                  const stateTag = !ready
                    ? `<span class="text-[10px] text-amber-100/45">${t('study.library.locked_tag', {n: sutta.minRank})}</span>`
                    : started
                      ? `<span class="text-[10px] text-emerald-300/75">${info.started}/${info.total}${info.due > 0 ? ' · ' + info.due + ' due' : ''}</span>`
                      : `<span class="text-[10px] text-amber-200/60">${cardsTag}</span>`;
                  // NOTE: alert() text can't use template interpolation directly in the
                  // onclick string without quote-escaping. We construct the localized
                  // alert text here and pass it through a tiny helper.
                  const lockedAlertText = t('study.library.locked_alert', {n: sutta.minRank}).replace(/'/g, "\\'");
                  const action = !ready
                    ? `alert('${lockedAlertText}')`
                    : started
                      ? `openSuttaStudy('${sutta.id}')`
                      : `openSutta('${sutta.id}')`;
                  return `
                    <button onclick="${action}" class="parchment rounded p-2 w-full text-left hover:parchment-active transition ${lockedClass}">
                      <div class="flex items-baseline gap-2">
                        <div class="text-sm">${lockedIcon}</div>
                        <div class="flex-1 min-w-0">
                          <div class="text-[11px] font-bold text-amber-100">${sutta.ref} · ${sutta.name}</div>
                          <div class="text-[10px] text-amber-100/55 italic">${sutta.english}</div>
                        </div>
                        ${stateTag}
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  return `
    <div class="fade-in">
      ${header}
      ${dueHero}
      ${readBlock}
      ${activeBlock}
      ${libraryBlock}
      <p class="text-[11px] text-amber-100/45 italic text-center mt-3">${t('study.footer_note')}</p>
    </div>
  `;
}

// v13.6 — Study tab: toggle a collapsible section.
function toggleStudyExpand(key) {
  if (!view.studyExpand) view.studyExpand = { library: false, active: true, read: true };
  view.studyExpand[key] = !view.studyExpand[key];
  render();
}

// v13.6 — Begin a review session by opening the first due card. The SRS
// modal already handles advancing to the next due card after each rating
// via srsNextDueForSutta; we just kick it off on the sutta with the most
// due cards so the session stays focused.
function beginStudyReviewSession() {
  const mid = view.currentMember;
  if (!mid) return;
  const due = srsDueToday(mid);
  if (due.length === 0) return;
  // Group by sutta and pick the one with most due (keeps a review session
  // coherent inside one sutta rather than jumping between texts).
  const bySutta = {};
  for (const d of due) bySutta[d.suttaId] = (bySutta[d.suttaId] || 0) + 1;
  const suttaId = Object.keys(bySutta).sort((a, b) => bySutta[b] - bySutta[a])[0];
  openSuttaStudy(suttaId);
}
