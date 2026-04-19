// ============================================================================
// src/systems/passphrase.js
// ----------------------------------------------------------------------------
// Stage 2. End-to-end encryption passphrase lifecycle.
//
// The passphrase is a SEPARATE secret from the Supabase account password. It
// never leaves the browser. PBKDF2 derives a non-extractable AES-GCM key from
// passphrase + per-user salt; the key and salt live only in this module's
// closure. Nothing is persisted to localStorage, window, or anywhere else.
//
// Lose the passphrase = lose the ciphertext. The account survives; users can
// call passphraseReset() to wipe the row and start over with a new passphrase.
//
// Lifecycle:
//   - passphraseSet(pass)    — new user or reset flow. Generates salt, derives
//                              key, encrypts the current in-memory state, and
//                              upserts the first user_state row.
//   - passphraseUnlock(pass) — returning user on this or a fresh device.
//                              Pulls the stored salt + ciphertext, derives the
//                              candidate key, and verifies it by decrypting.
//                              Throws "doesn't match" on wrong passphrase.
//   - passphraseLock()       — wipe the in-memory key (sign out, explicit lock).
//   - passphraseReset(pass)  — delete the ciphertext row and run passphraseSet.
//                              Used when the user has forgotten the passphrase
//                              and accepts that synced data is gone.
//
// Sync is active only when Supabase is authed AND a passphrase key is loaded.
// syncIsActive() is the single gate state.js uses to decide whether to push.
// ============================================================================

let _passKey = null;
let _passSalt = null;

// Stable per-tab id so sibling tabs can tell each other's BroadcastChannel
// messages from their own echo. See state.js cross-tab guard.
const _tabId = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
let _bc = null;
if (typeof BroadcastChannel !== 'undefined') {
  try { _bc = new BroadcastChannel('adze'); } catch (e) { _bc = null; }
}

function syncGetTabId() { return _tabId; }

function passphraseIsUnlocked() { return !!_passKey; }

function syncIsActive() {
  return typeof authGetMode === 'function'
    && authGetMode() === 'authed'
    && passphraseIsUnlocked();
}

async function passphraseRemoteExists() {
  const client = authGetClient();
  const userId = authGetUserId();
  if (!client || !userId) return false;
  const { data, error } = await client
    .from('user_state')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function passphraseSet(pass) {
  const client = authGetClient();
  const userId = authGetUserId();
  if (!client || !userId) throw new Error('Not signed in.');
  _passSalt = cryptoGenerateSalt();
  _passKey = await cryptoDeriveKey(pass, _passSalt);
  // Seed the first row with whatever state is currently in memory (may be an
  // anonymous-mode state the user already built up pre-signup).
  const seed = (typeof state !== 'undefined' && state) ? state : (typeof newState === 'function' ? newState() : {});
  await passphrasePushState(seed);
}

async function passphraseUnlock(pass) {
  const client = authGetClient();
  const userId = authGetUserId();
  if (!client || !userId) throw new Error('Not signed in.');
  const { data, error } = await client
    .from('user_state')
    .select('salt, ciphertext')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.salt || !data.ciphertext) {
    throw new Error('No encrypted data on the server yet — use "Set up passphrase" to create one.');
  }
  const salt = base64ToBytes(data.salt);
  const candidate = await cryptoDeriveKey(pass, salt);
  try {
    await cryptoDecrypt(data.ciphertext, candidate);
  } catch (e) {
    throw new Error('That passphrase doesn\'t match the one used to encrypt your data.');
  }
  _passSalt = salt;
  _passKey = candidate;
}

function passphraseLock() {
  _passKey = null;
  _passSalt = null;
}

async function passphraseReset(pass) {
  const client = authGetClient();
  const userId = authGetUserId();
  if (!client || !userId) throw new Error('Not signed in.');
  const { error: delErr } = await client.from('user_state').delete().eq('user_id', userId);
  if (delErr) throw delErr;
  await passphraseSet(pass);
}

async function passphrasePullState() {
  if (!passphraseIsUnlocked()) return null;
  const client = authGetClient();
  const userId = authGetUserId();
  if (!client || !userId) return null;
  const { data, error } = await client
    .from('user_state')
    .select('ciphertext')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data || !data.ciphertext) return null;
  const plaintext = await cryptoDecrypt(data.ciphertext, _passKey);
  return JSON.parse(plaintext);
}

async function passphrasePushState(st) {
  if (!_passKey || !_passSalt) throw new Error('Passphrase not set.');
  const client = authGetClient();
  const userId = authGetUserId();
  if (!client || !userId) throw new Error('Not signed in.');
  const ciphertext = await cryptoEncrypt(JSON.stringify(st), _passKey);
  const pushedAt = new Date().toISOString();
  const { error } = await client
    .from('user_state')
    .upsert({
      user_id: userId,
      ciphertext,
      salt: bytesToBase64(_passSalt),
      updated_at: pushedAt
    });
  if (error) throw error;
  // Tell sibling tabs this device's in-memory state just advanced. They'll
  // refuse their own further pushes until reload. Best-effort — channel may
  // be unavailable in some embedded contexts; silent no-op then.
  if (_bc) {
    try { _bc.postMessage({ type: 'pushed', tabId: _tabId, at: pushedAt }); } catch (e) {}
  }
}
