// ============================================================================
// src/bootstrap.js
// ----------------------------------------------------------------------------
// The app's entry point. Loaded LAST in index.html, after every engine,
// config, loader, system, render, modal, and main.js file. By the time this
// script runs, every function the app needs is defined — but nothing has
// been called yet. Bootstrap fires things off in the right order:
//
//   1. await loadAllData()        — fetches all content/*.json + sutta .md
//   2. derive data-dependent globals (PATH_RANKS, SETUP_DIAGNOSTIC_*, …)
//   3. initialize runtime state (state, view) using loadState() + defaults
//   4. render the first frame
//   5. schedule the deferred onboarding-resume + setback-recovery timers
//
// Any exception inside boot() surfaces a visible error in the app root so
// broken deploys don't just show a blank page.
// ============================================================================

// ---------------------------------------------------------------------------
// Data-derived constants — declared at top-level (accessible from every
// module via the shared global script scope) but not assigned until after
// loadAllData() resolves.
// ---------------------------------------------------------------------------
let PATH_RANKS;
let SHADOW_FLOOR_BY_RANK;
let SETUP_DIAGNOSTIC_A;
let SETUP_DIAGNOSTIC_B_BEGINNER;
let SETUP_DIAGNOSTIC_B_EXPERIENCED;
let SETUP_DIAGNOSTIC_C;

// ---------------------------------------------------------------------------
// Runtime state — reassigned by boot() after loadState() resolves.
// ---------------------------------------------------------------------------
let state = null;
let view  = { tab: 'today', currentMember: null, modal: null, setupStep: 0, setupData: {} };

// ---------------------------------------------------------------------------
// Boot sequence
// ---------------------------------------------------------------------------
async function boot() {
  // 1. Fetch all content files in parallel. loadAllData is defined in
  //    data/loaders.js, which has already executed by the time boot runs.
  await loadAllData();

  // 2. Derive data-dependent constants. These were inline `const` statements
  //    in the old app.html between data/loaders.js and engine/diagnostic.js.
  PATH_RANKS                   = __PATH_RANKS_DATA.pathRanks;
  SHADOW_FLOOR_BY_RANK         = __PATH_RANKS_DATA.shadowFloorByRank;
  SETUP_DIAGNOSTIC_A           = __ASSESSMENT.phaseA;
  SETUP_DIAGNOSTIC_B_BEGINNER  = __ASSESSMENT.phaseB_beginner;
  SETUP_DIAGNOSTIC_B_EXPERIENCED = __ASSESSMENT.phaseB_experienced;
  SETUP_DIAGNOSTIC_C           = __ASSESSMENT.phaseC;

  // 3. Stage 2: initialize auth before state. authInit rehydrates any existing
  //    Supabase session (so reloading a signed-in tab stays signed in), but it
  //    does NOT rehydrate the encryption passphrase — that lives only in
  //    memory and the user must re-enter it to sync. Until they do, syncIsActive()
  //    returns false and state loads from localStorage as if anonymous. The
  //    Settings card prompts them to unlock when they're ready.
  await authInit();

  // 4. Initialize state. loadState() is async in Stage 2; in synced mode
  //    (authed AND unlocked) it reads from Supabase; otherwise it falls back
  //    to localStorage. Returns null for fresh users.
  state = await loadState();

  // 4a. If we landed on /?invite_token=...&type=invite|recovery, the URL
  //     itself is "I have a token, but the human hasn't tapped yet." Open
  //     the invite-landing modal — its CTA calls verifyOtp client-side,
  //     so the token is only consumed when the human acts (immune to
  //     gmail / proxy prefetches).
  // 4b. If a session rehydrated and the user is already past the set-
  //     password step (invite verified earlier), show the set-initial-
  //     password modal so they can finish.
  // 4c. Otherwise, if signed in but locked, prompt for the encryption
  //     passphrase.
  if (typeof authHasPendingInviteToken === 'function' && authHasPendingInviteToken()) {
    const pending = authHasPendingInviteToken();
    view.modal = { type: 'auth', step: 'invite-landing', busy: false, error: null, tokenType: pending.type };
  } else if (typeof authHasPendingPasswordSet === 'function' && authHasPendingPasswordSet()) {
    view.modal = { type: 'auth', step: 'set-initial-password', busy: false, error: null, consent: false, reset: false };
  } else if (typeof authGetMode === 'function' && authGetMode() === 'authed'
      && !(typeof passphraseIsUnlocked === 'function' && passphraseIsUnlocked())
      && (!state || !state.setupComplete)) {
    // v15.11.1 — Route by whether a remote ciphertext row exists:
    //   - Row exists → returning user on a new device/clean browser:
    //     passphrase-unlock (they have data to decrypt).
    //   - No row → brand-new user who just signed in for the first time:
    //     passphrase-setup (they're creating, not unlocking).
    // Previously we always opened unlock, which showed "no encrypted data
    // on server" errors to fresh users who hadn't set up a passphrase yet.
    let hasRemoteRow = false;
    try {
      if (typeof passphraseRemoteExists === 'function') {
        hasRemoteRow = await passphraseRemoteExists();
      }
    } catch (e) {
      console.warn('Adze passphrase-remote-exists check skipped:', e);
    }
    view.modal = {
      type: 'auth',
      step: hasRemoteRow ? 'passphrase-unlock' : 'passphrase-setup',
      busy: false, error: null, consent: false, reset: false
    };
  }

  // 5. First-frame setup. Mirrors the INIT block that used to live at the
  //    bottom of main.js.
  if (state && state.setupComplete) {
    view.currentMember = state.members[0]?.id;
    recalculateShadow();
  }
  render();

  // 5a. v15.18.1 — resume interrupted setup. If the user was mid-setup when
  //     the tab was killed / battery died / re-auth bounced them, localStorage
  //     holds their progress. Reopen the setup modal at the saved step so
  //     they pick up exactly where they left off rather than being dumped
  //     onto the welcome page (which looks like a logout and used to lead
  //     them to re-auth → startSetup → wipe). Gate on "no modal yet" so we
  //     don't override auth gates (invite-landing, passphrase-unlock, etc.)
  //     that boot steps 4a–4c have already queued.
  if (!view.modal
      && (!state || !state.setupComplete)
      && typeof setupProgressExists === 'function'
      && setupProgressExists()
      && typeof startSetup === 'function') {
    startSetup();
  }

  // 5. Session 2: if a prior onboarding diagnostic was interrupted, resume it.
  if (state && state.setupComplete && state.pendingOnboardingDiagnostic >= 0
      && state.pendingOnboardingDiagnostic < (state.members?.length || 0)) {
    setTimeout(() => openNextOnboardingDiagnostic(), 400);
  }

  // 6. Session 5 (v7): if a key habit's streak just broke, gently surface
  //    the lute-strings teaching with a recommit-smaller option. Fires once
  //    per setback (tracked in state.lastSetbackShown). Gated on
  //    no-pending-onboarding to avoid racing the onboarding chain; the
  //    double-check inside the timeout catches any remaining races.
  if (state && state.setupComplete && state.questActive && !view.modal
      && (state.pendingOnboardingDiagnostic == null || state.pendingOnboardingDiagnostic < 0)) {
    setTimeout(() => {
      if (view.modal) return;
      if (state.pendingOnboardingDiagnostic >= 0) return; // belt + suspenders
      const sb = detectFreshSetback();
      if (sb) showSetbackRecovery(sb);
    }, 1500);
  }
}

// ---------------------------------------------------------------------------
// Kick off the boot. Any error bubbles up to a visible message rather than
// silent failure.
// ---------------------------------------------------------------------------
boot().catch(err => {
  console.error('Adze boot failed:', err);
  const app = document.getElementById('app');
  if (app) {
    const esc = s => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
    const message = err && err.message ? err.message : String(err);
    const stack   = err && err.stack   ? err.stack   : '';
    app.innerHTML =
      '<div style="padding:2rem;color:#fca5a5;font-family:ui-monospace,monospace;line-height:1.6">' +
        '<h1 style="font-size:1.25rem;margin-bottom:0.5rem;color:#fecaca">Adze failed to start</h1>' +
        '<div style="background:#1f1010;border:1px solid #7f1d1d;padding:0.75rem 1rem;border-radius:6px;margin-bottom:1rem;color:#fecaca;font-weight:600">' +
          esc(message) +
        '</div>' +
        (stack
          ? '<details style="opacity:0.75"><summary style="cursor:pointer;font-size:0.85rem">stack trace</summary>' +
            '<div style="white-space:pre-wrap;font-size:0.8rem;margin-top:0.5rem">' + esc(stack) + '</div></details>'
          : '') +
        '<div style="margin-top:1rem;opacity:0.6;font-size:0.85rem">' +
          'If you opened this file via file://, try a local server: <code>python3 -m http.server</code> in the src/ directory, then visit http://localhost:8000' +
        '</div>' +
      '</div>';
  }
});

// ---------------------------------------------------------------------------
// v15.4 — Service Worker registration. Makes Adze installable + offline-
// capable. Skipped when the page is loaded via file:// (registration would
// throw) and when running on localhost without HTTPS in some browsers.
// Registration failure is non-fatal: the app still works, just without
// offline / install affordances.
// ---------------------------------------------------------------------------
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Adze service worker registration failed:', err && err.message);
    });
  });
}
