// ============================================================================
// src/modals/reflection-history.js
// ----------------------------------------------------------------------------
// v15.17 — Read-back of the practitioner's own daily / weekly / monthly /
// one-line reflections. Two phases in one modal (NOT two nested modals —
// nested breaks the iOS backdrop-dismiss gesture and stacks the close
// button logic):
//
//   list    — reverse-chronological list of every past entry the
//             practitioner has written. Tap a row to open detail.
//   detail  — read-only full text of one entry. Back button returns to list.
//
// Teaching framing (dhamma-reviewer condition): the top of every phase
// carries a single line of teaching-honest copy naming this as vicāra
// (investigation), not progress-audit. Zero counts, zero streaks, zero
// per-hindrance aggregates (game-designer anti-pattern vetoes).
// ============================================================================

function renderReflectionHistoryModal(m) {
  const phase = m.phase || 'list';
  const memberId = view.currentMember;
  const entries = (typeof getAllPastReflections === 'function')
    ? getAllPastReflections(memberId)
    : [];

  if (phase === 'detail' && m.entryId) {
    const entry = entries.find(e => e.id === m.entryId);
    if (entry) return _renderReflectionHistoryDetail(entry);
    // Fall through to list if the entry disappeared (shouldn't happen).
  }
  return _renderReflectionHistoryList(entries);
}

function _renderReflectionHistoryList(entries) {
  const framing = t('reflection_history.framing');
  const empty = `
    <div class="parchment rounded-xl p-6 mb-3 text-center">
      <p class="text-sm text-amber-100/70 italic serif">${t('reflection_history.empty')}</p>
    </div>
  `;
  const rows = entries.map(e => `
    <button
      onclick="openReflectionHistoryDetail('${e.id}')"
      class="w-full text-left parchment rounded-lg p-3 mb-2 border border-amber-900/30 hover:border-amber-700/50 transition">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-[10px] uppercase tracking-wider text-amber-300/70">${escapeHtml(e.title)}</span>
        <span class="text-[10px] text-amber-100/55 ml-auto">${_reflectionHistoryFormatDate(e.date)}</span>
      </div>
      <div class="text-[12px] text-amber-100/85 leading-relaxed">${escapeHtml(e.preview)}</div>
    </button>
  `).join('');

  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-3xl mb-1">📖</div>
        <h2 class="text-lg font-bold gold-text">${t('reflection_history.heading')}</h2>
        <p class="text-[11px] text-amber-200/75 italic serif mt-1 max-w-xs mx-auto leading-relaxed">${framing}</p>
      </div>
      <div
        class="max-h-[65vh] overflow-y-auto pr-1"
        style="-webkit-overflow-scrolling: touch; overscroll-behavior: contain;">
        ${entries.length === 0 ? empty : rows}
      </div>
      <div class="flex justify-center mt-4">
        <button class="btn btn-ghost text-sm" onclick="closeModal()">${t('reflection_history.close_button')}</button>
      </div>
    </div>
  `;
}

function _renderReflectionHistoryDetail(entry) {
  const framing = t('reflection_history.framing');
  const bodyHtml = escapeHtml(entry.body || '').replace(/\n\n+/g, '</p><p class="mt-3">').replace(/\n/g, '<br>');
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-[10px] uppercase tracking-wider text-amber-300/70">${escapeHtml(entry.title)}</div>
        <div class="text-xs text-amber-100/60 mt-0.5">${_reflectionHistoryFormatDate(entry.date)}</div>
        <p class="text-[11px] text-amber-200/75 italic serif mt-2 max-w-xs mx-auto leading-relaxed">${framing}</p>
      </div>
      <div
        class="parchment rounded-xl p-4 mb-3 max-h-[60vh] overflow-y-auto"
        style="-webkit-overflow-scrolling: touch; overscroll-behavior: contain;">
        <div class="text-sm text-amber-100/90 leading-relaxed serif"><p>${bodyHtml}</p></div>
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost text-sm" onclick="backToReflectionHistoryList()">← ${t('reflection_history.back_button')}</button>
        <button class="btn btn-ghost text-sm" onclick="closeModal()">${t('reflection_history.close_button')}</button>
      </div>
    </div>
  `;
}

// Render YYYY-MM-DD as a human-readable short date anchored to the
// practitioner's locale (whatever the browser reports). Falls back to the
// raw date key on any Intl failure — the list must never crash on a dodgy
// historical timestamp.
function _reflectionHistoryFormatDate(dateKey) {
  if (!dateKey) return '';
  try {
    const d = new Date(dateKey + 'T12:00:00');
    if (isNaN(d.getTime())) return dateKey;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateKey;
  }
}
