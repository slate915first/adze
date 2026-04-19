// ============================================================================
// render/settings.js
// ----------------------------------------------------------------------------
// The Settings tab — ⚙️ in the primary nav. Also contains the Settings-scoped
// data-management helpers (export / import / abandon / reset) that have no
// other callers in the app.
//
// The Settings screen is structured as a vertical stack of parchment cards,
// in deliberate visual-priority order:
//
//   1. Quest overview       mode / current quest / members / habits / attempts
//   2. Habit config         link to the habit-manager tab
//   3. Bell sound           5 variants, each with preview button
//                           (current bells are synthesized via Web Audio;
//                            assets/sounds/ replacement is a later turn)
//   4. Meditation timer     ask / always / never
//   5. Points display       show / hide (contemplative mode — this setting
//                           addresses the subtle scoreboarding failure mode
//                           where visible points invite nikanti)
//   6. Beta feedback        4 kinds — bug / idea / help / praise
//   7. Privacy              reassurance: all data local, no server, no
//                           account system
//   8. Backup & Share       export / import (JSON file)
//   9. Danger Zone          abandon quest (keeps persistent XP + wisdom);
//                           reset everything (destructive)
//
// Functions:
//
//   renderSettings()   The tab body. Composed of the 9 cards above.
//                      Reads prefs from state.prefs.{timerMode,
//                      bellSound, pointsVisible} and settings counters
//                      from state (feedbackLog length, etc.).
//
//   exportData()       Serialize state to JSON, trigger download with
//                      filename habit-quest-3-{today}.json.
//
//   importData()       Open a file picker, parse JSON, replace state,
//                      reload to member[0]. Has no schema validation
//                      (yet) — users who import garbage get garbage.
//
//   abandonQuest()     Set questActive=false, mode='custom', go to
//                      Today tab. Persistent XP + wisdom kept (this is
//                      the core contract — no effort on the path is lost).
//
//   resetAll()         Destructive: wipe localStorage, reload. Used when
//                      you want to start from actual scratch — typically
//                      for beta testers re-running the onboarding flow.
//
// Dependencies (all read from global scope):
//   State:     state (prefs, questMode, questActive, questName, members,
//                     habits, questAttempts, feedbackLog)
//   Engine:    t() from engine/i18n.js
//   Helpers:   saveState, render, showTab, todayKey
//   Constants: STORAGE_KEY, BELL_VARIANTS
//   Callbacks: setTimerMode, setBellSound, setPointsVisible,
//              previewBellSound, openFeedbackModal, openPrivacyDetail
// ============================================================================

// ============================================================================
// SETTINGS TAB
// ============================================================================

function renderSettings() {
  const tm = state.prefs?.timerMode || 'ask';
  // Feedback log count — plural via static keys (lesson #8).
  const feedbackLogCount = (state.feedbackLog && state.feedbackLog.length) || 0;
  const feedbackLogText = feedbackLogCount === 1
    ? t('settings.feedback.log_one')
    : t('settings.feedback.log_many', {n: feedbackLogCount});
  // Stage 2 auth status.
  const authMode  = (typeof authGetMode === 'function') ? authGetMode() : 'local';
  const unlocked  = (typeof passphraseIsUnlocked === 'function') && passphraseIsUnlocked();
  const authEmail = (typeof authGetEmail === 'function') ? authGetEmail() : '';
  const syncErr   = (typeof getLastSyncError === 'function') ? getLastSyncError() : null;
  let authBlurb, authButton;
  if (authMode === 'authed' && unlocked) {
    authBlurb  = `Signed in as <span class="text-amber-100 font-bold">${escapeHtml(authEmail || '')}</span>. Your practice data is encrypted on this device before it's sent to the server.`;
    authButton = `<button class="btn btn-ghost text-sm" onclick="openAuth('menu')">Manage</button>`;
  } else if (authMode === 'authed' && !unlocked) {
    authBlurb  = `Signed in as <span class="text-amber-100 font-bold">${escapeHtml(authEmail || '')}</span>, but the encryption passphrase isn't loaded — sync is paused until you enter it.`;
    authButton = `<button class="btn btn-gold text-sm" onclick="openAuth('menu')">Enter passphrase</button>`;
  } else {
    authBlurb  = 'Adze stores everything locally by default. Signing in lets you sync across devices, end-to-end encrypted.';
    authButton = `<button class="btn btn-gold text-sm" onclick="openAuth('menu')">Sign in / Sign up</button>`;
  }
  const authCard = `
    <div class="parchment rounded-xl p-5 mb-4">
      <h3 class="font-bold text-amber-100 mb-1">Account &amp; sync</h3>
      <p class="text-xs text-amber-100/65 mb-3 leading-relaxed">${authBlurb}</p>
      ${syncErr ? `<div class="mb-3 rounded-lg p-2 border border-red-700/50 bg-red-900/20 text-[11px] text-red-200">Sync error: ${escapeHtml(syncErr)}</div>` : ''}
      <div class="flex gap-2 flex-wrap items-center">
        ${authButton}
        <button class="text-[11px] text-amber-300/80 hover:text-amber-200 underline ml-auto" onclick="openPrivacyDetail()">How encryption works →</button>
      </div>
      ${authMode === 'authed' ? `
        <div class="mt-4 pt-3 border-t border-amber-800/30">
          <div class="text-[10px] uppercase tracking-wider text-red-300/70 mb-1">Danger zone</div>
          <button class="text-[11px] text-red-300/80 hover:text-red-200 underline" onclick="openAuth('delete-account-confirm')">Delete my account permanently</button>
          <p class="text-[10px] text-amber-100/50 mt-1 leading-relaxed">Removes your account, your synced data, and the local copy on this device. Cannot be undone.</p>
        </div>
      ` : ''}
    </div>
  `;
  // v15.0 — Beta guide entry. Re-openable anytime; the "(unread)" badge only
  // shows for users who haven't dismissed the modal yet.
  const betaGuideUnread = state && state.seenBetaGuide === false;
  const betaCard = `
    <div class="parchment rounded-xl p-4 mb-4 border border-amber-700/40">
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <div class="text-[10px] uppercase tracking-widest text-amber-300/70 mb-0.5">For testers</div>
          <h3 class="font-bold text-amber-100">About Adze · Beta guide</h3>
          <p class="text-xs text-amber-100/65 mt-1 leading-relaxed">What this is, what's beta-rough, how to feed back, why it matters.</p>
        </div>
        <button class="btn ${betaGuideUnread ? 'btn-gold' : 'btn-ghost'} text-sm whitespace-nowrap" onclick="openBetaGuide()">${betaGuideUnread ? 'Read' : 'Re-open'}</button>
      </div>
    </div>
  `;
  return `
    ${authCard}
    ${betaCard}

    <div class="parchment rounded-xl p-5 mb-4">
      <h2 class="text-xl font-bold gold-text mb-3">${t('settings.overview.heading')}</h2>
      <div class="space-y-2 text-sm">
        <div><span class="text-amber-100/60">${t('settings.overview.mode_label')}</span> <span class="text-amber-100 font-bold">${state.questMode === 'story' ? t('settings.overview.mode_story') : t('settings.overview.mode_free')}</span></div>
        ${state.questActive ? `<div><span class="text-amber-100/60">${t('settings.overview.quest_label')}</span> <span class="text-amber-100">${state.questName}</span></div>` : ''}
        <div><span class="text-amber-100/60">${t('settings.overview.members_label')}</span> <span class="text-amber-100">${state.members.length}</span></div>
        <div><span class="text-amber-100/60">${t('settings.overview.habits_label')}</span> <span class="text-amber-100">${state.habits.length}</span></div>
        ${state.questAttempts ? `<div><span class="text-amber-100/60">${t('settings.overview.attempts_label')}</span> <span class="text-amber-100">${state.questAttempts}</span></div>` : ''}
        <div class="pt-2 mt-2 border-t border-amber-800/30 flex items-center justify-between">
          <span class="text-amber-100/60">Version</span>
          <a href="https://github.com/slate915first/adze/blob/main/CHANGELOG.md" target="_blank" class="text-amber-300/85 underline text-xs">v${typeof APP_VERSION === 'string' ? APP_VERSION : '?'} · changelog →</a>
        </div>
      </div>
    </div>

    <div class="parchment rounded-xl p-5 mb-4">
      <h3 class="font-bold text-amber-100 mb-2">${t('settings.habits_config.heading')}</h3>
      <p class="text-xs text-amber-100/65 mb-3">${t('settings.habits_config.body')}</p>
      <button onclick="showTab('habits')" class="btn btn-gold w-full text-sm">${t('settings.habits_config.button')}</button>
    </div>

    <div class="parchment rounded-xl p-5 mb-4">
      <h3 class="font-bold text-amber-100 mb-2">${t('settings.bell.heading')}</h3>
      <p class="text-xs text-amber-100/60 mb-3">${t('settings.bell.body')}</p>
      <div class="space-y-2">
        ${['warm','goenka','singing','wood','thai'].map(k => {
          const v = BELL_VARIANTS[k];
          const current = (state.prefs?.bellSound || 'warm') === k;
          return `
            <div class="rounded-lg p-3 ${current ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30'}">
              <div class="flex items-start gap-2">
                <div class="flex-1">
                  <button onclick="setBellSound('${k}')" class="text-left w-full">
                    <div class="text-sm font-bold text-amber-100">${v.label}${current ? t('settings.bell.current_marker') : ''}</div>
                    <div class="text-[11px] text-amber-100/60">${v.description}</div>
                  </button>
                </div>
                <button onclick="previewBellSound('${k}')" class="btn btn-ghost text-xs shrink-0" title="${t('settings.bell.preview_tooltip')}">${t('settings.bell.preview_button')}</button>
              </div>
            </div>
          `;
        }).join('')}

        ${state.prefs?.customBellDataUrl ? (() => {
          const current = (state.prefs?.bellSound || 'warm') === 'custom';
          const name = String(state.prefs.customBellName || 'custom').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
          const dur  = state.prefs.customBellDurationSec ? state.prefs.customBellDurationSec.toFixed(1) + 's' : '';
          return `
            <div class="rounded-lg p-3 ${current ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30'}">
              <div class="flex items-start gap-2">
                <div class="flex-1 min-w-0">
                  <button onclick="setBellSound('custom')" class="text-left w-full">
                    <div class="text-sm font-bold text-amber-100">Your bell${current ? t('settings.bell.current_marker') : ''}</div>
                    <div class="text-[11px] text-amber-100/60 truncate">${name}${dur ? ' · ' + dur : ''}</div>
                  </button>
                </div>
                <button onclick="previewBellSound('custom')" class="btn btn-ghost text-xs shrink-0">${t('settings.bell.preview_button')}</button>
                <button onclick="if(confirm('Remove your custom bell?'))clearCustomBell()" class="btn btn-ghost text-xs shrink-0 text-red-300/80" title="Remove">✕</button>
              </div>
            </div>
          `;
        })() : ''}
      </div>

      <!-- v15.5 — upload a personal bell. Stays on this device + encrypted
           sync. Limits enforced in sound.js: ≤500 KB, ≤60 s, audio/* only. -->
      <div class="mt-3 pt-3 border-t border-amber-800/30">
        <input type="file" id="custom-bell-input" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac" style="display:none" onchange="handleCustomBellPicked(this)">
        <button onclick="document.getElementById('custom-bell-input').click()" class="btn btn-ghost text-xs w-full">
          ${state.prefs?.customBellDataUrl ? '↻ Replace your bell' : '＋ Use your own bell'}
        </button>
        <p class="text-[10px] text-amber-100/50 mt-2 leading-relaxed">
          MP3, WAV, OGG, or M4A · max <b>500 KB</b> · max <b>60 seconds</b>. Stays in your browser; syncs encrypted with the rest of your data. The maintainer cannot hear it.
        </p>
      </div>
    </div>

    <div class="parchment rounded-xl p-5 mb-4">
      <h3 class="font-bold text-amber-100 mb-2">${t('settings.timer.heading')}</h3>
      <p class="text-xs text-amber-100/60 mb-3">${t('settings.timer.body')}</p>
      <div class="space-y-2">
        <button onclick="setTimerMode('ask')" class="w-full text-left rounded-lg p-3 ${tm==='ask' ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30'} hover:parchment-active transition">
          <div class="text-sm font-bold text-amber-100">${t('settings.timer.ask_title')}</div>
          <div class="text-[11px] text-amber-100/60">${t('settings.timer.ask_body')}</div>
        </button>
        <button onclick="setTimerMode('always')" class="w-full text-left rounded-lg p-3 ${tm==='always' ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30'} hover:parchment-active transition">
          <div class="text-sm font-bold text-amber-100">${t('settings.timer.always_title')}</div>
          <div class="text-[11px] text-amber-100/60">${t('settings.timer.always_body')}</div>
        </button>
        <button onclick="setTimerMode('never')" class="w-full text-left rounded-lg p-3 ${tm==='never' ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30'} hover:parchment-active transition">
          <div class="text-sm font-bold text-amber-100">${t('settings.timer.never_title')}</div>
          <div class="text-[11px] text-amber-100/60">${t('settings.timer.never_body')}</div>
        </button>
      </div>
    </div>

    <div class="parchment rounded-xl p-5 mb-4">
      <h3 class="font-bold text-amber-100 mb-2">${t('settings.points.heading')}</h3>
      <p class="text-xs text-amber-100/60 mb-3">${t('settings.points.body')}</p>
      <div class="space-y-2">
        <button onclick="setPointsVisible(true)" class="w-full text-left rounded-lg p-3 ${(state.prefs?.pointsVisible !== false) ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30'} hover:parchment-active transition">
          <div class="text-sm font-bold text-amber-100">${t('settings.points.show_title')}</div>
          <div class="text-[11px] text-amber-100/60">${t('settings.points.show_body')}</div>
        </button>
        <button onclick="setPointsVisible(false)" class="w-full text-left rounded-lg p-3 ${(state.prefs?.pointsVisible === false) ? 'parchment-active border border-amber-400' : 'parchment border border-amber-700/30'} hover:parchment-active transition">
          <div class="text-sm font-bold text-amber-100">${t('settings.points.hide_title')}</div>
          <div class="text-[11px] text-amber-100/60">${t('settings.points.hide_body')}</div>
        </button>
      </div>
    </div>

    <div class="parchment rounded-xl p-5 mb-4 border border-amber-500/40">
      <h3 class="font-bold text-amber-100 mb-1">${t('settings.feedback.heading')}</h3>
      <p class="text-xs text-amber-100/70 mb-3 leading-relaxed">${t('settings.feedback.body')}</p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button onclick="openFeedbackModal('bug')" class="parchment border border-amber-700/40 rounded-lg p-3 text-left hover:parchment-active transition">
          <div class="text-2xl">🐛</div>
          <div class="text-sm font-bold text-amber-100 mt-1">${t('settings.feedback.bug_label')}</div>
          <div class="text-[10px] text-amber-100/60">${t('settings.feedback.bug_body')}</div>
        </button>
        <button onclick="openFeedbackModal('idea')" class="parchment border border-amber-700/40 rounded-lg p-3 text-left hover:parchment-active transition">
          <div class="text-2xl">💡</div>
          <div class="text-sm font-bold text-amber-100 mt-1">${t('settings.feedback.idea_label')}</div>
          <div class="text-[10px] text-amber-100/60">${t('settings.feedback.idea_body')}</div>
        </button>
        <button onclick="openFeedbackModal('help')" class="parchment border border-amber-700/40 rounded-lg p-3 text-left hover:parchment-active transition">
          <div class="text-2xl">🪷</div>
          <div class="text-sm font-bold text-amber-100 mt-1">${t('settings.feedback.help_label')}</div>
          <div class="text-[10px] text-amber-100/60">${t('settings.feedback.help_body')}</div>
        </button>
        <button onclick="openFeedbackModal('praise')" class="parchment border border-amber-700/40 rounded-lg p-3 text-left hover:parchment-active transition">
          <div class="text-2xl">✨</div>
          <div class="text-sm font-bold text-amber-100 mt-1">${t('settings.feedback.praise_label')}</div>
          <div class="text-[10px] text-amber-100/60">${t('settings.feedback.praise_body')}</div>
        </button>
      </div>
      ${feedbackLogCount > 0 ? `
        <p class="text-[10px] text-amber-100/50 italic mt-3">${feedbackLogText}</p>
      ` : ''}
    </div>

    <div class="parchment rounded-xl p-5 mb-4 border border-amber-700/30">
      <h3 class="font-bold text-amber-100 mb-2">${t('settings.privacy.heading')}</h3>
      <p class="text-xs text-amber-100/70 mb-3 leading-relaxed">${t('settings.privacy.body')}</p>
      <div class="flex gap-2 flex-wrap">
        <button onclick="openPrivacyDetail()" class="btn btn-ghost text-xs">${t('settings.privacy.read_more')}</button>
        <button onclick="openDatenschutz()" class="btn btn-ghost text-xs">${t('welcome.privacy_policy_link')}</button>
        <button onclick="openImpressum()" class="btn btn-ghost text-xs">${t('welcome.imprint_link')}</button>
      </div>
    </div>

    <div class="parchment rounded-xl p-5 mb-4">
      <h3 class="font-bold text-amber-100 mb-2">${t('settings.backup.heading')}</h3>
      <p class="text-xs text-amber-100/60 mb-3">${t('settings.backup.body')}</p>
      <div class="flex gap-2 flex-wrap">
        <button class="btn btn-ghost text-sm" onclick="exportData()">${t('settings.backup.export_button')}</button>
        <button class="btn btn-ghost text-sm" onclick="importData()">${t('settings.backup.import_button')}</button>
      </div>
    </div>

    <div class="parchment rounded-xl p-5 mb-4 border-red-900/40">
      <h3 class="font-bold text-red-300 mb-2">${t('settings.danger.heading')}</h3>
      <div class="flex gap-2 flex-wrap">
        ${state.questActive ? `<button class="btn btn-danger text-sm" onclick="if(confirm(t('settings.danger.abandon_confirm'))){abandonQuest()}">${t('settings.danger.abandon_button')}</button>` : ''}
        <button class="btn btn-danger text-sm" onclick="resetAll()">${t('settings.danger.reset_button')}</button>
      </div>
    </div>
  `;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `habit-quest-3-${todayKey()}.json`;
  a.click();
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try { state = JSON.parse(ev.target.result); saveState(); view.currentMember = state.members[0]?.id; render(); alert(t('alerts.import_quick')); }
      catch(err) { alert(t('alerts.import_quick_failed')); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function abandonQuest() {
  state.questActive = false;
  state.questMode = 'custom';
  saveState();
  view.tab = 'today';
  render();
}

function resetAll() {
  if (!confirm(t('alerts.reset_confirm'))) return;
  localStorage.removeItem(STORAGE_KEY);
  state = null;
  location.reload();
}
