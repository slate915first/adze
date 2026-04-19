// ============================================================================
// src/systems/practice-history.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 2 function(s): buildPracticeHistoryMarkdown, exportPracticeHistory
// ============================================================================

function buildPracticeHistoryMarkdown(memberId) {
  const member = state.members.find(m => m.id === memberId);
  if (!member) return '# No such member\n';
  const char = CHARACTERS[member.character];
  const ob = getOnboardingDiagnostic(memberId);
  const summary = getPathSummary(memberId);
  const rankInfo = summary.rankInfo;
  const factorRows = getAllFactorScores(memberId);
  const p = ensurePathRecord(memberId);
  const hist = (p.rankHistory || []).slice(-30);
  const sitsTotal = (state.sitRecords || []).filter(r => r.memberId === memberId).length;
  const sits30 = sitCountInWindow(memberId, 30);
  const journal30 = journalEvidenceCount(memberId, 30);

  // Recent journal entries — last 14 days, per-member
  const journalLines = [];
  for (let i = 0; i < 14; i++) {
    const dk = daysAgo(i);
    const entry = getMemberReflection(memberId, dk);
    if (entry?.daily?.answer) {
      journalLines.push({ date: dk, q: entry.daily.q, answer: entry.daily.answer, theme: entry.daily.theme });
    }
  }

  let md = '';
  md += `# Practice History — ${member.name}\n\n`;
  md += `*Exported ${new Date().toISOString().slice(0, 10)} from Adze.*\n\n`;
  md += `---\n\n`;

  // Identity
  md += `## Practitioner\n\n`;
  md += `- **Name:** ${member.name}\n`;
  if (char) md += `- **Sangha role:** ${char.name} — ${char.title}\n`;
  if (ob?.answers?.experience) md += `- **Experience level at start:** ${ob.answers.experience}\n`;
  if (ob?.answers?.dominant_hindrance) md += `- **Dominant hindrance at start:** ${ob.answers.dominant_hindrance}\n`;
  if (ob?.completedAt) md += `- **Started:** ${new Date(ob.completedAt).toISOString().slice(0, 10)}\n`;
  md += `\n`;

  // Current rank
  md += `## Current rank\n\n`;
  md += `**${rankInfo.pali}** — ${rankInfo.english}\n\n`;
  md += `*${rankInfo.suttaRef}*\n\n`;
  md += `> ${rankInfo.description}\n\n`;

  // Three-legged gate
  md += `## Layer 1 — The Five Hindrances (gate status)\n\n`;
  const gate = summary.gate;
  md += `- **Hindrance composite** (rolling ${summary.thresholds.ROLLING_WINDOW_DAYS}-day average, ceiling ${summary.thresholds.HINDRANCE_CEILING}): `;
  md += `${gate.metrics.hindranceComposite === null ? 'no data' : gate.metrics.hindranceComposite.toFixed(1)} — ${gate.hindranceAvgPass ? '✓ pass' : '○ not yet'}\n`;
  md += `- **Sits in rolling window** (target ${summary.thresholds.MIN_SITS_IN_WINDOW}): ${gate.metrics.sitsInWindow} — ${gate.sitsInWindowPass ? '✓ pass' : '○ not yet'}\n`;
  md += `- **Journal entries naming a hindrance** (target ${summary.thresholds.MIN_JOURNAL_ENTRIES_NAMING}): ${gate.metrics.journalEvidence} — ${gate.journalEvidencePass ? '✓ pass' : '○ not yet'}\n\n`;
  md += `**Sustained days:** ${summary.sustainedDays} (peak: ${summary.maxSustainedDays}, target: ${summary.targetDays})\n\n`;
  if (summary.stage1PassedAt) md += `**Layer 1 passed:** ${summary.stage1PassedAt.slice(0, 10)}\n\n`;

  // Layer 2 engagement
  if (isLayer2Available(memberId)) {
    md += `## Layer 2 — Māra's Ten Armies\n\n`;
    const engagedId = p.activeArmyEngagement;
    if (engagedId) {
      const army = MARA_ARMIES.find(a => a.id === engagedId);
      const entry = p.armies[engagedId];
      md += `**Currently engaging:** ${army?.name || '?'} (${army?.english || ''}) — ${entry?.status || 'engaging'}, ${entry?.consecutiveDays || 0} consecutive days sustained\n\n`;
    } else {
      md += `*No army currently engaged.*\n\n`;
    }
    // List non-dormant armies
    const active = MARA_ARMIES.filter(a => {
      const e = p.armies[a.id];
      return e && (e.status !== 'dormant' || e.consecutiveDays > 0);
    });
    if (active.length > 0) {
      md += `**Active history:**\n\n`;
      for (const a of active) {
        const e = p.armies[a.id];
        md += `- ${a.name} (${a.english}) — ${e.status}, ${e.consecutiveDays} days sustained\n`;
      }
      md += `\n`;
    }
  }

  // Seven Awakening Factors
  md += `## Cultivation — the Seven Awakening Factors\n\n`;
  for (const row of factorRows) {
    const f = row.factor;
    if (row.measurable) {
      md += `- **${f.pali}** (${f.english}) — ${row.score === null ? 'no data' : row.score.toFixed(1) + ' / 10'}\n`;
    } else {
      md += `- **${f.pali}** (${f.english}) — ${row.emerged ? t('path_viewer.factors.non_measurable_emerged') : 'not yet emerged'}\n`;
    }
  }
  md += `\n`;

  // Practice stats
  md += `## Practice statistics\n\n`;
  md += `- **Total sits logged:** ${sitsTotal}\n`;
  md += `- **Sits in last 30 days:** ${sits30}\n`;
  md += `- **Reflections naming a hindrance (30 days):** ${journal30}\n`;
  md += `\n`;

  // Trend history (last 14 days)
  if (hist.length > 0) {
    md += `## Recent trend (${hist.length} most recent days)\n\n`;
    md += `| Date | Rank | Sustained | Gate | Hindrance avg | Sits | Sati | Viriya | Samādhi |\n`;
    md += `|---|---|---|---|---|---|---|---|---|\n`;
    for (const s of hist.slice(-14)) {
      const gateStr = s.gatePass ? '✓' : '○';
      const hAvg = s.hindranceAvg == null ? '—' : s.hindranceAvg.toFixed(1);
      md += `| ${s.date} | ${s.rank} | ${s.sustainedDays} | ${gateStr} | ${hAvg} | ${s.sits} | ${s.sati ?? '—'} | ${s.viriya ?? '—'} | ${s.samadhi ?? '—'} |\n`;
    }
    md += `\n`;
  }

  // Recent journal entries
  if (journalLines.length > 0) {
    md += `## Recent journal entries (last 14 days)\n\n`;
    for (const j of journalLines) {
      md += `### ${j.date}${j.theme ? ' · ' + j.theme : ''}\n\n`;
      if (j.q) md += `*${j.q}*\n\n`;
      md += `${j.answer}\n\n`;
    }
  }

  md += `---\n\n`;
  md += `*This file is a snapshot of the practitioner's own history — generated locally, not uploaded anywhere. Share it with a teacher if you have one. Keep it for your own review. The data is yours.*\n`;

  return md;
}

function exportPracticeHistory() {
  const mid = view.currentMember;
  if (!mid) { alert(t('alerts.no_member')); return; }
  const member = state.members.find(m => m.id === mid);
  const md = buildPracticeHistoryMarkdown(mid);
  try {
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `practice-history-${(member?.name || 'member').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
}
