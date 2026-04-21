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
  //
  // v15.17.1 — one retry with 1.5s backoff on transient errors (mobile data
  // hiccup, Supabase 503, TLS renegotiation). A single retry covers the
  // dominant failure class without turning a real auth problem into a long
  // stall. Errors surface to bootstrap only after the retry also fails.
  if (typeof syncIsActive === 'function' && syncIsActive()) {
    let remote;
    try {
      remote = await passphrasePullState();
    } catch (firstErr) {
      const msg = String(firstErr && firstErr.message || firstErr).toLowerCase();
      const transient = msg.includes('fetch') || msg.includes('network')
        || msg.includes('503') || msg.includes('502') || msg.includes('timeout');
      if (!transient) throw firstErr;
      await new Promise(r => setTimeout(r, 1500));
      remote = await passphrasePullState();
    }
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
  // v15.19.11 — seed visualIntensity from the dedicated pre-auth key.
  // A user who picked a theme on the welcome page before signing in has
  // their choice in localStorage 'adze_theme'. When their first sign-in
  // hydrates an empty state from Supabase, that preference would be lost
  // unless we carry it forward here. Only seed when unset to avoid
  // overwriting a later Settings change that hasn't synced yet.
  if (typeof s.prefs.visualIntensity !== 'string') {
    try {
      const seeded = localStorage.getItem('adze_theme');
      if (seeded === 'classic' || seeded === 'calm') {
        s.prefs.visualIntensity = seeded;
      }
    } catch (_) { /* non-fatal */ }
  }
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
let _crossTabStaleWarning = null;

function saveState() {
  if (!state) return;
  // Authed-but-locked guard. Fleet Review Blocker #3 (sync-lifecycle trio,
  // item 2 of 3). When the user is signed in but hasn't entered the
  // passphrase yet, syncIsActive() is false — the push path below is already
  // skipped. But without this guard, localStorage would still accept the
  // mutation. Then authDoPassphraseUnlock pulls the (authoritative) remote
  // row, overwrites state, and the local-only edits vanish silently. The
  // invariant is: while locked, state is not ours to mutate.
  if (typeof authGetMode === 'function'
      && authGetMode() === 'authed'
      && typeof passphraseIsUnlocked === 'function'
      && !passphraseIsUnlocked()) {
    console.warn('[adze] saveState blocked: authed but locked');
    return;
  }
  // Another tab in this browser pushed to Supabase while we were running.
  // Our in-memory state is stale; pushing now would last-writer-wins over
  // the other tab's edit. Refuse further pushes until the user reloads.
  // (We still return early — no localStorage write either — because the
  // stale in-memory state would overwrite the other tab's localStorage copy
  // just as badly.)
  if (_crossTabStaleWarning) {
    console.warn('[adze] saveState blocked: another tab has newer data — reload');
    return;
  }
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

// v15.15.7 — cancel-and-flush the pending debounced push. Called from:
//   * pagehide / visibilitychange:hidden (best-effort — browsers give a
//     few hundred ms after these events; we kick the fetch without
//     awaiting and let the keepalive-ish machinery do its job).
//   * authSignOut (awaited — otherwise _supabase.auth.signOut() revokes
//     the JWT before the push has a chance to flush, silently losing any
//     edits made within the last 2s of the session).
// Closes the silent-data-loss vector senior-engineer flagged as Fleet
// Review Blocker #3 (sync-lifecycle trio, item 1 of 3).
function saveStateFlush() {
  if (_pushStateTimer) {
    clearTimeout(_pushStateTimer);
    _pushStateTimer = null;
  }
  if (!state) return Promise.resolve();
  if (typeof syncIsActive !== 'function' || !syncIsActive()) return Promise.resolve();
  // Refuse the flush if a sibling tab has already pushed newer data — our
  // state is stale, and flushing would last-writer-wins over their edit.
  // Matches the saveState guard above; same reasoning on sign-out and
  // pagehide paths.
  if (_crossTabStaleWarning) return Promise.resolve();
  return passphrasePushState(state)
    .then(() => { _lastSyncError = null; })
    .catch(e => {
      _lastSyncError = (e && e.message) ? e.message : String(e);
      console.error('Adze sync flush failed:', e);
    });
}

// Best-effort flush on tab close / backgrounding. pagehide is the most
// reliable unload signal across modern browsers; visibilitychange:hidden
// is the iOS Safari workaround (pagehide fires less reliably on iOS when
// the user switches apps rather than closing the tab). We fire without
// awaiting — the browser will honor the in-flight fetch as a keepalive
// best-effort; if the tab is killed mid-flight, we accept the ≤2s data
// loss window that existed before this fix (pre-flush).
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { saveStateFlush(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveStateFlush();
  });
}

function getLastSyncError() { return _lastSyncError; }

function getCrossTabStaleWarning() { return _crossTabStaleWarning; }

// Cross-tab concurrency guard. Fleet Review Blocker #3 (sync-lifecycle
// trio, item 3 of 3). Two tabs both authed + unlocked can race:
// each has its own in-memory state, each pushes on saveState debounce,
// the later push silently overwrites the earlier. Minimum viable fix
// per review: BroadcastChannel('adze'). Each successful push broadcasts
// {type:'pushed', tabId, at}. Other tabs flip _crossTabStaleWarning so
// their own further pushes refuse until reload. This is a sibling-tab
// detector only; cross-device races need the server-side updated_at
// guard that's still on the list.
//
// VISIBILITY CAVEAT (ux-reviewer 2026-04-19, logged v15.17.5):
// The stale-warning banner only renders inside Settings → Account &
// sync. A practitioner who gets the cross-tab event while on Today /
// Wisdom / Reflection will never see it until they navigate to
// Settings. Not release-blocking — the warning is a diagnostic aid,
// not a safety gate (save guards already prevent the overwrite) —
// but the right follow-up is a lightweight global toast/snackbar
// surface. Deferred to the next sprint; tracked here so it isn't
// forgotten.
if (typeof BroadcastChannel !== 'undefined') {
  try {
    const _bc = new BroadcastChannel('adze');
    _bc.addEventListener('message', (ev) => {
      const msg = ev && ev.data;
      if (!msg || msg.type !== 'pushed') return;
      if (typeof syncGetTabId === 'function' && msg.tabId === syncGetTabId()) return;
      // v15.17.4 — catalog-routed. Also dropped the wrong verb "editing"
      // (practitioners log, not edit) per copy-storyteller.
      _crossTabStaleWarning = (typeof t === 'function')
        ? t('sync.cross_tab_stale_warning')
        : 'Another tab updated your synced data. Reload this tab to continue.';
    });
  } catch (e) {
    // BroadcastChannel unsupported / blocked — fall through silently;
    // the cross-tab warning is best-effort anyway.
  }
}

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
