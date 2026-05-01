/* ── YGO Tracker Service Worker ── */
const CACHE_NAME = 'ygo-tracker-v3';

// Core files to cache on install (relative paths work with GitHub Pages subpaths)
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon512.png',
];

// External resources to cache when first fetched
const CACHE_DOMAINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
];

// ── Install: cache core files ─────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: cache-first for fonts/static, network-first for API ─
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Never intercept POST or non-GET
  if (e.request.method !== 'GET') return;

  // Never intercept Anthropic API or YGOPRODeck API calls
  if (url.hostname === 'api.anthropic.com') return;
  if (url.hostname === 'db.ygoprodeck.com') return;

  // Card images: cache-first (they never change for a given ID)
  if (url.hostname === 'images.ygoprodeck.com') {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, clone);
            });
          }
          return response;
        }).catch(function() {
          return new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // Fonts + static CDN: cache-first
  var isCacheDomain = CACHE_DOMAINS.some(function(d) { return url.hostname.includes(d); });
  if (isCacheDomain) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
          }
          return response;
        });
      })
    );
    return;
  }

  // App shell: network-first, fallback to cache
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html') || url.pathname.endsWith('manifest.json')) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }
});
