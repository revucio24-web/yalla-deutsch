/* global self, caches, fetch, URL */
const CACHE_PREFIX = 'yalla-deutsch-';
const CACHE_NAME = 'yalla-deutsch-v3';
// The production build fills this list with the exact files emitted by Vite.
const BUILD_ASSETS = [];
const APP_SCOPE = new URL(self.registration.scope);
const scopePath = APP_SCOPE.pathname.endsWith('/') ? APP_SCOPE.pathname : `${APP_SCOPE.pathname}/`;
const APP_INDEX = new URL('./index.html', APP_SCOPE).href;
const APP_SHELL = [...new Set([
  './', './index.html', './manifest.webmanifest', './icon.svg',
  './icon-192.png', './icon-512.png', ...BUILD_ASSETS,
])];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET'
    || url.origin !== APP_SCOPE.origin
    || !url.pathname.startsWith(scopePath)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.status === 200 && response.type === 'basic') {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return await cache.match(request) || await cache.match(APP_INDEX);
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
