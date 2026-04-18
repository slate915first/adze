// ============================================================================
// src/systems/crypto.js
// ----------------------------------------------------------------------------
// Stage 2. Web Crypto wrappers for client-side end-to-end encryption.
//
// Algorithm: PBKDF2-SHA256 (600,000 iterations, OWASP 2026) derives a
// non-extractable 256-bit AES-GCM key from the user's password + per-user
// salt. AES-GCM encrypt/decrypt produce IV || ciphertext blobs that are
// base64-encoded for transport/storage.
//
// Pure functions. No state. Zero third-party deps — Web Crypto only.
// ============================================================================

function cryptoGenerateSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

async function cryptoDeriveKey(password, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function cryptoEncrypt(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(iv.byteLength + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), iv.byteLength);
  return bytesToBase64(combined);
}

async function cryptoDecrypt(blob, key) {
  const combined = base64ToBytes(blob);
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

function bytesToBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function base64ToBytes(b64) {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}
