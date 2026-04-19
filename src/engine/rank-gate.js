// ============================================================================
// engine/rank-gate.js
// ----------------------------------------------------------------------------
// Rank computation, path-gate evaluation, and Shadow floor math.
//
// Extracted verbatim from adze_v14_2.html by scripts/extract_rankgate.js.
// Kept as a plain script (no ES module syntax) so the build step can inline
// it into the single-file HTML without transformation.
//
// Ambient dependencies (resolved from enclosing scope — globals in browser,
// global.X in Node tests):
//
//   state, view                      — app state + view state
//   PATH_RANKS, PATH_GATE,
//   TISIKKHA_THRESHOLDS_BY_RANK,
//   SHADOW_FLOOR_BY_RANK,
//   MARA_ARMIES                      — content (in sidecars)
//   ARMY_STATUS_THRESHOLDS           — content (still inline; read ambiently
//                                      for now; can be externalized later)
//   getOnboardingDiagnostic,
//   sitCountInWindow,
//   journalEvidenceCount,
//   hindranceCompositeAverage,
//   getTisikkha,
//   factorScore                      — helpers defined in app.html
//
// NOT in this file (stays in app.html):
//   renderShadowCurveSVG (SVG markup)
//   updateShadowVisual   (DOM style mutation)
//   maybeTriggerRankAnnouncement / acknowledgeRank* (view-modal code)
// ============================================================================

function ensurePathRecord(memberId) {
  if (!state.path) state.path = {};
  if (!state.path[memberId]) {
    state.path[memberId] = {
      layer: 1,                       // current active layer (1, 2, or 3)
      gate: {                         // Layer 1 gate status today
        hindranceAvgPass: false,
        sitsInWindowPass: false,
        journalEvidencePass: false,
        allThreePass: false,
        today: null                   // dateK of last evaluation
      },
      sustainedDays: 0,               // consecutive days all three legs passed
      maxSustainedDays: 0,            // v9.1: peak of sustainedDays (never resets)
      lastGateEvalDay: null,          // last dateK the gate was evaluated
      stage1PassedAt: null,           // ISO date when sustainedDays hit the target
      dominantHindrance: null,        // cached: 'sensual'|'illwill'|'sloth'|'restless'|'doubt'|null
      // v9.1: rank tracking
      lastSeenRank: 0,                // the rank the player was last shown
      pendingRankAnnouncement: null,  // {fromRank, toRank, at} — cleared after toast shown
      // v9.3: quiet feedback when sustainedDays ticks up by one.
      pendingSustainedAdvance: null,  // {toDay, at} — cleared after shown
      // v9.3: historical snapshots for trend charts. Appended once per day
      // by writePathGateEvaluation. Each entry is a lightweight snapshot of
      // the fields needed to render sparklines and rank trajectories.
      rankHistory: [],                // [{date, rank, sustainedDays, gatePass: bool, hindranceAvg, sits, journal}, ...]
      // v9.3: Layer 2 scaffolding — per-member persistent army state.
      // Each army starts as 'dormant' (not yet engaged). When Layer 1 gate
      // passes and the practitioner declares they are working with an army,
      // it moves to 'engaging' and weakens through sustained practice.
      // Status progression: dormant → engaging → weakening → quiet → dormant
      // The last transition back to dormant happens only when the army has
      // truly faded, which for most armies takes many months. This is
      // deliberately slow — the Buddha faced his armies under the Bodhi tree
      // for a reason.
      armies: {},                     // {armyId: {status, engagedSince, consecutiveDays, lastSeen}}
      activeArmyEngagement: null,     // armyId of the army the player is currently working with (at most one at a time)
      // v9.4: end-game liberation state
      liberationOffered: null,        // ISO date the liberation ritual was first offered
      liberated: null,                // ISO date the player accepted liberation; game ends
      liberationDeclined: null,       // ISO date the player declined (chose to keep practicing without further ranks)
      fetters: {},                    // {fetterKey: {status, noted}} — Layer 3 never auto-updates
      // v9.7: the three trainings — sīla, samādhi, paññā. Earned through
      // practice action; slowly decay if unused. Paññā is spendable currency
      // for opening suttas above one's current rank.
      // v10.0 canonical correction: only paññā has a lifetime total. Sīla
      // and samādhi are LIVED qualities — virtue not practiced erodes,
      // concentration not maintained dissipates. Only the wisdom underneath
      // (paññā) is unshakeable — the lifetime-total invariant.
      tisikkha: {
        sila: 0, samadhi: 0, panna: 0,
        pannaTotal: 0,
        lastDecayCheck: todayKey()
      }
    };
  } else {
    // Idempotent field fill-in for saves created under earlier v9 builds
    if (typeof state.path[memberId].maxSustainedDays !== 'number') state.path[memberId].maxSustainedDays = state.path[memberId].sustainedDays || 0;
    if (typeof state.path[memberId].lastSeenRank !== 'number') state.path[memberId].lastSeenRank = 0;
    if (!('pendingRankAnnouncement' in state.path[memberId])) state.path[memberId].pendingRankAnnouncement = null;
    if (!('pendingSustainedAdvance' in state.path[memberId])) state.path[memberId].pendingSustainedAdvance = null;
    if (!Array.isArray(state.path[memberId].rankHistory)) state.path[memberId].rankHistory = [];
    if (!state.path[memberId].armies || typeof state.path[memberId].armies !== 'object') state.path[memberId].armies = {};
    if (!('activeArmyEngagement' in state.path[memberId])) state.path[memberId].activeArmyEngagement = null;
    if (!('liberationOffered' in state.path[memberId])) state.path[memberId].liberationOffered = null;
    if (!('liberated' in state.path[memberId])) state.path[memberId].liberated = null;
    if (!('liberationDeclined' in state.path[memberId])) state.path[memberId].liberationDeclined = null;
    // v9.7: tisikkhā — the three trainings (sīla, samādhi, paññā). These
    // are accumulated over time from practice actions and slowly decay if
    // unused. Paññā is also a spendable currency for opening suttas above
    // one's current rank — the cost teaches that reaching beyond what one is
    // ready for has a real price.
    if (!state.path[memberId].tisikkha) {
      state.path[memberId].tisikkha = {
        sila: 0, samadhi: 0, panna: 0,
        pannaTotal: 0,  // v10.0: only paññā keeps a lifetime total
        lastDecayCheck: todayKey()
      };
    } else {
      // Idempotent fill-in for older saves
      const t = state.path[memberId].tisikkha;
      if (typeof t.sila !== 'number') t.sila = 0;
      if (typeof t.samadhi !== 'number') t.samadhi = 0;
      if (typeof t.panna !== 'number') t.panna = 0;
      if (typeof t.pannaTotal !== 'number') t.pannaTotal = t.panna;
      // v10.0: drop the canonically-incorrect lifetime totals for sīla and samādhi
      delete t.silaTotal;
      delete t.samadhiTotal;
      if (!t.lastDecayCheck) t.lastDecayCheck = todayKey();
    }
  }
  return state.path[memberId];
}

function evaluatePathGate(memberId) {
  const compAvg = hindranceCompositeAverage(memberId, PATH_GATE.ROLLING_WINDOW_DAYS);
  const sits = sitCountInWindow(memberId, PATH_GATE.ROLLING_WINDOW_DAYS);
  const journal = journalEvidenceCount(memberId, PATH_GATE.ROLLING_WINDOW_DAYS);
  const hindranceAvgPass = compAvg !== null && compAvg <= PATH_GATE.HINDRANCE_CEILING;
  const sitsInWindowPass = sits >= PATH_GATE.MIN_SITS_IN_WINDOW;
  const journalEvidencePass = journal >= PATH_GATE.MIN_JOURNAL_ENTRIES_NAMING;
  return {
    hindranceAvgPass,
    sitsInWindowPass,
    journalEvidencePass,
    allThreePass: hindranceAvgPass && sitsInWindowPass && journalEvidencePass,
    metrics: {
      hindranceComposite: compAvg,
      sitsInWindow: sits,
      journalEvidence: journal
    },
    today: todayKey()
  };
}

function writePathGateEvaluation(memberId) {
  const p = ensurePathRecord(memberId);
  const today = todayKey();
  const prior = p.lastGateEvalDay;
  const gate = evaluatePathGate(memberId);
  p.gate = gate;
  p.dominantHindrance = dominantHindranceForMember(memberId);

  // Sustained-days counter: only advance if (a) the gate passed today and
  // (b) the previous eval day was yesterday (or, if none, start at 1).
  // If the gate fails today, reset to 0. If eval is on the same day, no-op.
  if (prior !== today) {
    if (gate.allThreePass) {
      const priorSustained = p.sustainedDays || 0;
      if (prior === daysAgo(1)) {
        p.sustainedDays = (p.sustainedDays || 0) + 1;
      } else if (prior === null) {
        p.sustainedDays = 1;
      } else {
        // Gap in evaluation history. Conservative: reset to 1.
        p.sustainedDays = 1;
      }
      // v9.3: quiet feedback — only announce when the counter actually advanced
      if (p.sustainedDays > priorSustained) {
        p.pendingSustainedAdvance = { toDay: p.sustainedDays, at: new Date().toISOString() };
      }
      // Update peak
      if (p.sustainedDays > (p.maxSustainedDays || 0)) {
        p.maxSustainedDays = p.sustainedDays;
      }
    } else {
      p.sustainedDays = 0;
    }
    p.lastGateEvalDay = today;
  }

  // Stage 1 pass check
  if (p.sustainedDays >= PATH_GATE.SUSTAINED_DAYS_FOR_PASS && !p.stage1PassedAt) {
    p.stage1PassedAt = new Date().toISOString();
    if (p.layer < 2) p.layer = 2;
  }

  // v9.3: advance the currently-engaged Layer 2 army (if any). This only
  // does work when an engagement is active; otherwise it's a no-op.
  if (prior !== today) {
    advanceActiveArmyEngagement(memberId, gate.allThreePass);
  }

  // v9.3: append a daily snapshot to rankHistory for trend charts.
  // Only one entry per day — overwrites today's entry if it already exists
  // so trends reflect the latest same-day state.
  const newRank = computeMemberRank(memberId);
  const snapshot = {
    date: today,
    rank: newRank,
    sustainedDays: p.sustainedDays,
    gatePass: gate.allThreePass,
    hindranceAvg: gate.metrics.hindranceComposite,
    sits: gate.metrics.sitsInWindow,
    journal: gate.metrics.journalEvidence,
    sati: factorScore(memberId, 'sati'),
    viriya: factorScore(memberId, 'viriya'),
    samadhi: factorScore(memberId, 'samadhi')
  };
  const existingIdx = p.rankHistory.findIndex(s => s.date === today);
  if (existingIdx >= 0) p.rankHistory[existingIdx] = snapshot;
  else p.rankHistory.push(snapshot);
  // Keep history bounded — 365 days is enough for any trend view
  if (p.rankHistory.length > 365) p.rankHistory = p.rankHistory.slice(-365);

  // v9.1: rank advancement detection. Compute current rank, compare to
  // lastSeenRank, and flag for toast if changed upward.
  const oldRank = p.lastSeenRank || 0;
  if (newRank > oldRank) {
    p.pendingRankAnnouncement = { fromRank: oldRank, toRank: newRank, at: new Date().toISOString() };
    p.lastSeenRank = newRank;
    // v13.6 — Dirk feedback: "The shadow rise? I don't understand that part
    // at all." The first time any rank above zero is achieved, the system
    // would blast the full rank-announcement modal with Shadow-floor
    // teachings without any prior context. Flag a one-time introduction so
    // the practitioner first sees a gentler "what is a rank?" explainer.
    // After that, regular rank announcements run as before.
    if (!p.rankIntroSeen && newRank >= 1) {
      p.rankIntroPending = true;
    }
  }

  // v9.4: end-game liberation offer. When a member reaches rank 9 for the
  // first time, flag the liberation prompt. The prompt is an explicit ritual
  // — it ends the game. Only shown once, and only until the player either
  // accepts (liberating) or declines (continuing to sit without further
  // ranks). Does not fire if already liberated or already offered.
  if (newRank >= 9 && !p.liberationOffered && !p.liberated) {
    p.liberationOffered = new Date().toISOString();
  }

  saveState();
  return gate;
}

function computeMemberRank(memberId) {
  if (!getOnboardingDiagnostic(memberId)) return 0;

  const p = ensurePathRecord(memberId);
  const sitsEver = (state.sitRecords || []).filter(r => r.memberId === memberId).length;
  const sits30 = sitCountInWindow(memberId, 30);
  const journal30 = journalEvidenceCount(memberId, 30);
  const compAvg = hindranceCompositeAverage(memberId, 30);
  const maxSustained = p.maxSustainedDays || 0;
  // v9.9: tisikkhā gating helper — both telemetry AND currency must be met
  const t = getTisikkha(memberId);
  const meetsTisikkha = (rk) => {
    const th = getTisikkhaThresholds(rk);
    return t.sila >= th.sila && t.samadhi >= th.samadhi && t.panna >= th.panna;
  };

  let rank = 1; // onboarding done

  // Rank 2 (Sīla-visuddhi): 5+ sits ever — the ethical ground is being laid through action
  if (sitsEver >= 5 && meetsTisikkha(2)) rank = 2; else return rank;

  // Rank 3 (Citta-visuddhi): 15+ sits in last 30 days AND hindrance diagnostic data exists
  if (sits30 >= 15 && compAvg !== null && meetsTisikkha(3)) rank = 3; else return rank;

  // Rank 4 (Diṭṭhi-visuddhi): 20+ sits + 3+ journal entries naming hindrances
  if (sits30 >= 20 && journal30 >= 3 && meetsTisikkha(4)) rank = 4; else return rank;

  // Rank 5 (Anusārī): Layer 1 gate has passed at least once (maxSustained >= 1)
  if (maxSustained >= 1 && meetsTisikkha(5)) rank = 5; else return rank;

  // v9.4: Ariya ranks are GAME-achievable, with explicit "not real attainment"
  // framing baked into every card. The requirements below are genuine game
  // milestones tied to Layer 2 army engagement. Reaching rank 9 ends the game.

  // Rank 6 (Sotāpanna game rank): Layer 1 fully passed (90 days sustained)
  // AND at least one army has moved to weakening status (7+ consecutive days
  // of engagement).
  const armies = p.armies || {};
  const armiesAtWeakening = Object.values(armies).filter(a => a.status === 'weakening' || a.status === 'quiet').length;
  const armiesAtQuiet = Object.values(armies).filter(a => a.status === 'quiet').length;
  const measurableFactors = ['sati', 'dhammavicaya', 'viriya', 'samadhi'];
  const factorAllAtSeven = measurableFactors.every(fid => {
    const s = factorScore(memberId, fid);
    return s !== null && s >= 7;
  });

  if (p.stage1PassedAt && armiesAtWeakening >= 1 && meetsTisikkha(6)) rank = 6; else return rank;

  // Rank 7 (Sakadāgāmī game rank): 3+ armies at weakening or quiet
  if (armiesAtWeakening >= 3 && meetsTisikkha(7)) rank = 7; else return rank;

  // Rank 8 (Anāgāmī game rank): 5+ armies at weakening-or-quiet AND all
  // measurable awakening factors >= 7
  if (armiesAtWeakening >= 5 && factorAllAtSeven && meetsTisikkha(8)) rank = 8; else return rank;

  // Rank 9 (Arahant game rank — the game's endpoint): ALL 10 armies at quiet
  if (armiesAtQuiet >= MARA_ARMIES.length && meetsTisikkha(9)) rank = 9;

  return rank;
}

function getRankInfo(rankId) {
  return PATH_RANKS.find(r => r.id === rankId) || PATH_RANKS[0];
}

function getTisikkhaThresholds(targetRank) {
  const r = Math.max(0, Math.min(9, targetRank | 0));
  const t = TISIKKHA_THRESHOLDS_BY_RANK[r];
  return { sila: t[0], samadhi: t[1], panna: t[2] };
}

function getRankRequirements(memberId, targetRank) {
  if (!targetRank || targetRank <= 0) return [];

  const p = ensurePathRecord(memberId);
  const sitsEver = (state.sitRecords || []).filter(r => r.memberId === memberId).length;
  const sits30 = sitCountInWindow(memberId, 30);
  const journal30 = journalEvidenceCount(memberId, 30);
  const compAvg = hindranceCompositeAverage(memberId, 30);
  const maxSustained = p.maxSustainedDays || 0;
  const armies = p.armies || {};
  const armiesAtWeakening = Object.values(armies).filter(a => a.status === 'weakening' || a.status === 'quiet').length;
  const armiesAtQuiet = Object.values(armies).filter(a => a.status === 'quiet').length;

  const rows = [];
  if (targetRank === 1) {
    rows.push({ label: 'Complete the onboarding diagnostic', pass: !!getOnboardingDiagnostic(memberId), detail: '' });
  } else if (targetRank === 2) {
    rows.push({ label: '5 or more sits logged', pass: sitsEver >= 5, detail: `${sitsEver} / 5` });
  } else if (targetRank === 3) {
    rows.push({ label: '15 or more sits in the last 30 days', pass: sits30 >= 15, detail: `${sits30} / 15` });
    rows.push({ label: 'Some hindrance diagnostic data on record', pass: compAvg !== null, detail: compAvg !== null ? 'present' : 'none yet' });
  } else if (targetRank === 4) {
    rows.push({ label: '20 or more sits in the last 30 days', pass: sits30 >= 20, detail: `${sits30} / 20` });
    rows.push({ label: '3 or more journal entries naming a hindrance', pass: journal30 >= 3, detail: `${journal30} / 3` });
  } else if (targetRank === 5) {
    rows.push({ label: 'The three-legged gate has passed on at least one day', pass: maxSustained >= 1, detail: `peak sustained: ${maxSustained} days` });
  } else if (targetRank === 6) {
    rows.push({ label: 'Layer 1 gate sustained for the full 90 days', pass: !!p.stage1PassedAt, detail: `sustained: ${p.sustainedDays || 0}, peak: ${maxSustained}, target: 90` });
    rows.push({ label: 'At least 1 army engaged to weakening status (7+ consecutive days)', pass: armiesAtWeakening >= 1, detail: `${armiesAtWeakening} / 1` });
  } else if (targetRank === 7) {
    rows.push({ label: '3 or more armies at weakening or quiet status', pass: armiesAtWeakening >= 3, detail: `${armiesAtWeakening} / 3` });
  } else if (targetRank === 8) {
    rows.push({ label: '5 or more armies at weakening or quiet status', pass: armiesAtWeakening >= 5, detail: `${armiesAtWeakening} / 5` });
    const measurableFactors = ['sati', 'dhammavicaya', 'viriya', 'samadhi'];
    const allAtSeven = measurableFactors.every(fid => {
      const s = factorScore(memberId, fid);
      return s !== null && s >= 7;
    });
    const weakest = measurableFactors.reduce((min, fid) => {
      const s = factorScore(memberId, fid);
      return s !== null && (min === null || s < min) ? s : min;
    }, null);
    rows.push({ label: 'All four measurable awakening factors at 7 or higher', pass: allAtSeven, detail: `weakest: ${weakest === null ? '—' : weakest.toFixed(1)} / 7.0` });
  } else if (targetRank === 9) {
    rows.push({ label: 'All 10 armies reached quiet status (30+ consecutive days each)', pass: armiesAtQuiet >= MARA_ARMIES.length, detail: `${armiesAtQuiet} / 10` });
  }

  // v9.9: append tisikkhā currency thresholds — both telemetric AND currency
  // requirements must be met. Currency reflects sustained accumulation.
  // Skip for ranks 0 and 1 which have zero thresholds anyway.
  if (targetRank >= 2) {
    const thresh = getTisikkhaThresholds(targetRank);
    const t = getTisikkha(memberId);
    if (thresh.sila > 0) {
      rows.push({ label: `Sīla accumulation ≥ ${thresh.sila}`, pass: t.sila >= thresh.sila, detail: `${t.sila} / ${thresh.sila}` });
    }
    if (thresh.samadhi > 0) {
      rows.push({ label: `Samādhi accumulation ≥ ${thresh.samadhi}`, pass: t.samadhi >= thresh.samadhi, detail: `${t.samadhi} / ${thresh.samadhi}` });
    }
    if (thresh.panna > 0) {
      rows.push({ label: `Paññā accumulation ≥ ${thresh.panna}`, pass: t.panna >= thresh.panna, detail: `${t.panna} / ${thresh.panna}` });
    }
  }

  return rows;
}

function getNextRankRequirements(memberId) {
  const currentRank = computeMemberRank(memberId);
  if (currentRank >= 9) return null; // game endpoint reached
  const nextRank = currentRank + 1;
  const nextInfo = getRankInfo(nextRank);
  return { nextInfo, rows: getRankRequirements(memberId, nextRank) };
}

function getPathSummary(memberId) {
  const p = ensurePathRecord(memberId);
  const gateNow = evaluatePathGate(memberId);
  const rank = computeMemberRank(memberId);
  const nextReqs = getNextRankRequirements(memberId);
  return {
    layer: p.layer,
    sustainedDays: p.sustainedDays || 0,
    maxSustainedDays: p.maxSustainedDays || 0,
    targetDays: PATH_GATE.SUSTAINED_DAYS_FOR_PASS,
    stage1PassedAt: p.stage1PassedAt,
    gate: gateNow,
    dominantHindrance: dominantHindranceForMember(memberId),
    thresholds: { ...PATH_GATE },
    // v9.1 rank info
    rank,
    rankInfo: getRankInfo(rank),
    nextRankRequirements: nextReqs
  };
}

function shadowFloorForRank(rank) {
  const r = Math.max(0, Math.min(9, rank | 0));
  return SHADOW_FLOOR_BY_RANK[r];
}

function shadowFloorForCurrentMember() {
  if (!view.currentMember) return 0;
  const rk = computeMemberRank(view.currentMember);
  return shadowFloorForRank(rk);
}

function shadowFloorForTeam() {
  if (!state.members || state.members.length === 0) return 0;
  let sum = 0;
  for (const m of state.members) {
    sum += shadowFloorForRank(computeMemberRank(m.id));
  }
  return Math.round(sum / state.members.length);
}

function recalculateShadow() {
  if (!state.questActive) { state.shadow = 0; return; }
  let shadow = 0;
  const start = new Date(state.questStartDate);
  const today = new Date();

  // Walk through every day from quest start to today
  for (let d = new Date(start); d <= today; d.setDate(d.getDate()+1)) {
    const dk = d.toISOString().slice(0,10);
    // v10.1: skip paused windows — Shadow does not climb on retreat days
    if (isDateInPausedWindow(dk)) continue;
    const teamMax = teamMaxDayScore();
    if (teamMax === 0) continue;
    // v8: skipMultiplier prevents circular read of state.shadow
    const teamSc = teamDayScore(dk, { skipMultiplier: true });
    const pct = teamSc / teamMax;

    // Check key habits for everyone
    let keyHabitsMissed = 0;
    let keyHabitsTotal = 0;
    for (const m of state.members) {
      for (const kh of getKeyHabits(m.id)) {
        keyHabitsTotal++;
        const log = (state.log[dk] && state.log[dk][m.id]) || {};
        if (log[kh.id] !== true) {
          // v5: Sāriputta's gift — if this specific (member, habit, day)
          // miss was forgiven via the weeklyMissForgiveness ability, skip
          // counting it as missed for shadow purposes. The day's pct
          // calculation uses the underlying log, not this counter, so the
          // forgiveness affects the keyHabit gate but not the team pct —
          // which is the right balance: it saves the streak/shadow gate
          // but doesn't fake points the player didn't earn.
          if (!isHabitMissForgiven(m.id, kh.id, dk)) {
            keyHabitsMissed++;
          }
        }
      }
    }
    const allKeyDone = keyHabitsMissed === 0 && keyHabitsTotal > 0;

    // STRICT scoring per the user's choice:
    if (allKeyDone && pct >= 0.7) shadow -= 2;       // strong day, light gains
    else if (allKeyDone && pct >= 0.4) shadow -= 1;  // ok day
    else if (pct >= 0.4 && keyHabitsMissed <= 1) shadow += 0; // neutral
    else if (keyHabitsMissed >= 1 && pct < 0.4) shadow += 4; // bad day - real growth
    else if (keyHabitsMissed > keyHabitsTotal/2) shadow += 5; // very bad
    else shadow += 1;

    // Clamp shadow to 0-100
    shadow = Math.max(0, Math.min(100, shadow));
  }

  // Apply ability modifiers via the hook registry (v4_2 refactor).
  // Previously this was a hardcoded `if mahakassapa: shadow -= 3` loop.
  // Now any character whose passive declares a `shadowAdjust` hook
  // contributes — Kassapa returns -3, future abilities can return any value.
  shadow += sumPassiveHook('shadowAdjust');
  shadow = Math.max(0, shadow);

  // v9.8: clamp to the team floor (canonical Māra-attention level by rank).
  // Shadow can never drop below the floor — Māra is always present.
  const floor = shadowFloorForTeam();
  state.shadow = Math.max(floor, Math.min(100, shadow));
  saveState();
  updateShadowVisual();
}

function advanceActiveArmyEngagement(memberId, gatePassed) {
  const p = ensurePathRecord(memberId);
  const armyId = p.activeArmyEngagement;
  if (!armyId) return;
  const entry = p.armies[armyId];
  if (!entry) return;
  const today = todayKey();
  if (entry.lastSeen === today) return; // already advanced today
  if (gatePassed) {
    entry.consecutiveDays = (entry.consecutiveDays || 0) + 1;
    // Status transitions based on sustained days
    if (entry.consecutiveDays >= ARMY_STATUS_THRESHOLDS.QUIET_DAYS) {
      entry.status = 'quiet';
    } else if (entry.consecutiveDays >= ARMY_STATUS_THRESHOLDS.WEAKENING_DAYS) {
      entry.status = 'weakening';
    } else {
      entry.status = 'engaging';
    }
  }
  entry.lastSeen = today;
}

// CommonJS export for Node-side tests. Harmless in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ensurePathRecord,
    evaluatePathGate,
    writePathGateEvaluation,
    computeMemberRank,
    getRankInfo,
    getTisikkhaThresholds,
    getRankRequirements,
    getNextRankRequirements,
    getPathSummary,
    shadowFloorForRank,
    shadowFloorForCurrentMember,
    shadowFloorForTeam,
    recalculateShadow,
    advanceActiveArmyEngagement,
  };
}
