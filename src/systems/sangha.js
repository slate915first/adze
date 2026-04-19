// ============================================================================
// src/systems/sangha.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 7 function(s): getSanghaActivityToday, getCharacterCurrentState, buildPlayerStandingMarkdown, exportPlayerStanding, findNextMemberNeedingEvening, switchToNextMemberForEvening, skipNextMemberEvening
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

function getSanghaActivityToday(memberId) {
  const lines = [];
  if (!state.members) return lines;

  // v15.17.3 — Mahāpajāpatī's "×1.2 score while Shadow is high" passive
  // was removed (see config.js mahapajapati). The sangha activity line
  // that narrated it is therefore removed too. When a shadowDecayRateBonus
  // replacement lands, add a corresponding line here.

  // Upāli — a forgiven miss is currently keeping a streak alive
  const upali = state.members.find(m => m.character === 'upali');
  if (upali) {
    let saved = false;
    for (const m of state.members) {
      for (const kh of getKeyHabits(m.id)) {
        let recentMisses = 0;
        for (let i = 0; i < 7; i++) {
          const log = state.log[daysAgo(i)]?.[m.id];
          if (log && log[kh.id] === false) recentMisses++;
        }
        if (recentMisses >= 1 && streakForHabit(m.id, kh.id) > 0) {
          saved = true;
        }
      }
    }
    if (saved) {
      const c = CHARACTERS.upali;
      lines.push({
        icon: c.icon,
        char: c.name,
        text: `forgave a missed day this week — a streak holds because of him.`
      });
    }
  }

  // Sāriputta — used the weekly forgiveness this week
  const sariputtas = state.members.filter(m => m.character === 'sariputta');
  for (const s of sariputtas) {
    const week = currentISOWeek();
    if (state.abilityUses?.[s.id]?.weeklyMissForgiveness?.[week]) {
      const c = CHARACTERS.sariputta;
      lines.push({
        icon: c.icon,
        char: c.name,
        text: `forgave a missed key habit this week. (1/week, used)`
      });
      break;
    }
  }

  // Khemā — used the per-stage dismissal in the current stage
  const khemas = state.members.filter(m => m.character === 'khema');
  for (const k of khemas) {
    const stageKey = 'stage-' + (state.currentStage || 0);
    if (state.abilityUses?.[k.id]?.armyDismissal?.[stageKey]) {
      const c = CHARACTERS.khema;
      lines.push({
        icon: c.icon,
        char: c.name,
        text: `dismissed an army with her wisdom this stage. (1/stage, used)`
      });
      break;
    }
  }

  // Moggallāna — used the rescue today
  const moggallanas = state.members.filter(m => m.character === 'moggallana');
  for (const mg of moggallanas) {
    const dk = todayKey();
    if (state.abilityUses?.[mg.id]?.teammateRescue?.[dk]) {
      const c = CHARACTERS.moggallana;
      lines.push({
        icon: c.icon,
        char: c.name,
        text: `rescued a teammate with a 10-point gift today.`
      });
      break;
    }
  }

  return lines;
}

function getCharacterCurrentState(memberId) {
  const m = state.members.find(x => x.id === memberId);
  if (!m) return null;
  switch (m.character) {
    case 'mahakassapa':
      return { active: true, text: 'Currently reducing total Shadow by 3 (always).' };
    case 'ananda':
      return { active: true, text: 'Each stage advance grants 1 extra wisdom scroll.' };
    case 'anuruddha':
      return { active: true, text: 'Currently revealing the next stage\'s armies on the Quest tab.' };
    case 'upali':
      return { active: true, text: 'Forgives 1 missed day per rolling week — your streaks survive one slip.' };
    case 'mahapajapati': {
      const active = state.shadow > 60;
      return {
        active,
        text: active
          ? 'Active — boosting all team scores by 20% while the Shadow is above 60.'
          : 'Will boost all team scores by 20% if the Shadow ever rises above 60.'
      };
    }
    case 'sariputta': {
      const week = currentISOWeek();
      const used = state.abilityUses?.[memberId]?.weeklyMissForgiveness?.[week];
      return {
        active: !used,
        text: used
          ? 'Forgiveness used this week. Refreshes next ISO week.'
          : 'Can forgive 1 missed key habit this week. Tap a missed habit row to use.'
      };
    }
    case 'khema': {
      const stageKey = 'stage-' + (state.currentStage || 0);
      const used = state.abilityUses?.[memberId]?.armyDismissal?.[stageKey];
      return {
        active: !used,
        text: used
          ? 'Dismissal used this stage. Refreshes next stage.'
          : 'Can dismiss 1 Māra army this stage. Tap any army challenge to use.'
      };
    }
    case 'moggallana': {
      const dk = todayKey();
      const used = state.abilityUses?.[memberId]?.teammateRescue?.[dk];
      return {
        active: !used,
        text: used
          ? 'Rescue sent today. Refreshes tomorrow.'
          : 'Can gift 10 points to a teammate today.'
      };
    }
    default:
      return null;
  }
}

function buildPlayerStandingMarkdown(memberId) {
  const member = state.members.find(m => m.id === memberId);
  if (!member) return '# No such member\n';
  const rk = computeMemberRank(memberId);
  const ri = getRankInfo(rk);
  const p = ensurePathRecord(memberId);
  const sitsTotal = (state.sitRecords || []).filter(r => r.memberId === memberId).length;
  const sits30 = sitCountInWindow(memberId, 30);
  const journal30 = journalEvidenceCount(memberId, 30);
  const compAvg = hindranceCompositeAverage(memberId, 30);
  const factorRows = getAllFactorScores(memberId);
  const today = new Date().toISOString().slice(0, 10);

  let md = '';
  md += `# Player Standing — ${member.name}\n\n`;
  md += `*Generated ${today} from Adze. This is a short reference for sharing with a teacher or trusted friend. It contains no reflection or journal text — only quantitative state.*\n\n`;
  md += `---\n\n`;

  md += `## Current rank\n\n`;
  md += `**Rank ${rk} of 9 — ${ri.pali}** (${ri.english})\n\n`;
  md += `Tier: ${ri.tier} · Reference: ${ri.suttaRef}\n\n`;
  if (p.liberated) md += `**Liberated:** ${new Date(p.liberated).toISOString().slice(0,10)} — the player has accepted the end-game ritual and the game is complete for them.\n\n`;
  md += `---\n\n`;

  md += `## Layer 1 — gate status\n\n`;
  md += `- Sustained days (current run): **${p.sustainedDays || 0}**\n`;
  md += `- Peak sustained days: **${p.maxSustainedDays || 0}**\n`;
  md += `- Layer 1 fully passed (90 days): **${p.stage1PassedAt ? 'yes (' + new Date(p.stage1PassedAt).toISOString().slice(0,10) + ')' : 'no'}**\n\n`;

  md += `## Practice statistics\n\n`;
  md += `- Sits ever: **${sitsTotal}**\n`;
  md += `- Sits in last 30 days: **${sits30}**\n`;
  md += `- Journal entries naming a hindrance, last 30 days: **${journal30}** *(count only — content not included)*\n`;
  md += `- Hindrance composite average, last 30 days: **${compAvg === null ? 'no data' : compAvg.toFixed(1) + ' / 10'}**\n\n`;

  md += `## Five hindrances (rolling 14-day average severity, 0–10)\n\n`;
  for (const h of FIVE_HINDRANCES) {
    const avg = hindranceRollingAverage(memberId, h.id, 14);
    const display = avg === null ? 'no data' : avg.toFixed(1);
    md += `- **${h.pali}** (${h.english}): ${display}\n`;
  }
  md += `\n`;

  md += `## Seven awakening factors\n\n`;
  for (const row of factorRows) {
    const f = row.factor;
    if (row.measurable) {
      md += `- **${f.pali}** (${f.english}): ${row.score === null ? 'no data' : row.score.toFixed(1) + ' / 10'}\n`;
    } else {
      md += `- **${f.pali}** (${f.english}): ${row.emerged ? 'emerging' : 'not yet visible'}\n`;
    }
  }
  md += `\n`;

  md += `## Layer 2 — Māra's ten armies\n\n`;
  const armies = p.armies || {};
  for (const a of MARA_ARMIES) {
    const entry = armies[a.id];
    if (entry && entry.consecutiveDays > 0) {
      md += `- **${a.name}** (${a.english}): ${entry.status}, ${entry.consecutiveDays} consecutive days\n`;
    } else {
      md += `- **${a.name}** (${a.english}): dormant\n`;
    }
  }
  md += `\n`;

  md += `---\n\n`;
  md += `*This export omits all reflection and journal text by design. To see what the player has been writing, ask them directly — that is for them and a teacher to share, not a tracker to hand over.*\n`;

  return md;
}

function exportPlayerStanding(memberId) {
  const mid = memberId || view.currentMember;
  if (!mid) { alert(t('alerts.no_member')); return; }
  const member = state.members.find(m => m.id === mid);
  const md = buildPlayerStandingMarkdown(mid);
  try {
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `player-standing-${(member?.name || 'member').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    alert('Export failed: ' + e.message);
  }
}

function findNextMemberNeedingEvening(excludeMemberId) {
  if (!state.members || state.members.length <= 1) return null;
  for (const m of state.members) {
    if (m.id === excludeMemberId) continue;
    if (!hasDailyDiagnosticToday(m.id)) return m;
  }
  return null;
}

function switchToNextMemberForEvening(memberId) {
  view.currentMember = memberId;
  saveState();
  // v15.15.2 — route to the merged Evening reflection flow. Other member's
  // evening surfaces now match the primary one (no more split personalities
  // between Today's tile, the 18:00 auto-fire, and this multi-member switch).
  openEveningClose();
  render();
}

function skipNextMemberEvening() {
  view.modal = null;
  renderModal();
  render();
}
