
'use strict';

const CACHE_NAME = 'reitzel-v2';

const FILES = [
  './',
  './index.html',
  './style.css',
  './os.js',
  './assets/reitzel-icon.svg',
  './assets/folder-icon.svg',
  './assets/compass-settings-icon.svg',
  './assets/network-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept requests to other origins.
  if (url.origin !== self.location.origin) return;

  // Always fetch HTML and code from the network first.
  if (
    event.request.mode === 'navigate' ||
    /\.(?:html|js|css)$/i.test(url.pathname)
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;

          if (event.request.mode === 'navigate') {
            return (await caches.match('./index.html')) ||
              Response.error();
          }

          return Response.error();
        })
    );
    return;
  }

  // Use cached assets when available; fetch missing assets.
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
