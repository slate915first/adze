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
  if (m.step === 'set-initial-password')    return renderSetInitialPassword(m);
  if (m.step === 'forgot-password')         return renderForgotPassword(m);
  if (m.step === 'forgot-password-sent')    return renderForgotPasswordSent(m);
  if (m.step === 'delete-account-confirm')  return renderDeleteAccountConfirm(m);
  if (m.step === 'delete-account-success')  return renderDeleteAccountSuccess(m);
  if (m.step === 'invite-landing')          return renderInviteLanding(m);
  if (m.step === 'invite-code')             return renderInviteCode(m);
  if (m.step === 'magic-request')           return renderMagicRequest(m);
  if (m.step === 'magic-verify')            return renderMagicVerify(m);
  return `<div class="text-amber-200">Unknown auth step: ${escapeHtml(m.step)}</div>`;
}

// v15.11 — Magic-link sign-in: two steps.
// 1) magic-request: enter email, tap "Send code" → Supabase emails a
//    6-digit code. Allowlist trigger rejects unapproved emails with a
//    clear message surfaced here.
// 2) magic-verify: enter the 6-digit code → verifyOtp → session →
//    chain into existing passphrase-unlock / passphrase-setup flow.
function renderMagicRequest(m) {
  const err = renderAuthError(m);
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">✉️</div>
        <h2 class="text-xl font-bold gold-text">Sign in with email</h2>
        <p class="text-xs text-amber-100/70 mt-1 serif">We'll send a 6-digit code to your inbox.</p>
      </div>
      ${err}
      <div class="space-y-3 mb-4">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Email</label>
          <input id="magic-email" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100" ${m.busy ? 'disabled' : ''}/>
        </div>
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="closeModal()" ${m.busy ? 'disabled' : ''}>Cancel</button>
        <button class="btn btn-gold" onclick="authDoRequestMagicCode()" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Sending…' : 'Send code'}</button>
      </div>
      <p class="text-[11px] text-amber-100/55 italic text-center mt-4 leading-relaxed">
        Adze is in closed beta. Only pre-approved emails receive codes. To request access, email <a href="mailto:hello@adze.life" class="text-amber-300 underline">hello@adze.life</a>.
      </p>
    </div>
  `;
}

function renderMagicVerify(m) {
  const err = renderAuthError(m);
  const email = m.email || '';
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">🔑</div>
        <h2 class="text-xl font-bold gold-text">Enter the code</h2>
        <p class="text-xs text-amber-100/70 mt-1">Sent to ${escapeHtml(email)}</p>
      </div>
      ${err}
      <div class="space-y-3 mb-4">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Code from email</label>
          <input id="magic-code" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="10" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100 text-lg tracking-widest text-center font-mono" placeholder="• • • • • •" ${m.busy ? 'disabled' : ''}/>
        </div>
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="openAuth('magic-request')" ${m.busy ? 'disabled' : ''}>Back</button>
        <button class="btn btn-gold" onclick="authDoVerifyMagicCode()" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Verifying…' : 'Sign in'}</button>
      </div>
      <div class="mt-3 text-center">
        <button class="text-[11px] text-amber-300/70 underline hover:text-amber-200" onclick="authDoResendMagicCode()" ${m.busy ? 'disabled' : ''}>Resend code</button>
      </div>
    </div>
  `;
}

async function authDoRequestMagicCode() {
  const email = document.getElementById('magic-email')?.value;
  if (!email || !email.trim()) return authSetAuthError('Email is required.');
  authSetAuthBusy(true);
  try {
    await authRequestMagicCode(email);
    view.modal.step = 'magic-verify';
    view.modal.email = String(email).trim().toLowerCase();
    view.modal.busy = false;
    view.modal.error = null;
    renderModal();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

async function authDoVerifyMagicCode() {
  const code = document.getElementById('magic-code')?.value;
  const email = view.modal?.email;
  if (!email) return authSetAuthError('Session expired. Go back and request a new code.');
  if (!code) return authSetAuthError('Enter the 6-digit code.');
  authSetAuthBusy(true);
  try {
    await authVerifyMagicCode(email, code);
    // Session created. Chain into existing passphrase flow — if a
    // user_state row exists, unlock; otherwise set a new passphrase.
    await authStartUnlockOrSetup();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

async function authDoResendMagicCode() {
  const email = view.modal?.email;
  if (!email) return;
  authSetAuthBusy(true);
  try {
    await authRequestMagicCode(email);
    view.modal.busy = false;
    view.modal.error = null;
    // Lightweight feedback — flash the button label briefly. A full
    // success-toast subsystem would be nicer; for now a status line.
    view.modal.error = null;
    renderModal();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

// v15.10 — 6-digit code entry. The pro pattern: no link to click, no
// prefetch to consume, nothing happens server-side until the human types
// the code into this form. Slack / Notion / Linear / GitHub all use this.
function renderInviteCode(m) {
  const err = renderAuthError(m);
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">🔑</div>
        <h2 class="text-xl font-bold gold-text">Enter your invite code</h2>
        <p class="text-xs text-amber-100/70 mt-1 serif">Six digits from your invitation email.</p>
      </div>
      ${err}
      <div class="space-y-3 mb-4">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Email</label>
          <input id="invcode-email" type="email" autocomplete="email" autocapitalize="off" spellcheck="false" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100" ${m.busy ? 'disabled' : ''}/>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Code</label>
          <input id="invcode-token" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100 text-lg tracking-widest text-center font-mono" placeholder="• • • • • •" ${m.busy ? 'disabled' : ''}/>
        </div>
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="openAuth('menu')" ${m.busy ? 'disabled' : ''}>Back</button>
        <button class="btn btn-gold" onclick="authDoVerifyInviteCode()" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Verifying…' : 'Verify code'}</button>
      </div>
      <p class="text-[11px] text-amber-100/55 italic text-center mt-4 leading-relaxed">
        No code? Email <a href="mailto:hello@adze.life" class="text-amber-300 underline">hello@adze.life</a> to ask for a fresh invite.
      </p>
    </div>
  `;
}

async function authDoVerifyInviteCode() {
  const email = document.getElementById('invcode-email')?.value;
  const token = document.getElementById('invcode-token')?.value;
  if (!email) return authSetAuthError('Email is required.');
  if (!token) return authSetAuthError('Code is required.');
  authSetAuthBusy(true);
  try {
    await authVerifyEmailOtp(email, token, 'invite');
    // Session established, no password yet → set-initial-password modal
    // (existing flow from here: password → passphrase → onboarding).
    view.modal.step = 'set-initial-password';
    view.modal.busy = false;
    view.modal.error = null;
    view.modal.consent = false;
    view.modal.reset = false;
    renderModal();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

// v15.9 — Prefetch-resistant invite/recovery landing.
// Email links from Adze's templates point to /?invite_token=...&type=...
// Adze itself is the landing page. The token is NOT verified on page load
// — only when the user taps "Set up your account" below. That tap calls
// verifyOtp client-side, consuming the token. Gmail / proxies / scanners
// prefetching the email link only fetch this static landing page; the
// token survives until the human acts.
function renderInviteLanding(m) {
  const err = renderAuthError(m);
  const isRecovery = m.tokenType === 'recovery';
  const headline = isRecovery ? 'Reset your password' : 'Welcome to Adze';
  const lead = isRecovery
    ? 'You asked to reset your password. Tap below to confirm and choose a new one.'
    : 'A small circle invited you to test Adze — a meditation companion rooted in the Theravāda tradition. Tap below to confirm your invitation and set up your account.';
  const cta = isRecovery ? 'Confirm &amp; choose a new password →' : 'Set up your account →';
  const icon = isRecovery ? '🔑' : '🌱';
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-5xl mb-2">${icon}</div>
        <h2 class="text-xl font-bold gold-text">${headline}</h2>
      </div>
      ${err}
      <div class="parchment rounded-xl p-4 mb-4 text-sm text-amber-100/90 serif leading-relaxed">
        <p>${lead}</p>
      </div>
      <div class="flex justify-center">
        <button class="btn btn-gold w-full max-w-xs" onclick="authDoConsumeInviteToken()" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Confirming…' : cta}</button>
      </div>
      <p class="text-[11px] text-amber-100/55 italic text-center mt-4 leading-relaxed">
        ${isRecovery
          ? 'This won\'t change your encryption passphrase. That stays separate, and remains non-recoverable.'
          : 'After this you\'ll set a password (resettable), then a separate encryption passphrase that protects your synced data (not recoverable — write it down).'}
      </p>
    </div>
  `;
}

async function authDoConsumeInviteToken() {
  if (!(view.modal && view.modal.type === 'auth' && view.modal.step === 'invite-landing')) return;
  authSetAuthBusy(true);
  try {
    await authConsumeInviteToken();
    // Token is now consumed; pending-password-set is true. Hand off to
    // the existing set-initial-password modal, which already chains to
    // passphrase setup, then onboarding.
    view.modal.step = 'set-initial-password';
    view.modal.busy = false;
    view.modal.error = null;
    view.modal.consent = false;
    view.modal.reset = false;
    renderModal();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

// v15.6 — Account deletion (GDPR right to erasure). Two-step flow:
// 1) Scary confirmation modal that requires the user to type a confirmation
//    phrase. Avoids accidental clicks.
// 2) Success screen briefly, then the modal closes and the welcome page
//    appears (state already wiped server- and client-side).
const DELETE_ACCOUNT_PHRASE = 'delete my account';

function renderDeleteAccountConfirm(m) {
  const err = renderAuthError(m);
  const email = (typeof authGetEmail === 'function') ? authGetEmail() : '';
  const phraseTyped = m.phraseTyped || '';
  const ready = phraseTyped.trim().toLowerCase() === DELETE_ACCOUNT_PHRASE && !m.busy;
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">⚠️</div>
        <h2 class="text-xl font-bold text-red-300">Delete your account</h2>
        <p class="text-xs text-amber-100/70 mt-1">${escapeHtml(email)}</p>
      </div>
      ${err}
      <div class="parchment rounded-xl p-3 mb-3 border border-red-700/60 bg-red-900/15 text-sm text-amber-100/90 serif leading-relaxed">
        <p class="mb-2"><b class="text-red-300">This is permanent.</b> The following will happen the moment you confirm:</p>
        <ul class="text-xs space-y-1 list-disc pl-5 text-amber-100/85 mb-2">
          <li>Your account is deleted from the server.</li>
          <li>Your synced practice data (the encrypted ciphertext) is deleted with it.</li>
          <li>Your encryption passphrase becomes meaningless — there is nothing left to decrypt.</li>
          <li>Your local browser data is also wiped from this device.</li>
          <li><b>There is no recovery.</b> No 30-day grace period. No undo.</li>
        </ul>
        <p class="text-xs text-amber-100/70 italic">If you only want to take a break, just close the app — your data stays as it is. This is for actually leaving.</p>
      </div>
      <div class="space-y-3 mb-3">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">To confirm, type: <code class="text-red-300">${DELETE_ACCOUNT_PHRASE}</code></label>
          <input id="del-phrase" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100" oninput="authUpdateDeletePhrase(this.value)" ${m.busy ? 'disabled' : ''}/>
        </div>
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="closeModal()" ${m.busy ? 'disabled' : ''}>Cancel</button>
        <button id="del-submit" class="btn ${ready ? 'btn-gold' : 'btn-ghost'}" onclick="authDoDeleteAccount()" ${ready ? '' : 'disabled'}>${m.busy ? 'Deleting…' : 'Delete account permanently'}</button>
      </div>
    </div>
  `;
}

function renderDeleteAccountSuccess(m) {
  return `
    <div class="fade-in text-center py-6">
      <div class="text-6xl mb-3">🌱</div>
      <h2 class="text-xl font-bold gold-text mb-2">Your account has been deleted</h2>
      <p class="text-sm text-amber-100/85 serif leading-relaxed mb-4 px-3">
        Your account, your synced data, and the local copy on this device are all gone. The path remains. We hope it was useful while it was.
      </p>
      <p class="text-[11px] text-amber-100/55 italic">— Dirk</p>
    </div>
  `;
}

// Live-update the submit button as the user types the confirmation phrase.
// In-place patch (no full re-render) so the input doesn't lose focus.
function authUpdateDeletePhrase(value) {
  if (!(view.modal && view.modal.type === 'auth' && view.modal.step === 'delete-account-confirm')) return;
  view.modal.phraseTyped = value;
  const ready = (value || '').trim().toLowerCase() === DELETE_ACCOUNT_PHRASE && !view.modal.busy;
  const btn = document.getElementById('del-submit');
  if (btn) {
    btn.disabled = !ready;
    btn.classList.toggle('btn-gold', ready);
    btn.classList.toggle('btn-ghost', !ready);
  }
}

async function authDoDeleteAccount() {
  if (!(view.modal && view.modal.type === 'auth' && view.modal.step === 'delete-account-confirm')) return;
  authSetAuthBusy(true);
  try {
    await authDeleteAccount();
    // authDeleteAccount has already wiped state + signed out. Show the
    // success screen briefly, then close to welcome.
    view.modal = { type: 'auth', step: 'delete-account-success' };
    renderModal();
    setTimeout(() => { closeModal(); render(); }, 2200);
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
}

// v15.3 — "Forgot password?" entry. Sends a Supabase recovery email; the
// link in that email lands the user back here with type=recovery in the
// URL hash. authInit detects it, sets _pendingPasswordSet=true, and the
// boot sequence shows the set-initial-password modal — same code path as
// invited users. So this modal step only handles the request side.
function renderForgotPassword(m) {
  const err = renderAuthError(m);
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">📨</div>
        <h2 class="text-xl font-bold gold-text">Reset your password</h2>
      </div>
      ${err}
      <div class="parchment rounded-xl p-3 mb-3 text-xs text-amber-100/85 serif leading-relaxed">
        Enter the email you signed up with. We'll send you a link to choose a new password. <b>This won't reset your encryption passphrase</b> — that one stays separate, and remains non-recoverable.
      </div>
      <div class="space-y-3 mb-3">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Email</label>
          <input id="forgot-email" type="email" autocomplete="email" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100" ${m.busy ? 'disabled' : ''}/>
        </div>
      </div>
      <div class="flex justify-between gap-2">
        <button class="btn btn-ghost" onclick="openAuth('signin')" ${m.busy ? 'disabled' : ''}>Back</button>
        <button class="btn btn-gold" onclick="authDoForgotPassword()" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Sending…' : 'Send reset link'}</button>
      </div>
    </div>
  `;
}

function renderForgotPasswordSent(m) {
  return `
    <div class="fade-in text-center py-4">
      <div class="text-5xl mb-3">📬</div>
      <h2 class="text-xl font-bold gold-text mb-2">Check your inbox</h2>
      <p class="text-sm text-amber-100/85 serif leading-relaxed mb-4 px-3">
        If an Adze account exists for that email, a reset link is on its way. The link works once and expires in an hour.
      </p>
      <p class="text-[11px] text-amber-100/55 italic mb-5 px-3">
        Don't see it? Check your spam folder. The sender is <b>beta@adze.life</b>.
      </p>
      <button class="btn btn-gold" onclick="closeModal()">Done</button>
    </div>
  `;
}

async function authDoForgotPassword() {
  const email = document.getElementById('forgot-email')?.value.trim();
  if (!email) return authSetAuthError('Email is required.');
  authSetAuthBusy(true);
  try {
    await authResetPassword(email);
    view.modal.step = 'forgot-password-sent';
    view.modal.busy = false;
    view.modal.error = null;
    renderModal();
  } catch (e) {
    // Don't reveal whether the email exists — generic confirmation either way.
    view.modal.step = 'forgot-password-sent';
    view.modal.busy = false;
    view.modal.error = null;
    renderModal();
  }
}

// v15.0 — Shown after a successful invite or recovery link click. The user
// has a session but no password yet (or wants to change it). Mandatory step.
function renderSetInitialPassword(m) {
  const err = renderAuthError(m);
  const email = (typeof authGetEmail === 'function') ? authGetEmail() : '';
  return `
    <div class="fade-in">
      <div class="text-center mb-3">
        <div class="text-4xl mb-1">🌱</div>
        <h2 class="text-xl font-bold gold-text">Welcome to Adze</h2>
        <p class="text-xs text-amber-100/70 mt-1">${escapeHtml(email)}</p>
      </div>
      ${err}
      <div class="parchment rounded-xl p-4 mb-3 text-sm text-amber-100/85 serif leading-relaxed">
        Choose a password for your account. You'll use this to sign back in next time. The next step will ask for a separate <i>encryption passphrase</i> that protects your synced data — that one is not recoverable, so think of it as the more important secret.
      </div>
      <div class="space-y-3 mb-3">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">New password</label>
          <input id="initpw-new" type="password" autocomplete="new-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100" ${m.busy ? 'disabled' : ''}/>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Password again</label>
          <input id="initpw-confirm" type="password" autocomplete="new-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100" ${m.busy ? 'disabled' : ''}/>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button class="btn btn-gold" onclick="authDoSetInitialPassword()" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Saving…' : 'Set password &amp; continue'}</button>
      </div>
    </div>
  `;
}

async function authDoSetInitialPassword() {
  const pw      = document.getElementById('initpw-new')?.value;
  const confirm = document.getElementById('initpw-confirm')?.value;
  if (!pw || pw.length < 8)   return authSetAuthError('Password must be at least 8 characters.');
  if (pw !== confirm)         return authSetAuthError('Passwords do not match.');
  authSetAuthBusy(true);
  try {
    await authSetInitialPassword(pw);
    // Now route to the passphrase setup or unlock flow. For an invitee this
    // will be passphrase-setup (no remote row exists yet); for a recovery
    // user it could be either.
    await authStartUnlockOrSetup();
  } catch (e) {
    authSetAuthError(e && e.message ? e.message : String(e));
  }
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
      <div class="mt-3 text-center">
        <button class="text-[11px] text-amber-300/70 underline hover:text-amber-200" onclick="openAuth('forgot-password')" ${m.busy ? 'disabled' : ''}>Forgot password?</button>
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
          <input id="pp-new" type="password" autocomplete="new-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100" oninput="authUpdatePassphraseStrength(this.value)" ${m.busy ? 'disabled' : ''}/>
          <div class="mt-1.5">
            <div class="h-1 w-full rounded bg-amber-950/40 overflow-hidden">
              <div id="pp-strength-bar" class="h-full transition-all" style="width:0%;background:transparent"></div>
            </div>
            <p id="pp-strength-label" class="text-[11px] mt-1 text-amber-100/60">Different from your account password. Used only in your browser to encrypt your data.</p>
          </div>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-amber-300/80 block mb-1">Passphrase again</label>
          <input id="pp-new-confirm" type="password" autocomplete="new-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100" ${m.busy ? 'disabled' : ''}/>
        </div>
        <label class="flex items-start gap-2 text-xs text-amber-100/85 serif leading-relaxed">
          <input id="pp-consent" type="checkbox" class="mt-0.5" ${m.consent ? 'checked' : ''} onchange="authSetConsent(this.checked)" ${m.busy ? 'disabled' : ''}/>
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
          <input id="pp-unlock" type="password" autocomplete="current-password" class="w-full rounded-lg p-2 bg-amber-950/40 border border-amber-800/50 text-amber-100" ${m.busy ? 'disabled' : ''}/>
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

// v15.0 — Passphrase strength meter. Pure local; runs on every keystroke
// in the new-passphrase input. Score uses length + character variety
// (lowercase / uppercase / digit / symbol). No library, no zxcvbn — keeps
// the app dependency-free. The label tells the user what to add for the
// next tier so it's actionable instead of just judgmental.
function authUpdatePassphraseStrength(value) {
  const bar = document.getElementById('pp-strength-bar');
  const label = document.getElementById('pp-strength-label');
  if (!bar || !label) return;
  const v = value || '';
  if (v.length === 0) {
    bar.style.width = '0%';
    bar.style.background = 'transparent';
    label.textContent = 'Different from your account password. Used only in your browser to encrypt your data.';
    label.className = 'text-[11px] mt-1 text-amber-100/60';
    return;
  }
  const variety =
    (/[a-z]/.test(v) ? 1 : 0) +
    (/[A-Z]/.test(v) ? 1 : 0) +
    (/[0-9]/.test(v) ? 1 : 0) +
    (/[^a-zA-Z0-9]/.test(v) ? 1 : 0);
  let tier, color, msg, pct;
  if (v.length < 8) {
    tier = 'Too short';
    color = '#9ca3af';                                 // gray
    msg = 'At least 8 characters required.';
    pct = 15;
  } else if (v.length < 12 || variety < 2) {
    tier = 'Weak';
    color = '#dc2626';                                 // red
    msg = 'Add more characters or mix in upper/lower-case, numbers, symbols.';
    pct = 35;
  } else if (v.length < 16 || variety < 3) {
    tier = 'Decent';
    color = '#d4a857';                                 // gold/amber
    msg = 'Good. A few more characters or symbol variety would push it stronger.';
    pct = 65;
  } else {
    tier = 'Strong';
    color = '#16a34a';                                 // green
    msg = 'Strong. Remember: this passphrase is not recoverable.';
    pct = 100;
  }
  bar.style.width = pct + '%';
  bar.style.background = color;
  label.textContent = tier + ' — ' + msg;
  label.className = 'text-[11px] mt-1';
  label.style.color = color;
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
