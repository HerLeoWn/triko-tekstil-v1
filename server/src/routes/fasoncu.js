// Fasoncu: gelen mal bildirimi, fasoncu konumu ve sabit depo konumu
import express from 'express';
import { db } from '../db.js';
import './mesajlar.js'; // mesajlar tablosu hazır olsun
import { uid, now, wrap, logH } from '../lib/yardimcilar.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS ayarlar (anahtar TEXT PRIMARY KEY, deger TEXT);
  CREATE TABLE IF NOT EXISTS gelen_mallar (
    id TEXT PRIMARY KEY,
    urun_ad TEXT NOT NULL,
    urun_kod TEXT,
    cuval INTEGER NOT NULL,
    toplam_seri INTEGER,
    gonderen_ad TEXT,
    durum TEXT NOT NULL DEFAULT 'bekliyor',
    tarih TEXT NOT NULL,
    girildi_tarih TEXT
  );
`);

// Artık kullanılmayan roller (çalışan, izleyici) kaldırıldı, bu roldeki hesaplar silinir
db.prepare("DELETE FROM users WHERE rol NOT IN ('yonetici','muhasebe','fasoncu')").run();

const router = express.Router();
let sonKonum = null; // fasoncunun son bildirdiği konum (bellekte tutulur)

const gecerliKonum = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const depoKonumu = () => {
  const r = db.prepare("SELECT deger FROM ayarlar WHERE anahtar = 'depo_konum'").get();
  return r ? JSON.parse(r.deger) : null;
};

/* ---------- Depo konumu (sabit) ---------- */

router.get('/api/konum/depo', wrap((req, res) => res.json(depoKonumu())));

router.put('/api/konum/depo', wrap((req, res) => {
  const lat = Number(req.body.lat), lng = Number(req.body.lng);
  if (!gecerliKonum(lat, lng)) throw new Error('Geçersiz konum.');
  db.prepare(`INSERT INTO ayarlar (anahtar, deger) VALUES ('depo_konum', ?)
              ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger`)
    .run(JSON.stringify({ lat, lng, tarih: now() }));
  logH('depo konumu kaydedildi', '', '', `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  res.json({ ok: true });
}));

/* ---------- Fasoncu konumu (canlı) ---------- */

router.post('/api/konum/fasoncu', wrap((req, res) => {
  const lat = Number(req.body.lat), lng = Number(req.body.lng);
  if (!gecerliKonum(lat, lng)) throw new Error('Geçersiz konum.');
  sonKonum = { lat, lng, ad: req.kullanici.ad, zaman: now() };
  res.json({ ok: true });
}));

router.get('/api/konum/fasoncu', wrap((req, res) => res.json(sonKonum)));

/* ---------- Gelen mallar ---------- */

const satirGelen = (r) => ({
  id: r.id,
  urunAd: r.urun_ad,
  urunKod: r.urun_kod ?? '',
  cuval: r.cuval,
  toplamSeri: r.toplam_seri,
  gonderenAd: r.gonderen_ad ?? '',
  durum: r.durum,
  tarih: r.tarih,
  girildiTarih: r.girildi_tarih,
});

router.get('/api/gelen-mallar', wrap((req, res) => {
  res.json(db.prepare('SELECT * FROM gelen_mallar ORDER BY tarih DESC LIMIT 100').all().map(satirGelen));
}));

// Fasoncu bildirir: kayıt oluşur ve muhasebeye mesaj düşer
router.post('/api/gelen-mallar', wrap((req, res) => {
  const urunAd = String(req.body.urunAd ?? '').trim();
  const urunKod = String(req.body.urunKod ?? '').trim();
  const cuval = parseInt(req.body.cuval, 10);
  const topRaw = String(req.body.toplamSeri ?? '').trim();
  const toplam = topRaw === '' ? null : parseInt(topRaw, 10);

  if (!urunAd) throw new Error('Ürün modelinin tam adını yazın.');
  if (!(cuval > 0)) throw new Error('Çuval sayısını girin.');
  if (toplam !== null && !(toplam > 0)) throw new Error('Toplam seri sayısı geçersiz.');

  const id = uid();
  const t = now();
  const icerik = [
    'Dışarıdan mal geliyor',
    `Ürün: ${urunAd}${urunKod ? ` (${urunKod})` : ''}`,
    `Çuval: ${cuval}`,
    ...(toplam ? [`Toplam: ${toplam} seri`] : []),
    `Bildiren: ${req.kullanici.ad}`,
  ].join('\n');

  db.transaction(() => {
    db.prepare(`INSERT INTO gelen_mallar (id, urun_ad, urun_kod, cuval, toplam_seri, gonderen_ad, durum, tarih)
                VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, urunAd, urunKod || null, cuval, toplam, req.kullanici.ad, 'bekliyor', t);
    db.prepare(`INSERT INTO mesajlar (id, tur, gonderen_id, gonderen_ad, alici_id, alici_rol, ref_gun, icerik, tarih)
                VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(uid(), 'gelen', null, req.kullanici.ad, null, 'muhasebe', null, icerik, t);
  })();

  logH('gelen mal bildirildi', urunKod, '', `${urunAd}: ${cuval} çuval`);
  res.status(201).json({ ok: true, id });
}));

// Muhasebe mal sisteme girdiğinde işaretler
router.post('/api/gelen-mallar/:id/girildi', wrap((req, res) => {
  const r = db.prepare('SELECT id FROM gelen_mallar WHERE id = ?').get(req.params.id);
  if (!r) throw new Error('Kayıt bulunamadı.');
  db.prepare("UPDATE gelen_mallar SET durum = 'girildi', girildi_tarih = ? WHERE id = ?").run(now(), r.id);
  res.json({ ok: true });
}));

export default router;