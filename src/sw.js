// ============================================================================
// src/sw.js · Service Worker for Adze
// ----------------------------------------------------------------------------
// Makes Adze installable + offline-capable. Three strategies:
//
//   1. App shell (HTML, JS, CSS, icon) — cache-first. Refetched in the
//      background; new versions land on next reload after a new sw.js
//      ships.
//   2. Content JSON / sutta files (under /content/) — network-first with
//      cache fallback. So content updates on reload but old content stays
//      readable offline.
//   3. Supabase API calls — network-only, never cached. The entire E2E
//      story depends on requests reaching Supabase fresh; caching them
//      would create stale-state bugs and complicate logout/lock flows.
//
// Bump CACHE_NAME on every release that ships JS/HTML/CSS changes (any
// v15.x bump qualifies). Old caches purged on activate.
// ============================================================================

const CACHE_NAME = 'adze-v15.11.4';

// Files explicitly precached on install. Keep small — the rest is cached
// lazily as the user navigates. If any item here 404s, the whole install
// fails, so list only files that are definitely present.
const PRECACHE = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                    // only cache reads

  const url = new URL(req.url);

  // Never cache Supabase or any non-same-origin auth/data calls.
  if (url.hostname.endsWith('.supabase.co') ||
      url.hostname.endsWith('.supabase.in')) {
    return; // browser handles network normally
  }

  // Cross-origin static assets (Tailwind CDN, Supabase JS SDK from
  // jsdelivr) — let the browser's own HTTP cache handle them. Don't
  // double-cache in the SW; the SDK URLs change per release anyway.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Same-origin /content/ — network-first so updates land.
  if (url.pathname.startsWith('/content/')) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Everything else same-origin — cache-first.
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(req);
  if (hit) {
    // Refresh in the background — best-effort, ignore failures.
    fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {});
    return hit;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    // Offline + not in cache. Return the cached index.html so SPA routing
    // still resolves to the app instead of a browser-default error page.
    const fallback = await cache.match('/index.html');
    if (fallback) return fallback;
    throw e;
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req);
    if (hit) return hit;
    throw e;
  }
}
