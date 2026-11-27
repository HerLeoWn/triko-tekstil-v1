// Service worker: uygulama kabuğunu önbelleğe alır. /api istekleri asla önbelleğe alınmaz.
// Ayrıca push bildirimlerini gösterir ve tıklanınca uygulamayı açar.
const CACHE = 'triko-v1';
const KABUK = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(KABUK)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((anahtarlar) => Promise.all(anahtarlar.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // canlı veri ve oturum her zaman ağdan

  // Sayfa açılışı: önce ağ (güncel sürüm), ağ yoksa önbellekteki kabuk
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const kopya = r.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', kopya));
          return r;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Diğer dosyalar (hashlenmiş Vite dosyaları dahil): önce önbellek, yoksa ağ
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
      if (r.ok) {
        const kopya = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, kopya));
      }
      return r;
    }))
  );
});

// Sunucudan gelen bildirim: sistem bildirimi olarak gösterilir (sekme kapalıyken de)
self.addEventListener('push', (e) => {
  let veri = {};
  try {
    veri = e.data ? e.data.json() : {};
  } catch {
    veri = { baslik: 'Triko', metin: e.data ? e.data.text() : '' };
  }
  e.waitUntil(self.registration.showNotification(veri.baslik || 'Triko', {
    body: veri.metin || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'triko-' + Date.now(),
    renotify: true,
    data: { url: veri.url || '/' },
  }));
});

// Bildirime tıklanınca açık uygulama sekmesine geçer, yoksa yeni pencere açar
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});