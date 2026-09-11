// ================================================
// Service Worker - mito1 Digital Handbook v4
// v4: Web Push対応（push / notificationclick追加）
// 修正: Response.clone() を非同期処理の前に呼ぶ
// ================================================
const CACHE = 'mito1-v4';  // バージョン上げて古いキャッシュを強制削除
const BASE  = '';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ================================================
// Web Push 受信 → 通知表示（iPhone PWA含む）
// Workers の POST /push/send から配信される。
// payload: { title, body, url, tag }
// ================================================
self.addEventListener('push', e => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : '' };
  }

  const title = data.title || '水一手帳';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'mito1-notify',
    renotify: true,
    data: { url: data.url || '/' },
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// 通知タップ → アプリを開く／フォーカス
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url).catch(() => {});
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (e.request.method !== 'GET') return;

  // http/https以外（chrome-extension等）はバイパス
  if (!url.startsWith('http')) return;

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
