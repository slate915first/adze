// ============================================================================
// src/systems/preferences.js
// ----------------------------------------------------------------------------
// Extracted in Turn 31 from src/app.html systems layer.
// Contains 9 function(s): setTimerMode, setPointsVisible, dismissStagePreview, toggleHeaderTisikkha, toggleWisdomExpand, toggleSanghaExpand, toggleReviewCharts, engagePathArmy, releasePathArmyEngagement
// v15.19.4 — added setVisualIntensity() and a load-time IIFE that applies
// the saved theme to <html> before bootstrap renders. This module runs
// before state.js hydrates `state`, so the IIFE reads localStorage
// directly rather than going through getState(). Keeping the theme-apply
// here (instead of in bootstrap.js or main.js) preserves the rule that
// Stage-1 architecture files stay untouched for feature work.
// v15.19.11 — split theme source-of-truth. A dedicated localStorage key
// ('adze_theme') is the primary, written by both setVisualIntensity()
// (post-auth, from Settings) and setThemeBeforeAuth() (pre-auth, from
// the welcome footer chips). This decouples theme from the encrypted
// state blob — a new user who picks a theme on the welcome page does
// not lose it when Supabase hydration overwrites adze_v1 on first
// sign-in. Seeded into state.prefs by migrateState() in state.js so
// the Settings radio always reads accurately once authed.
// ============================================================================

const ADZE_THEME_KEY = 'adze_theme';

// Apply saved theme as early as possible in the script load order so the
// first paint of app body content already matches the chosen theme. This
// runs after <link rel="stylesheet" href="theme-calm.css"> has parsed,
// so the attribute set here immediately activates the override tokens.
(function applySavedThemeFromStorage() {
  try {
    // Primary source: dedicated theme key (survives Supabase hydration).
    let mode = localStorage.getItem(ADZE_THEME_KEY);

    // Legacy fallback: for users upgrading from v15.19.3–v15.19.10 who
    // only had the theme stored inside adze_v1.prefs.visualIntensity.
    // One-time migration into the dedicated key happens here so the
    // IIFE does not need to do this lookup on every subsequent load.
    if (!mode) {
      const raw = localStorage.getItem('adze_v1');
      if (raw) {
        const legacy = JSON.parse(raw)?.prefs?.visualIntensity;
        if (legacy === 'classic' || legacy === 'calm') {
          mode = legacy;
          try { localStorage.setItem(ADZE_THEME_KEY, mode); } catch (_) {}
        }
      }
    }

    if (mode === 'calm') {
      document.documentElement.setAttribute('data-theme', 'calm');
    }
    // 'classic' or absent: no attribute set; CSS falls back to base theme.
  } catch (_) {
    /* Corrupted or absent state — leave classic theme. A bad read here
       must never block the app from booting. */
  }
})();

// Pre-auth theme setter. Safe to call from the welcome page before
// state.js has hydrated (state may be null). Writes ONLY to the DOM and
// the dedicated localStorage key; never touches state.prefs or triggers
// a saveState() that could crash on null state. The seed into state is
// done by migrateState() once the user authenticates and state loads.
function setThemeBeforeAuth(mode) {
  if (!['classic', 'calm'].includes(mode)) return;
  if (mode === 'calm') {
    document.documentElement.setAttribute('data-theme', 'calm');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  try { localStorage.setItem(ADZE_THEME_KEY, mode); } catch (_) {}
  // Re-render so the chip selection updates. render() is defined in
  // main.js, loaded later than this file, so guard against parse-time
  // calls (none exist today, but future defensive). If state is null
  // the welcome render is still safe — renderWelcome reads no state.
  if (typeof render === 'function') render();
}

// Post-auth theme setter. Writes to BOTH state.prefs (encrypted, synced)
// and the dedicated localStorage key so pre-auth reads and the IIFE
// always see the current choice.
function setVisualIntensity(mode) {
  if (!['classic', 'calm'].includes(mode)) return;
  if (!state.prefs) state.prefs = {};
  state.prefs.visualIntensity = mode;
  if (mode === 'calm') {
    document.documentElement.setAttribute('data-theme', 'calm');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  try { localStorage.setItem(ADZE_THEME_KEY, mode); } catch (_) {}
  saveState();
  render();
}

function setTimerMode(mode) {
  if (!['ask', 'always', 'never'].includes(mode)) return;
  if (!state.prefs) state.prefs = {};
  state.prefs.timerMode = mode;
  saveState();
  render();
}

function setPointsVisible(visible) {
  if (!state.prefs) state.prefs = {};
  state.prefs.pointsVisible = !!visible;
  saveState();
  render();
}

function dismissStagePreview() {
  state.dismissedStagePreview = state.currentStage;
  saveState();
  render();
}

function toggleHeaderTisikkha() {
  view.headerTisikkhaExpanded = !view.headerTisikkhaExpanded;
  render();
}

function toggleWisdomExpand(key) {
  if (!view.wisdomExpand) {
    view.wisdomExpand = { guidance: true, foundations: false, struggle: false, library: false, codex: false };
  }
  view.wisdomExpand[key] = !view.wisdomExpand[key];
  render();
}

function toggleSanghaExpand() {
  view.sanghaExpand = !view.sanghaExpand;
  render();
}

function toggleReviewCharts() {
  view.reviewChartsExpand = !view.reviewChartsExpand;
  render();
}

function engagePathArmy(armyId) {
  if (!view.modal || view.modal.type !== 'path_viewer') return;
  const mid = view.modal.memberId;
  if (!mid) return;
  const ok = engageWithArmy(mid, armyId);
  if (ok) renderModal();
}

function releasePathArmyEngagement() {
  if (!view.modal || view.modal.type !== 'path_viewer') return;
  const mid = view.modal.memberId;
  if (!mid) return;
  releaseArmyEngagement(mid);
  renderModal();
}
