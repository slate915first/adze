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

function authGetMode() { return _authMode; }
function authGetEmail() { return _userEmail; }
function authGetUserId() { return _userId; }
function authGetClient() { return _supabase; }

async function authInit() {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.warn('Supabase SDK not loaded — staying in local mode.');
    return;
  }
  _supabase = supabase.createClient(ADZE_SUPABASE_URL, ADZE_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  // Rehydrate a session if one exists. The passphrase is NOT rehydrated — it
  // lives only in memory. Bootstrap decides whether to prompt unlock/setup.
  const { data: { session } } = await _supabase.auth.getSession();
  if (session && session.user) {
    _userId = session.user.id;
    _userEmail = session.user.email;
    _authMode = 'authed';
  }
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
  if (_supabase) {
    try { await _supabase.auth.signOut(); } catch (e) { /* ignore */ }
  }
  if (typeof passphraseLock === 'function') passphraseLock();
  _userId = null;
  _userEmail = null;
  _authMode = 'local';
}

async function authResetPassword(email) {
  if (!_supabase) throw new Error('Supabase client not initialized');
  const { error } = await _supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
