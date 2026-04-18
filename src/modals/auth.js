// ============================================================================
// src/modals/auth.js
// ----------------------------------------------------------------------------
// Stage 2. Sign-up / sign-in / passphrase flows.
//
// Auth (Supabase email+password) and the E2E passphrase are two independent
// secrets with independent modal steps. The Supabase password gates the
// account; the passphrase gates decryption of your synced practice data and
// is NEVER recoverable.
//
// Modal steps (view.modal.step):
//   menu                       — entry point (also renders signed-in state)
//   signup                     — create Supabase account
//   signin                     — sign in to existing Supabase account
//   passphrase-setup           — create new passphrase (signup path OR reset)
//   passphrase-unlock          — enter passphrase on this/another device
//   passphrase-reset-confirm   — scary "wipe my synced data" confirmation
// ============================================================================

function openAuth(step) {
  view.modal = {
    type: 'auth',
    step: step || 'menu',
    busy: false,
    error: null,
    consent: false,
    reset: false
  };
  renderModal();
}

function renderAuthModal(m) {
  if (m.step === 'menu')                    return renderAuthMenu(m);
  if (m.step === 'signup')                  return renderAuthSignup(m);
  if (m.step === 'signin')                  return renderAuthSignin(m);
  if (m.step === 'passphrase-setup')        return renderPassphraseSetup(m);
  if (m.step === 'passphrase-unlock')       return renderPassphraseUnlock(m);
  if (m.step === 'passphrase-reset-confirm')return renderPassphraseResetConfirm(m);
  if (m.step === 'passphrase-success')      return renderPassphraseSuccess(m);
  return `<div class="text-amber-200">Unknown auth step: ${escapeHtml(m.step)}</div>`;
}

function renderPassphraseSuccess(m) {
  return `
    <div class="fade-in text-center py-6">
      <div class="text-6xl mb-3">✅</div>
      <h2 class="text-xl font-bold gold-text mb-2">Passphrase set</h2>
      <p class="text-sm text-amber-100/85 serif leading-relaxed">Your practice data is encrypted and synced.</p>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Step renderers
// ---------------------------------------------------------------------------

function renderAuthMenu(m) {
  const authed   = typeof authGetMode === 'function' && authGetMode() === 'authed';
  const unlocked = typeof passphraseIsUnlocked === 'function' && passphraseIsUnlocked();
  const email    = authGetEmail ? authGetEmail() : '';

  if (authed && unlocked) {
    return `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🔓</div>
          <h2 class="text-xl font-bold gold-text">Signed in and unlocked</h2>
          <p class="text-xs text-amber-100/70 mt-1">${escapeHtml(email)}</p>
        </div>
        <div class="parchment rounded-xl p-4 mb-4 text-sm text-amber-100/85 serif leading-relaxed">
          Your practice data is encrypted on this device before it syncs. Signing out clears the encryption key from memory — you'll need your passphrase again next time.
        </div>
        <div class="flex justify-between gap-2">
          <button class="btn btn-ghost" onclick="closeModal()">Close</button>
          <button class="btn btn-gold" onclick="authDoSignOut()">Sign out</button>
        </div>
      </div>
    `;
  }

  if (authed && !unlocked) {
    return `
      <div class="fade-in">
        <div class="text-center mb-4">
          <div class="text-5xl mb-2">🔒</div>
          <h2 class="text-xl font-bold gold-text">Signed in — locked</h2>
          <p class="text-xs text-amber-100/70 mt-1">${escapeHtml(email)}</p>
        </div>
        <div class="parchment rounded-xl p-4 mb-4 text-sm text-amber-100/85 serif leading-relaxed">
          You're signed in, but your encryption passphrase isn't loaded in this session. Enter it to sync across devices, or stay local.
        </div>
        <div class="space-y-2">
          <button class="btn btn-gold w-full" onclick="authStartUnlockOrSetup()">Enter passphrase</button>
          <button class="btn btn-ghost w-full" onclick="authDoSignOut()">Sign out</button>
        </div>
      </div>
    `;
  }

  const publicSignup = typeof ADZE_PUBLIC_SIGNUP_ENABLED === 'boolean' ? ADZE_PUBLIC_SIGNUP_ENABLED : false;
  return `
    <div class="fade-in">
      <div class="text-center mb-4">
        <div class="text-5xl mb-2">🔐</div>
        <h2 class="text-xl font-bold gold-text">Sync across devices</h2>
        <p class="text-xs text-amber-100/70 mt-1 serif">Optional. End-to-end encrypted.</p>
      </div>
      <div class="parchment rounded-xl p-4 mb-3 text-sm text-amber-100/85 serif leading-relaxed">
        By default, Adze stores everything on this device only — nothing leaves your browser. Signing in lets you pick up where you left off on another device. Your practice data is encrypted in your browser with a passphrase you choose, before it's sent to the server. Nobody but you can read it.
      </div>
      <div class="space-y-2">
        ${publicSignup ? `<button class="btn btn-gold w-full" onclick="openAuth('signup')">Create an account</button>` : ''}
        <button class="btn ${publicSignup ? 'btn-ghost' : 'btn-gold'} w-full" onclick="openAuth('signin')">${publicSignup ? 'I already have an account' : 'Sign in'}</button>
        <button class="btn btn-ghost w-full text-xs" onclick="closeModal()">Continue anonymously (local only)</button>
      </div>
      ${publicSignup ? '' : `
        <div class="mt-4 text-center text-[11px] text-amber-100/55 italic leading-relaxed">
          Adze is in closed beta. If you'd like to test, email
          <a href="mailto:hello@adze.life" class="text-amber-300 underline">hello@adze.life</a>.
        </div>
      `}
    </div>
  `;
}

function renderAuthSignup(m) {
  const err = renderAuthError(m);
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">🌱</div>
        <h2 class="text-xl font-bold gold-text">Create an account</h2>
        <p class="text-xs text-amber-100/70 mt-1 serif">Step 1 of 2 — account details</p>
      </div>
      ${err}
      <div class="space-y-3 mb-3">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Email</label>
          <input id="auth-email" type="email" autocomplete="email" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100"/>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Password</label>
          <input id="auth-password" type="password" autocomplete="new-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100"/>
          <p class="text-[11px] text-amber-100/60 mt-1">Signs you in to your account. Resettable by email.</p>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Password again</label>
          <input id="auth-password-confirm" type="password" autocomplete="new-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100"/>
        </div>
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="openAuth('menu')" ${m.busy ? 'disabled' : ''}>Back</button>
        <button class="btn btn-gold" onclick="authDoSignUp()" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Creating…' : 'Continue'}</button>
      </div>
    </div>
  `;
}

function renderAuthSignin(m) {
  const err = renderAuthError(m);
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">🔑</div>
        <h2 class="text-xl font-bold gold-text">Sign in</h2>
      </div>
      ${err}
      <div class="space-y-3 mb-3">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Email</label>
          <input id="auth-email" type="email" autocomplete="email" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100"/>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Password</label>
          <input id="auth-password" type="password" autocomplete="current-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100"/>
        </div>
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="openAuth('menu')" ${m.busy ? 'disabled' : ''}>Back</button>
        <button class="btn btn-gold" onclick="authDoSignIn()" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Signing in…' : 'Sign in'}</button>
      </div>
    </div>
  `;
}

function renderPassphraseSetup(m) {
  const err = renderAuthError(m);
  const heading = m.reset ? 'Set a new passphrase' : 'Set your encryption passphrase';
  const subtitle = m.reset
    ? 'Old synced data has been wiped. Choose a new passphrase — same rules.'
    : 'Step 2 of 2 — encryption';
  const warning = `Your passphrase is the encryption key for everything that leaves this device. <b>If you forget it, your synced practice data cannot be recovered — not by us, not by anyone.</b> No reset email, no backup. This is the cost of end-to-end encryption.`;
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">🗝️</div>
        <h2 class="text-xl font-bold gold-text">${heading}</h2>
        <p class="text-xs text-amber-100/70 mt-1 serif">${escapeHtml(subtitle)}</p>
      </div>
      ${err}
      <div class="parchment rounded-xl p-3 mb-3 border border-amber-700/50 text-xs text-amber-100/90 serif leading-relaxed">
        ${warning}
      </div>
      <div class="space-y-3 mb-3">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Passphrase</label>
          <input id="pp-new" type="password" autocomplete="new-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100"/>
          <p class="text-[11px] text-amber-100/60 mt-1">Different from your account password. Used only in your browser to encrypt your data.</p>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Passphrase again</label>
          <input id="pp-new-confirm" type="password" autocomplete="new-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100"/>
        </div>
        <label class="flex items-start gap-2 text-xs text-amber-100/85 serif leading-relaxed">
          <input id="pp-consent" type="checkbox" class="mt-0.5" ${m.consent ? 'checked' : ''} onchange="authSetConsent(this.checked)"/>
          <span>I understand: <b>if I lose this passphrase, my synced practice data is gone.</b> No reset, no recovery.</span>
        </label>
      </div>
      <div class="flex justify-between gap-2 flex-wrap">
        <button class="btn btn-ghost" onclick="closeModal()" ${m.busy ? 'disabled' : ''}>Later</button>
        <button id="pp-submit" class="btn btn-gold" onclick="authDoPassphraseSet()" ${m.busy || !m.consent ? 'disabled' : ''}>${m.busy ? 'Encrypting…' : 'Set passphrase'}</button>
      </div>
    </div>
  `;
}

function renderPassphraseUnlock(m) {
  const err = renderAuthError(m);
  const email = authGetEmail ? authGetEmail() : '';
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">🗝️</div>
        <h2 class="text-xl font-bold gold-text">Unlock your data</h2>
        <p class="text-xs text-amber-100/70 mt-1">${escapeHtml(email)}</p>
      </div>
      ${err}
      <div class="parchment rounded-xl p-3 mb-3 text-xs text-amber-100/85 serif leading-relaxed">
        Enter the passphrase you used to encrypt your practice data. This is separate from your account password.
      </div>
      <div class="space-y-3 mb-3">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Passphrase</label>
          <input id="pp-unlock" type="password" autocomplete="current-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100"/>
        </div>
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="openAuth('menu')" ${m.busy ? 'disabled' : ''}>Back</button>
        <button class="btn btn-gold" onclick="authDoPassphraseUnlock()" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Unlocking…' : 'Unlock'}</button>
      </div>
      <div class="mt-3 text-center">
        <button class="text-[11px] text-amber-300/70 underline hover:text-amber-200" onclick="openAuth('passphrase-reset-confirm')" ${m.busy ? 'disabled' : ''}>I forgot my passphrase</button>
      </div>
    </div>
  `;
}

function renderPassphraseResetConfirm(m) {
  const err = renderAuthError(m);
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">⚠️</div>
        <h2 class="text-xl font-bold gold-text">Wipe synced data?</h2>
      </div>
      ${err}
      <div class="parchment rounded-xl p-3 mb-3 border border-red-700/60 bg-red-900/10 text-xs text-red-100/95 serif leading-relaxed">
        Forgetting the passphrase means your encrypted practice data on the server is unreadable — <b>we cannot decrypt it for you</b>. The only way forward is to delete the ciphertext and start fresh with a new passphrase.
        <br/><br/>
        Your account stays. Anything still in this browser (localStorage) will be re-uploaded under the new passphrase.
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="openAuth('passphrase-unlock')" ${m.busy ? 'disabled' : ''}>No, let me try again</button>
        <button class="btn btn-gold" onclick="authBeginPassphraseReset()" ${m.busy ? 'disabled' : ''}>Yes, wipe and reset</button>
      </div>
    </div>
  `;
}

function renderAuthError(m) {
  return m.error
    ? `<div class="mb-3 rounded-lg p-3 border border-red-700/60 bg-red-900/20 text-red-200 text-xs">${escapeHtml(m.error)}</div>`
    : '';
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function authSetConsent(v) {
  if (!(view.modal && view.modal.type === 'auth')) return;
  view.modal.consent = !!v;
  // IMPORTANT: do NOT renderModal() here — a full re-render would wipe the
  // passphrase inputs and trigger Safari's save-password prompt as the new
  // input elements appear. Toggle the submit button's disabled state in place.
  const btn = document.getElementById('pp-submit');
  if (btn) btn.disabled = view.modal.busy || !view.modal.consent;
}

async function authStartUnlockOrSetup() {
  authSetAuthBusy(true);
  try {
    const hasRow = await passphraseRemoteExists();
    view.modal.step = hasRow ? 'passphrase-unlock' : 'passphrase-setup';
    view.modal.reset = false;
    view.modal.consent = false;
    view.modal.busy = false;
    view.modal.error = null;
    renderModal();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

async function authDoSignUp() {
  const email    = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  const confirm  = document.getElementById('auth-password-confirm')?.value;
  if (!email || !password)       return authSetAuthError('Email and password are required.');
  if (password.length < 8)       return authSetAuthError('Password must be at least 8 characters.');
  if (password !== confirm)      return authSetAuthError('Passwords do not match.');
  authSetAuthBusy(true);
  try {
    await authSignUp(email, password);
    view.modal.step = 'passphrase-setup';
    view.modal.reset = false;
    view.modal.consent = false;
    view.modal.busy = false;
    view.modal.error = null;
    renderModal();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

async function authDoSignIn() {
  const email    = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  if (!email || !password) return authSetAuthError('Email and password are required.');
  authSetAuthBusy(true);
  try {
    await authSignIn(email, password);
    const hasRow = await passphraseRemoteExists();
    view.modal.step = hasRow ? 'passphrase-unlock' : 'passphrase-setup';
    view.modal.reset = false;
    view.modal.consent = false;
    view.modal.busy = false;
    view.modal.error = null;
    renderModal();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

async function authDoPassphraseSet() {
  const pass    = document.getElementById('pp-new')?.value;
  const confirm = document.getElementById('pp-new-confirm')?.value;
  if (!pass || pass.length < 8)   return authSetAuthError('Passphrase must be at least 8 characters.');
  if (pass !== confirm)           return authSetAuthError('Passphrases do not match.');
  authSetAuthBusy(true);
  try {
    if (view.modal.reset) {
      await passphraseReset(pass);
    } else {
      await passphraseSet(pass);
    }
    view.modal.step = 'passphrase-success';
    view.modal.busy = false;
    view.modal.error = null;
    renderModal();
    setTimeout(() => { closeModal(); authAfterAuthSuccess(); }, 1500);
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

async function authDoPassphraseUnlock() {
  const pass = document.getElementById('pp-unlock')?.value;
  if (!pass) return authSetAuthError('Enter your passphrase.');
  authSetAuthBusy(true);
  try {
    await passphraseUnlock(pass);
    const remote = await passphrasePullState();
    if (remote) {
      state = migrateState(remote);
      if (state && state.setupComplete) view.currentMember = state.members[0]?.id;
    }
    closeModal();
    authAfterAuthSuccess();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

// After a successful signin/signup/unlock, the user should land somewhere
// sensible: the main app if they have a completed setup, or the onboarding
// flow if they don't. Landing back on the welcome page (with its "sign in"
// link) is confusing once you're already authed.
function authAfterAuthSuccess() {
  if (state && state.setupComplete) {
    render();
  } else {
    if (typeof startSetup === 'function') startSetup();
    else render();
  }
}

function authBeginPassphraseReset() {
  view.modal.step = 'passphrase-setup';
  view.modal.reset = true;
  view.modal.consent = false;
  view.modal.busy = false;
  view.modal.error = null;
  renderModal();
}

async function authDoSignOut() {
  await authSignOut();
  closeModal();
  render();
}

function authSetAuthBusy(b) {
  if (view.modal && view.modal.type === 'auth') {
    view.modal.busy = !!b;
    view.modal.error = null;
    renderModal();
  }
}

function authSetAuthError(msg) {
  if (view.modal && view.modal.type === 'auth') {
    view.modal.error = msg;
    view.modal.busy = false;
    renderModal();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
}
