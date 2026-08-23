// Service Worker for Amy English Platform
// NETWORK-FIRST strategy: always fetch the latest code from server.
// Cache is only a fallback for offline use. This guarantees bug fixes
// reach every device immediately (previous cache-first strategy kept
// serving old app.js forever, which is why fixes "never worked").
var CACHE_NAME = 'amy-english-v50';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        './',
        './index.html',
        './app.js',
        './api.js',
        './recorder.js',
        './data.js',
        './cloud.js',
        './icon.svg',
        './photo.jpeg',
        './students.jpeg',
        './manifest.json'
      ]);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  // Skip cross-origin requests (TTS APIs, cloud sync)
  if (url.origin !== location.origin) {
    return;
  }
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request).then(function(response) {
      // Success: update cache with the fresh copy, return it
      if (response && response.status === 200) {
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
      }
      return response;
    }).catch(function() {
      // Network failed (offline): fall back to cache
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        // Offline fallback for page navigation
        if (event.request.mode === 'navigate' || event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        throw new Error('offline and not cached');
      });
    })
  );
});
