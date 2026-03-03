// ================================================
// Service Worker - mito1 Digital Handbook v3
// 修正: Response.clone() を非同期処理の前に呼ぶ
// ================================================
const CACHE = 'mito1-v3';  // バージョン上げて古いキャッシュを強制削除
const BASE  = '/mito1-digital-studenthandbook';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (e.request.method !== 'GET') return;

  // Firebase / Workers API はバイパス
  if (url.includes('firestore.googleapis') ||
      url.includes('firebase') ||
      url.includes('workers.dev') ||
      url.includes('googleapis.com')) {
    return;
  }

  // /assets/ → キャッシュ優先（ハッシュ付きで不変）
  if (url.includes('/assets/')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(res => {
            if (res.ok) {
              const clone = res.clone(); // ★本体消費前にクローン
              cache.put(e.request, clone);
            }
            return res;
          });
        })
      )
    );
    return;
  }

  // HTML → ネットワーク優先（常に最新を取得）
  if (url.endsWith('.html') || url.endsWith('/') || url === BASE || url === BASE + '/') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone(); // ★本体消費前にクローン
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
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
        if (res.ok) {
          const clone = res.clone(); // ★本体消費前にクローン
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
