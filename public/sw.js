// ================================================
// Service Worker - mito1 Digital Handbook
// 戦略:
//   index.html      → ネットワーク優先（Viteのハッシュ変更に追従）
//   /assets/* (JS/CSS) → キャッシュ優先（ハッシュ付きで不変）
//   その他          → ネットワーク優先
// ================================================
const CACHE = 'mito1-v2';
const BASE  = '/mito1-digital-studenthandbook';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  // 古いバージョンのキャッシュをすべて削除
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // GETのみ対象
  if (e.request.method !== 'GET') return;

  // Firebase / Workers API はSWをバイパス
  if (url.includes('firestore.googleapis') ||
      url.includes('firebase') ||
      url.includes('workers.dev') ||
      url.includes('googleapis.com')) {
    return;
  }

  // /assets/ 配下のハッシュ付きファイル → キャッシュ優先
  // (ハッシュが変われば別URLなので古い版が返ることはない)
  if (url.includes('/assets/')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // index.html → ネットワーク優先（必ず最新を取得してキャッシュ更新）
  if (url.endsWith('.html') || url.endsWith('/') || url === BASE || url === BASE + '/') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE).then(cache => cache.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // その他 → ネットワーク優先、失敗時キャッシュ
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) caches.open(CACHE).then(cache => cache.put(e.request, res.clone()));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
