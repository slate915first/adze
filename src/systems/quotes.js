// ============================================================================
// src/systems/quotes.js
// ----------------------------------------------------------------------------
// Functions: getDailyAjahnChahTeaching, getDailyTeaching, getQuoteById,
//            quoteIsSaved, toggleQuoteSaved, savedQuotesForMember,
//            copyQuoteToClipboard, copySavedQuotesToClipboard,
//            printSavedQuotes
//
// v15.14 — saved-quotes schema migrated from positional index to stable id +
// embedded text/source. Reordering or pruning teaching-quotes.json no longer
// silently mangles user collections; saved quotes survive even when the
// underlying entry is removed from the catalog.
// ============================================================================

function getDailyAjahnChahTeaching() {
  return getDailyTeaching();
}

function getQuoteById(id) {
  if (!id) return null;
  return TEACHING_QUOTES.find(q => q.id === id) || null;
}

function quoteIsSaved(memberId, quoteId) {
  if (!memberId || !state.savedQuotes) return false;
  const arr = state.savedQuotes[memberId] || [];
  return arr.some(q => q.id === quoteId);
}

function toggleQuoteSaved(quoteId) {
  const mid = view.currentMember;
  if (!mid || !quoteId) return;
  if (!state.savedQuotes) state.savedQuotes = {};
  if (!state.savedQuotes[mid]) state.savedQuotes[mid] = [];
  const arr = state.savedQuotes[mid];
  const existingIdx = arr.findIndex(q => q.id === quoteId);
  if (existingIdx >= 0) {
    arr.splice(existingIdx, 1);
  } else {
    const q = getQuoteById(quoteId);
    if (!q) return; // unknown id — refuse to save a phantom
    // Embed text + source so the saved entry survives any future change to
    // teaching-quotes.json (renames, pruning, reorders).
    arr.push({ id: quoteId, text: q.text, source: q.source, savedAt: todayKey() });
  }
  saveState();
  render();
}

function savedQuotesForMember(memberId) {
  if (!memberId || !state.savedQuotes) return [];
  const arr = state.savedQuotes[memberId] || [];
  return arr
    .slice()
    .sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

// v15.14 — small helpers used by the Wisdom-tab Saved-quotes section.

function copyQuoteToClipboard(quoteId) {
  const q = getQuoteById(quoteId);
  if (!q) return;
  const text = `"${q.text}" — ${q.source}`;
  copyToClipboard(text);
}

function copySavedQuotesToClipboard(memberId) {
  const list = savedQuotesForMember(memberId);
  if (!list.length) return;
  const text = list.map(q => `"${q.text}" — ${q.source}`).join('\n\n');
  copyToClipboard(text);
}

// Opens a printable view in a new window. Browser handles the rest of the
// print pipeline (PDF export via "Save as PDF", paper, etc.). Keeps the
// printable HTML self-contained so it never picks up Adze's app chrome.
function printSavedQuotes(memberId) {
  const list = savedQuotesForMember(memberId);
  if (!list.length) return;

  // Group by source so the printout reads as small pocket-collections.
  const bySource = {};
  for (const q of list) {
    if (!bySource[q.source]) bySource[q.source] = [];
    bySource[q.source].push(q);
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));

  const groups = Object.entries(bySource).map(([source, qs]) => `
    <section>
      <h2>${esc(source)}</h2>
      <ul>
        ${qs.map(q => `<li>
          <p class="text">${esc(q.text)}</p>
          <p class="meta">saved ${esc(q.savedAt || '')}</p>
        </li>`).join('')}
      </ul>
    </section>
  `).join('');

  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>Adze · Saved teachings</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #1f1a14;
    background: #fdfaf3;
    padding: 32px 28px 56px;
    max-width: 720px;
    margin: 0 auto;
    line-height: 1.55;
  }
  header { border-bottom: 1px solid #c8b890; padding-bottom: 14px; margin-bottom: 24px; }
  header h1 { margin: 0 0 4px; font-size: 24px; font-weight: 700; }
  header .sub { margin: 0; font-size: 12px; font-style: italic; color: #6b5d3a; }
  section { margin-bottom: 28px; page-break-inside: avoid; }
  section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #8a7440; border-bottom: 1px solid #e6dcc0; padding-bottom: 4px; margin: 0 0 12px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { margin: 0 0 18px; padding-left: 16px; border-left: 3px solid #c8b890; }
  li .text { margin: 0 0 4px; font-size: 16px; font-style: italic; }
  li .meta { margin: 0; font-size: 10px; color: #9c8c5e; }
  footer { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e6dcc0; font-size: 10px; color: #9c8c5e; font-style: italic; text-align: center; }
  @media print {
    body { padding: 18mm 16mm; max-width: none; }
    header { border-bottom-color: #999; }
  }
</style>
</head><body>
<header>
  <h1>Saved teachings</h1>
  <p class="sub">Adze · ${esc(todayKey())} · ${list.length} teaching${list.length === 1 ? '' : 's'}</p>
</header>
${groups}
<footer>Printed from Adze — adze.life</footer>
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 200));<\/script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    // Pop-up blocked. Surface a gentle hint via the in-app toast or alert.
    alert('Pop-up blocked. Allow pop-ups for adze.life and try again.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function getDailyTeaching() {
  const dayIdx = state.questActive ? daysSinceReflectionStart() : 0;
  const todayHash = todayKey().split('-').reduce((s, n) => s + parseInt(n, 10), 0);

  // Try matching to the current member's dominant hindrance
  if (view && view.currentMember) {
    const top = (typeof topTwoHindrances === 'function') ? topTwoHindrances(view.currentMember) : [];
    if (top && top[0] && top[0].avg >= 5) {
      const tag = top[0].id;
      const matched = TEACHING_QUOTES
        .map((t, i) => ({ ...t, originalIndex: i }))
        .filter(t => t.relatesTo.includes(tag));
      if (matched.length > 0) {
        const idx = ((dayIdx + todayHash) % matched.length + matched.length) % matched.length;
        const pick = matched[idx];
        return { id: pick.id, text: pick.text, source: pick.source, index: pick.originalIndex, matchedTo: tag };
      }
    }
  }

  // Fallback: deterministic daily rotation through ALL teachings
  const idx = ((dayIdx + todayHash) % TEACHING_QUOTES.length + TEACHING_QUOTES.length) % TEACHING_QUOTES.length;
  const pick = TEACHING_QUOTES[idx];
  return { id: pick.id, text: pick.text, source: pick.source, index: idx, matchedTo: null };
}
