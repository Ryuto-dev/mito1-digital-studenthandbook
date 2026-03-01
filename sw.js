const CACHE = 'mito1-handbook-v1';
const BASE  = '/mito1-digital-studenthandbook';

const PRECACHE = [
  BASE + '/',
  BASE + '/index.html',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Firebase・AI APIはキャッシュしない
  if (e.request.url.includes('firestore') ||
      e.request.url.includes('firebase') ||
      e.request.url.includes('workers.dev') ||
      e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // HTMLとJSのみキャッシュ
        if (res.ok && (
          e.request.url.includes(BASE) &&
          (e.request.url.endsWith('.js') || e.request.url.endsWith('.html') || e.request.url.endsWith('.css'))
        )) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(BASE + '/'));
    })
  );
});
