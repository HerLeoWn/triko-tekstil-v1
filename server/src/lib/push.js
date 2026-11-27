// Web Push: kayıtlı cihazlara sistem bildirimi gönderir
import webpush from 'web-push';
import { db } from '../db.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS push_abonelik (
    endpoint TEXT PRIMARY KEY,
    kullanici_id TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    tarih TEXT NOT NULL
  );
`);

const PUB = process.env.VAPID_PUBLIC_KEY || '';
const PRIV = process.env.VAPID_PRIVATE_KEY || '';
const SUBJ = process.env.VAPID_SUBJECT || 'mailto:yonetici@example.com';

export const vapidPublic = PUB || null;
const aktif = !!(PUB && PRIV);
if (aktif) webpush.setVapidDetails(SUBJ, PUB, PRIV);
else console.log('Uyarı: VAPID anahtarları tanımlı değil, push bildirimleri kapalı.');

export function aboneEkle(kullaniciId, sub) {
  db.prepare(`INSERT INTO push_abonelik (endpoint, kullanici_id, p256dh, auth, tarih) VALUES (?,?,?,?,?)
              ON CONFLICT(endpoint) DO UPDATE SET kullanici_id = excluded.kullanici_id,
              p256dh = excluded.p256dh, auth = excluded.auth`)
    .run(sub.endpoint, kullaniciId, sub.keys.p256dh, sub.keys.auth, new Date().toISOString());
}

export function aboneSil(endpoint) {
  db.prepare('DELETE FROM push_abonelik WHERE endpoint = ?').run(endpoint);
}

// Verilen kullanıcıların tüm cihazlarına gönderir. Süresi dolmuş abonelikleri temizler.
export function bildirimGonder(kullaniciIdleri, { baslik, metin, url = '/' }) {
  if (!aktif || !kullaniciIdleri.length) return;
  const payload = JSON.stringify({ baslik, metin, url });
  const satirlar = db.prepare(
    `SELECT * FROM push_abonelik WHERE kullanici_id IN (${kullaniciIdleri.map(() => '?').join(',')})`,
  ).all(...kullaniciIdleri);
  satirlar.forEach((s) => {
    webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 })
      .catch((e) => {
        if (e.statusCode === 404 || e.statusCode === 410) aboneSil(s.endpoint);
        else console.error('Push gönderilemedi:', e.statusCode ?? e.message);
      });
  });
}

// Aktif tüm depo sorumlularının cihazlarına
export function yoneticilereGonder(bilgi) {
  const ids = db.prepare("SELECT id FROM users WHERE rol = 'yonetici' AND aktif = 1").all().map((r) => r.id);
  bildirimGonder(ids, bilgi);
}