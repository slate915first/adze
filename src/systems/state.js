// ============================================================================
// src/systems/state.js
// ----------------------------------------------------------------------------
// Extracted in Turn 30 from src/app.html systems layer.
// Contains 4 function(s): loadState, migrateState, saveState, newState
// All functions are hoisted — build inlines this file before renderers and
// modals so they're in scope everywhere.
// ============================================================================

async function loadState() {
  // Synced mode (authed AND passphrase unlocked): pull encrypted ciphertext
  // from Supabase. On failure do NOT silently fall back to localStorage — the
  // E2E promise forbids it. Throw so bootstrap's error UI surfaces the problem.
  if (typeof syncIsActive === 'function' && syncIsActive()) {
    const remote = await passphrasePullState();
    if (remote) return migrateState(remote);
    return null;
  }
  // Anonymous mode: unchanged localStorage behavior.
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return migrateState(JSON.parse(raw));
  } catch(e) {}
  // Migration: if a previous-version save exists, import it once.
  for (const legacy of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(legacy);
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = migrateState(parsed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    } catch(e) {}
  }
  return null;
}

function migrateState(s) {
  if (!s) return s;
  if (!s.diagnostics) {
    s.diagnostics = { onboarding: {}, daily: {}, weekly: [], monthly: [] };
  } else {
    if (!s.diagnostics.onboarding) s.diagnostics.onboarding = {};
    if (!s.diagnostics.daily) s.diagnostics.daily = {};
    if (!s.diagnostics.weekly) s.diagnostics.weekly = [];
    if (!s.diagnostics.monthly) s.diagnostics.monthly = [];
  }
  if (typeof s.tutorialOpened !== 'boolean') s.tutorialOpened = false;
  if (typeof s.pendingOnboardingDiagnostic !== 'number') s.pendingOnboardingDiagnostic = -1;
  // v6: weekly summary tracking
  if (typeof s.lastWeeklySummaryViewed === 'undefined') s.lastWeeklySummaryViewed = null;
  // v7: timer + setback + foundations
  if (!Array.isArray(s.sitRecords)) s.sitRecords = [];
  if (typeof s.lastSetbackShown === 'undefined') s.lastSetbackShown = null;
  if (typeof s.seenFoundations !== 'boolean') s.seenFoundations = false;
  // v8.1: preferences
  if (!s.prefs) s.prefs = {};
  if (typeof s.prefs.timerMode !== 'string') s.prefs.timerMode = 'ask';
  // v13.4 — one-time reset: previous versions let users lock themselves into
  // 'never' via a "Never ask" shortcut in the timer prompt. That shortcut was
  // a footgun — users later wondered why tapping the morning sit marked it
  // done without asking. Reset 'never' back to 'ask' exactly once so the
  // prompt flow is reachable again. Users can still choose 'Always use the
  // timer' in the prompt (explicit intent) or set the mode in Settings.
  if (!s._migratedTimerModeReset && s.prefs.timerMode === 'never') {
    s.prefs.timerMode = 'ask';
  }
  s._migratedTimerModeReset = true;
  // v13.6 — SECOND one-time reset, keyed on a new flag. The v13.4 reset ran
  // once and then set _migratedTimerModeReset = true; but users who later
  // clicked "Always skip" again (in a post-v13.4 session) got stuck in
  // 'never' mode and the old migration no longer fires. Dirk feedback: "I
  // asked twice for a menu, you forgot." The likely cause is exactly this.
  // This reset honors the gentler rule: if the user previously chose 'never',
  // restore 'ask' one more time in v13.6. After this, the habit row will
  // prompt the timer flow again; the user can re-choose 'always' or 'never'
  // explicitly in Settings if they want.
  if (!s._v136TimerModeReset && s.prefs.timerMode === 'never') {
    s.prefs.timerMode = 'ask';
  }
  s._v136TimerModeReset = true;

  // v15.0 — beta-guide modal seen flag
  if (typeof s.seenBetaGuide !== 'boolean') s.seenBetaGuide = false;

  // v9: per-member path tracking
  if (!s.path || typeof s.path !== 'object') s.path = {};

  // v15.14 — savedQuotes default + one-time hydration migration.
  // Old shape (lazy-init, positional): { [mid]: [{ index, savedAt }, ...] }
  // New shape (deliberate, stable):    { [mid]: [{ id, text, source, savedAt }, ...] }
  // Embedding text+source means the saved entry survives if a quote is later
  // renamed, reordered, or removed from teaching-quotes.json.
  if (!s.savedQuotes || typeof s.savedQuotes !== 'object') s.savedQuotes = {};
  if (!s._v15140SavedQuotesHydrated) {
    if (typeof TEACHING_QUOTES !== 'undefined' && Array.isArray(TEACHING_QUOTES)) {
      for (const mid of Object.keys(s.savedQuotes)) {
        const arr = s.savedQuotes[mid];
        if (!Array.isArray(arr)) { s.savedQuotes[mid] = []; continue; }
        s.savedQuotes[mid] = arr.map(entry => {
          if (!entry || typeof entry !== 'object') return null;
          if (entry.id && entry.text && entry.source) return entry; // already migrated
          // Legacy entry: { index, savedAt }. Resolve via TEACHING_QUOTES.
          const q = (typeof entry.index === 'number') ? TEACHING_QUOTES[entry.index] : null;
          if (!q || !q.id) return null; // legacy entry that no longer resolves; drop
          return { id: q.id, text: q.text, source: q.source, savedAt: entry.savedAt || todayKey() };
        }).filter(Boolean);
      }
      s._v15140SavedQuotesHydrated = true;
    }
    // If TEACHING_QUOTES isn't loaded yet (shouldn't happen — bootstrap awaits
    // loadAllData first), leave the flag unset so hydration runs next load.
  }

  // v9: per-member reflection log refactor — BREAKING, one-way.
  // Legacy shape:  state.reflectionLog[dateK] = { daily, weekly, monthly }
  // New shape:     state.reflectionLog[dateK][memberId] = { daily, weekly, monthly }
  // Migration attributes orphan entries to the first member and flags them.
  if (s.reflectionLog && typeof s.reflectionLog === 'object' && !s._v9ReflectionMigrated) {
    const firstMemberId = (Array.isArray(s.members) && s.members[0]) ? s.members[0].id : null;
    const migrated = {};
    for (const dk of Object.keys(s.reflectionLog)) {
      const entry = s.reflectionLog[dk];
      if (!entry || typeof entry !== 'object') { migrated[dk] = {}; continue; }
      // Heuristic: if the entry has a top-level daily/weekly/monthly key with
      // the expected shape, it is legacy. Per-member entries will have keys
      // that look like member IDs (not 'daily'/'weekly'/'monthly').
      const hasLegacy = ('daily' in entry) || ('weekly' in entry) || ('monthly' in entry);
      if (hasLegacy && firstMemberId) {
        migrated[dk] = {};
        migrated[dk][firstMemberId] = {
          daily: entry.daily,
          weekly: entry.weekly,
          monthly: entry.monthly,
          _migratedFromLegacy: true
        };
      } else {
        migrated[dk] = entry;
      }
    }
    s.reflectionLog = migrated;
    s._v9ReflectionMigrated = true;
  }

  return s;
}

let _pushStateTimer = null;
let _lastSyncError = null;

function saveState() {
  if (!state) return;
  // localStorage is written in both modes so fast-reload always has something
  // to read synchronously. In synced mode it's a cache of the last plaintext
  // the user saw on this device; the authoritative copy is the ciphertext row.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (typeof syncIsActive === 'function' && syncIsActive()) {
    // Debounce server pushes so every tap doesn't fire a network call.
    if (_pushStateTimer) clearTimeout(_pushStateTimer);
    _pushStateTimer = setTimeout(async () => {
      _pushStateTimer = null;
      try {
        await passphrasePushState(state);
        _lastSyncError = null;
      } catch (e) {
        _lastSyncError = (e && e.message) ? e.message : String(e);
        console.error('Adze sync push failed:', e);
      }
    }, 2000);
  }
}

function getLastSyncError() { return _lastSyncError; }

function newState() {
  return {
    setupComplete: false,
    questActive: false,
    questMode: null,           // 'story' or 'custom'
    questCategory: null,
    questId: null,
    questName: '',
    questStartDate: null,
    questDuration: 90,
    difficultyPath: null,       // 'sotapatti' | 'sakadagami' | 'anagami' | 'custom'
    durationMode: 'steady',     // 'steady' | 'progressive' | 'mixed'
    currentMinutes: 5,          // current meditation duration
    mixedSchedule: {},          // { mon: 5, tue: 5, ..., sun: 30 }
    progressiveStreak: 0,       // for progressive mode tracking
    pendingMinuteBump: null,    // {newMinutes, offered: dateK}
    members: [],
    habits: [],
    log: {},
    currentStage: 0,
    stageStartDate: null,
    keyHabitDaysAtStage: 0,
    defeatedArmies: [],
    activeArmyChallenge: null,
    armyChallengeProgress: {},
    shadow: 0,
    wisdomCollected: [],
    persistentXP: {},
    questAttempts: 0,
    abilityUses: {},
    seenPrologueScroll: false,
    // Reflection system
    reflectionLog: {},          // {dateK: {daily: {q, answer}, weeklyDone: weekNum, monthlyDone: monthNum}}
    reflectionStartDate: null,  // when reflections began (= quest start usually)
    completedDailies: 0,
    completedWeeklies: [],      // [weekNum, ...]
    completedMonthlies: [],     // [monthNum, ...]
    dailyQuestionIndex: 0,      // rotates through pool
    // Diagnostic system (Session 2)
    diagnostics: {
      onboarding: {},           // {memberId: {answers:{}, completedAt}}
      daily: {},                // {dateK: {memberId: {qId: 0-10, ...}}}
      weekly: [],               // [{week, memberId, answers, writing, date}]
      monthly: []               // [{month, memberId, answers, writings, date}]
    },
    tutorialOpened: false,
    pendingOnboardingDiagnostic: -1, // index of member currently doing onboarding (after vow)
    lastWeeklySummaryViewed: null,   // v6: dateK of last weekly summary view
    sitRecords: [],                  // v7: timed-sit history with pre/post chips
    lastSetbackShown: null,          // v7: 'memberId:habitId:dateK' of last shown setback
    seenFoundations: false,          // v7: has the user opened the Foundations view at least once
    prefs: {                         // v8.1: user preferences
      timerMode: 'ask',              // 'ask' | 'always' | 'never'
    },
    // v9: per-member path tracking — the three-layer structure
    path: {}                         // {memberId: {layer, gate, sustainedDays, lastGateEvalDay, ...}}
  };
}
