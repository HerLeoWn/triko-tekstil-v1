// Mesajlar (herkese ya da tek kişiye) ve giden bildirimleri (muhasebe rolüne).
// Tablolar bu dosya yüklenince yoksa oluşturulur.
import express from 'express';
import { db } from '../db.js';
import { wrap, uid, now } from '../lib/yardimcilar.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS mesajlar (
    id TEXT PRIMARY KEY,
    tur TEXT NOT NULL DEFAULT 'mesaj',
    gonderen_id TEXT,
    gonderen_ad TEXT,
    alici_id TEXT,
    alici_rol TEXT,
    ref_gun TEXT,
    icerik TEXT NOT NULL,
    tarih TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mesaj_okundu (
    mesaj_id TEXT NOT NULL,
    kullanici_id TEXT NOT NULL,
    PRIMARY KEY (mesaj_id, kullanici_id)
  );
`);

const router = express.Router();

// Bir kullanıcıya görünen mesajlar: herkese, kendisine, rolüne ya da kendi gönderdikleri
const GORUNUR = `((m.alici_id IS NULL AND m.alici_rol IS NULL) OR m.alici_id = ? OR m.alici_rol = ? OR m.gonderen_id = ?)`;
const gorunurParams = (u) => [u.id, u.rol, u.id];

const bugunAnahtari = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Giden kaydı girildiğinde muhasebe rolüne bildirim düşer (giden.js çağırır)
export function gidenBildirimi({ gonderen, kod, depo, satirlar }) {
  const ozet = satirlar.map((s) => `${s.renk} ${s.seri}`).join(', ');
  db.prepare(`INSERT INTO mesajlar (id, tur, gonderen_id, gonderen_ad, alici_id, alici_rol, ref_gun, icerik, tarih)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(uid(), 'giden', gonderen?.id ?? null, gonderen?.ad ?? 'Sistem', null, 'muhasebe',
      bugunAnahtari(), `${kod} · ${depo}: ${ozet}`, now());
}

// Listele: en yeni 200 mesaj ve okunmamış sayısı
router.get('/api/mesajlar', wrap((req, res) => {
  const u = req.kullanici;
  const rows = db.prepare(`
    SELECT m.*, EXISTS (SELECT 1 FROM mesaj_okundu o WHERE o.mesaj_id = m.id AND o.kullanici_id = ?) AS okundu_mu
    FROM mesajlar m
    WHERE ${GORUNUR}
    ORDER BY m.tarih DESC
    LIMIT 200`).all(u.id, ...gorunurParams(u));

  const liste = rows.map((m) => ({
    id: m.id,
    tur: m.tur,
    gonderen_id: m.gonderen_id,
    gonderen_ad: m.gonderen_ad,
    alici_id: m.alici_id,
    alici_rol: m.alici_rol,
    ref_gun: m.ref_gun,
    icerik: m.icerik,
    tarih: m.tarih,
    okundu: !!m.okundu_mu,
    benim: m.gonderen_id === u.id,
  }));
  res.json({ liste, okunmamis: liste.filter((m) => !m.okundu && !m.benim).length });
}));

// Yeni mesaj: aliciId boşsa herkese, doluysa tek kişiye
router.post('/api/mesajlar', wrap((req, res) => {
  const icerik = String(req.body.icerik ?? '').trim();
  if (!icerik) throw new Error('Mesaj boş olamaz.');
  if (icerik.length > 500) throw new Error('Mesaj en fazla 500 karakter olabilir.');

  const aliciId = req.body.aliciId ? String(req.body.aliciId) : null;
  if (aliciId && !db.prepare('SELECT id FROM users WHERE id = ?').get(aliciId)) {
    throw new Error('Alıcı bulunamadı.');
  }

  db.prepare(`INSERT INTO mesajlar (id, tur, gonderen_id, gonderen_ad, alici_id, alici_rol, ref_gun, icerik, tarih)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(uid(), 'mesaj', req.kullanici.id, req.kullanici.ad, aliciId, null, null, icerik, now());
  res.status(201).json({ ok: true });
}));

// Görünen bütün mesajları okundu işaretle
router.post('/api/mesajlar/hepsini-okundu', wrap((req, res) => {
  const u = req.kullanici;
  const ids = db.prepare(`SELECT m.id FROM mesajlar m WHERE ${GORUNUR}`).all(...gorunurParams(u));
  const ekle = db.prepare('INSERT OR IGNORE INTO mesaj_okundu (mesaj_id, kullanici_id) VALUES (?,?)');
  db.transaction(() => ids.forEach((r) => ekle.run(r.id, u.id)))();
  res.json({ ok: true });
}));

// Mesaj gönderilebilecek aktif kullanıcılar (kendisi hariç)
router.get('/api/mesaj-alicilar', wrap((req, res) => {
  res.json(db.prepare('SELECT id, ad, rol FROM users WHERE aktif = 1 AND id <> ? ORDER BY ad')
    .all(req.kullanici.id));
}));

export default router;