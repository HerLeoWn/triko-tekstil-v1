// Service worker: uygulama kabuğunu önbelleğe alır. /api istekleri asla önbelleğe alınmaz.
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