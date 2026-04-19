// ============================================================================
// src/systems/auth.js
// ----------------------------------------------------------------------------
// Stage 2. Supabase auth + session management for Adze.
//
// This module knows about accounts, sessions, and sign-in state. It deliberately
// does NOT know about encryption — the E2E passphrase is a separate secret,
// owned by systems/passphrase.js. Auth and passphrase have independent
// lifecycles: a user can be signed in but locked (no passphrase in memory),
// at which point local edits stay in localStorage and do not sync.
//
// Modes:
//   'local'  — no Supabase session; everything in localStorage.
//   'authed' — Supabase session present. Sync only fires once passphrase.js
//              has a key in memory (see syncIsActive()).
// ============================================================================

const ADZE_SUPABASE_URL = 'https://zpawwkvdgocsrwwalhxu.supabase.co';
const ADZE_SUPABASE_ANON_KEY = 'sb_publishable_qAjTHUyreUI9r9aUTgP8vw_HOibAJQn';

let _supabase = null;
let _authMode = 'local';
let _userId = null;
let _userEmail = null;
let _pendingPasswordSet = false;   // v15.0 — true after an invite or recovery
                                    // token has been verified and the user
                                    // has a session but no password yet.
let _pendingInviteToken = null;     // v15.9 — { token, type } when the URL
                                    // carries ?invite_token=...&type=...
                                    // and we're waiting for the user to
                                    // click the invite-landing button to
                                    // actually consume the token. This is
                                    // the prefetch-resistant flow.

function authGetMode() { return _authMode; }
function authGetEmail() { return _userEmail; }
function authGetUserId() { return _userId; }
function authGetClient() { return _supabase; }
function authHasPendingPasswordSet() { return _pendingPasswordSet; }
function authHasPendingInviteToken() { return _pendingInviteToken; }

async function authInit() {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('Supabase SDK not loaded — staying in local mode.');
    return;
  }

  // v15.0 — Capture the invite/recovery signal from the URL BEFORE creating
  // the Supabase client. With the implicit flow (default for our project),
  // Supabase's verify endpoint redirects back to our Site URL with tokens in
  // the URL HASH:
  //   https://adze.life/#access_token=X&refresh_token=Y&type=invite
  // The Supabase SDK's detectSessionInUrl=true auto-processes that hash and
  // strips it from the URL inside createClient(), so by the time the client
  // is built we can no longer see what type the email was. We read the hash
  // (and the query, defensively) here first to remember whether this load is
  // an invite/recovery — that drives the boot sequence to prompt for a
  // password set BEFORE asking the user for an encryption passphrase.
  let urlPasswordSetHint = false;
  try {
    const hashStr = (window.location.hash || '').replace(/^#/, '');
    const queryStr = (window.location.search || '').replace(/^\?/, '');
    const hashParams = new URLSearchParams(hashStr);
    const queryParams = new URLSearchParams(queryStr);
    const type = hashParams.get('type') || queryParams.get('type');
    if (type === 'invite' || type === 'recovery') {
      urlPasswordSetHint = true;
    }
  } catch (e) { /* if URL parsing throws, fall through; it's a hint only */ }

  _supabase = supabase.createClient(ADZE_SUPABASE_URL, ADZE_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });

  // v15.9 — Prefetch-resistant invite/recovery flow. Our custom Supabase
  // email templates emit a URL like:
  //   https://adze.life/?invite_token=XXX&type=invite
  //   https://adze.life/?invite_token=XXX&type=recovery
  // Adze itself is the landing page — instead of auto-verifying (which
  // would consume the token on every gmail / proxy / link-scanner
  // prefetch), we stash the token, signal the boot to open an invite-
  // landing modal, and only call verifyOtp when the user actually taps
  // the "Set up your account" button. The token survives prefetches
  // because nothing on this code path hits the verify endpoint.
  try {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite_token');
    const inviteType  = params.get('type');
    if (inviteToken && (inviteType === 'invite' || inviteType === 'recovery')) {
      _pendingInviteToken = { token: inviteToken, type: inviteType };
      // Don't strip the URL yet — keep it so a refresh re-opens the
      // landing modal. The token is consumed by authConsumeInviteToken
      // below; that call is the one that strips.
      return;
    }
  } catch (e) {
    console.warn('Adze invite-landing URL parse skipped:', e);
  }

  // Defensive PKCE-flow handling: if Supabase ever switches us to the newer
  // ?token_hash=...&type=invite query pattern, verify it here. Skipped if
  // the hint already says we're invite/recovery (the SDK auto-handles it).
  try {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const queryType = params.get('type');
    if (tokenHash && queryType && !urlPasswordSetHint) {
      const { data, error } = await _supabase.auth.verifyOtp({ token_hash: tokenHash, type: queryType });
      if (!error && data && data.session && data.session.user) {
        _userId = data.session.user.id;
        _userEmail = data.session.user.email;
        _authMode = 'authed';
        if (queryType === 'invite' || queryType === 'recovery') {
          _pendingPasswordSet = true;
        }
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return;
      }
      if (error) console.warn('Adze invite/recovery token verify failed:', error.message);
    }
  } catch (e) {
    console.warn('Adze PKCE URL processing skipped:', e);
  }

  // Rehydrate a session if one exists (either persisted from a prior login,
  // or freshly created by the SDK from the URL hash above). The passphrase
  // is NOT rehydrated — it lives only in memory. Bootstrap decides whether
  // to prompt unlock/setup.
  const { data: { session } } = await _supabase.auth.getSession();
  if (session && session.user) {
    _userId = session.user.id;
    _userEmail = session.user.email;
    _authMode = 'authed';
    if (urlPasswordSetHint) {
      _pendingPasswordSet = true;
    }
  }
}

// v15.0 — Set the user's password after invite/recovery flow. Clears the
// pending-password flag on success so the next boot doesn't re-prompt.
async function authSetInitialPassword(newPassword) {
  if (!_supabase) throw new Error('Supabase client not initialized');
  const { error } = await _supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  _pendingPasswordSet = false;
}

// v15.11 — Magic-link sign-in (Slack/Notion/Linear pattern).
// Step 1: request a code. Supabase emails an OTP (length set by the project's
// Auth → Email OTP Length setting; Adze runs at 8). Each request issues a
// fresh code; the previous code is invalidated. The
// allowlist trigger on auth.users (public.enforce_beta_allowlist) rejects
// any email that's not pre-approved, so only invited testers get a code.
async function authRequestMagicCode(email) {
  if (!_supabase) throw new Error('Supabase client not initialized');
  if (!email) throw new Error('Email is required.');
  const cleanEmail = String(email).trim().toLowerCase();
  const { error } = await _supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: { shouldCreateUser: true }
  });
  if (error) {
    // Enumeration-oracle mitigation. The beta_allowlist trigger (P0001)
    // raises a distinct "not on the invite list" message for any address
    // not pre-approved. Surfacing that verbatim lets anyone probe who is
    // in the closed beta (and by extension, harvest tester emails). Treat
    // trigger-rejection as silent success — the allowed path and the
    // rejected path produce the same UX ("code on its way"); non-invited
    // probers learn nothing. Other errors (real send failures, rate
    // limits, Supabase 5xx) get a single generic message so neither the
    // existence of the email nor the nature of the failure leaks.
    const msg = (error.message || '').toLowerCase();
    const isAllowlistRejection =
      msg.includes('invite list') ||
      msg.includes('closed beta') ||
      error.code === 'P0001';
    if (isAllowlistRejection) return;
    throw new Error('Could not send the sign-in code. Please try again in a moment.');
  }
}

// Step 2: verify the code. Creates the session; allowlist trigger has
// already fired by now (it fires on user insert, which happens at the
// first verify).
async function authVerifyMagicCode(email, code) {
  if (!_supabase) throw new Error('Supabase client not initialized');
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim().replace(/\s/g, '');
  // v15.11.2 — accept any reasonable code length. Supabase's default OTP
  // length is 6, but projects can configure 4–10. A hardcoded 6 was
  // rejecting Dirk's 8-digit production codes client-side.
  if (!/^\d{4,10}$/.test(cleanCode)) {
    throw new Error('The code should be the digits from your email.');
  }
  // v15.11.2 — Supabase routes signInWithOtp differently based on whether
  // the email already exists: new user → 'signup' / 'magiclink', existing
  // user (pre-confirmed) → 'recovery'. The error "token has expired or is
  // invalid" is returned for a VALID token with the wrong type, not just
  // for real expiry — so the only reliable path is to try each type until
  // one works. Failed attempts don't consume the token.
  const attempts = ['email', 'magiclink', 'recovery', 'signup'];
  let lastError = null;
  for (const type of attempts) {
    const { data, error } = await _supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type
    });
    if (!error && data && data.session && data.session.user) {
      _userId = data.session.user.id;
      _userEmail = data.session.user.email;
      _authMode = 'authed';
      return;
    }
    lastError = error;
  }
  throw new Error(
    (lastError && lastError.message) ||
    'That code is not valid. Try again or request a new one.'
  );
}

// v15.10 — Verify a one-time code the user typed in manually.
// This is the prefetch-proof flow: nothing happens server-side until the
// human types the code into the app. Type is 'invite' for new-tester
// invitations; 'recovery' for password resets; 'email' for magic-link
// signup if we ever enable that.
//
// v15.13.2 — accept 4–10 digit codes (matches authVerifyMagicCode and
// Supabase's configurable Email-OTP-Length range). Hardcoded 6 was wrong
// for projects that bumped Supabase's OTP length (Adze runs at 8).
async function authVerifyEmailOtp(email, token, type) {
  if (!_supabase) throw new Error('Supabase client not initialized');
  if (!email || !token) throw new Error('Email and code are required.');
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanToken = String(token).trim().replace(/\s/g, '');
  if (!/^\d{4,10}$/.test(cleanToken)) throw new Error('The code should be the digits from your email.');
  const { data, error } = await _supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: type || 'invite'
  });
  if (error) {
    throw new Error(error.message || 'That code is not valid. Check your email and try again, or ask for a new invite.');
  }
  if (!data || !data.session || !data.session.user) {
    throw new Error('Verification did not return a session. Please ask for a fresh invite.');
  }
  _userId = data.session.user.id;
  _userEmail = data.session.user.email;
  _authMode = 'authed';
  // Invite-type verifications land the user with a session but no password.
  // Recovery-type too — they want to change the password. Both route to the
  // set-initial-password modal via _pendingPasswordSet.
  if (type === 'invite' || type === 'recovery') {
    _pendingPasswordSet = true;
  }
}

// v15.9 — Consume the pending invite/recovery token. Called from the
// invite-landing modal when the user clicks "Set up your account". This is
// the moment the token is actually spent — gmail / proxy / scanner
// prefetches don't reach this code path because they only fetch the
// landing HTML, never the verify endpoint.
async function authConsumeInviteToken() {
  if (!_supabase) throw new Error('Supabase client not initialized');
  if (!_pendingInviteToken) throw new Error('No pending invite token.');
  const { token, type } = _pendingInviteToken;
  const { data, error } = await _supabase.auth.verifyOtp({ token_hash: token, type });
  if (error) {
    // Token already used (likely a real prior click) or expired.
    throw new Error(error.message || 'This invitation link has expired or already been used. Please ask for a fresh invite.');
  }
  if (!data || !data.session || !data.session.user) {
    throw new Error('Verification did not return a session. Please ask for a fresh invite.');
  }
  _userId = data.session.user.id;
  _userEmail = data.session.user.email;
  _authMode = 'authed';
  _pendingPasswordSet = true;
  _pendingInviteToken = null;
  // Strip query params so a refresh doesn't re-trigger the landing modal
  // (the token is now consumed; a second click would error).
  try {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  } catch (e) { /* ignore */ }
}

async function authSignUp(email, password) {
  if (!_supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await _supabase.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('Signup did not return a user.');
  // If email confirmation is enabled, signUp returns a user with no session.
  // Tell the user clearly instead of leaving them half-authenticated.
  if (!data.session) {
    throw new Error('Account created — check your email for a confirmation link, then come back and sign in.');
  }
  _userId = data.user.id;
  _userEmail = data.user.email;
  _authMode = 'authed';
  return data.user;
}

async function authSignIn(email, password) {
  if (!_supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  _userId = data.user.id;
  _userEmail = data.user.email;
  _authMode = 'authed';
  return data.user;
}

async function authSignOut() {
  // v15.15.7 — flush any pending debounced state push BEFORE we revoke
  // the JWT or lock the passphrase. If we don't, a user who edits state
  // and immediately signs out loses the last ≤2 seconds of edits (the
  // JWT is gone → push fails RLS; the key is gone → can't re-encrypt).
  // Closes Fleet Review Blocker #3 (sync-lifecycle trio, 1 of 3).
  if (typeof saveStateFlush === 'function') {
    try { await saveStateFlush(); } catch (e) { /* don't block sign-out on a flush failure */ }
  }
  if (_supabase) {
    try { await _supabase.auth.signOut(); } catch (e) { /* ignore */ }
  }
  if (typeof passphraseLock === 'function') passphraseLock();
  _userId = null;
  _userEmail = null;
  _authMode = 'local';
  // v15.15.5 — clear plaintext residue. Previously authSignOut only locked
  // the passphrase key and nulled the auth handles, leaving the most-recent
  // decrypted state in localStorage. A user on a shared browser who signed
  // out left their practice data visible to the next person to open Adze in
  // that browser profile. Mirror the authDeleteAccount cleanup so sign-out
  // means sign-out everywhere on this device. Data is safe in the Supabase
  // ciphertext; sign-in + passphrase-unlock restores it.
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  state = (typeof newState === 'function') ? newState() : null;
  view.modal = null;
  view.currentMember = null;
}

async function authResetPassword(email) {
  if (!_supabase) throw new Error('Supabase client not initialized');
  const { error } = await _supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

// v15.6 — Hard-delete the current user's account (GDPR right to erasure).
// Calls the `delete-account` Edge Function, which uses service-role to
// remove the auth.users row; user_state cascades via FK. Then clears
// every trace from this device: signs out the Supabase session, locks the
// passphrase, drops localStorage, and resets the in-memory state. The
// caller is responsible for re-rendering after this resolves.
async function authDeleteAccount() {
  if (!_supabase) throw new Error('Supabase client not initialized');
  if (_authMode !== 'authed' || !_userId) throw new Error('You are not signed in.');
  const { data, error } = await _supabase.functions.invoke('delete-account', {
    method: 'POST'
  });
  if (error) throw error;
  if (!data || !data.success) throw new Error((data && data.error) || 'Server did not confirm the deletion.');
  // Server side is gone. Now clean up locally.
  try { await _supabase.auth.signOut(); } catch (e) { /* ignore */ }
  if (typeof passphraseLock === 'function') passphraseLock();
  _userId = null;
  _userEmail = null;
  _authMode = 'local';
  // Drop the in-browser cache so a refresh doesn't resurrect anything.
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  // Reset in-memory state to a fresh slate. The caller (deletion modal)
  // will re-render which will re-show the welcome screen.
  state = (typeof newState === 'function') ? newState() : null;
  view.modal = null;
  view.setupStep = 0;
  view.setupData = {};
  view.currentMember = null;
}
