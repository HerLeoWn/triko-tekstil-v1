// Fasoncu: kalemli gelen mal bildirimi, muhasebe onayı, rotasyonlar, bildirimler ve canlı konum
import express from 'express';
import { db } from '../db.js';
import './mesajlar.js'; // mesajlar tablosu hazır olsun
import { uid, now, wrap, logH } from '../lib/yardimcilar.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS ayarlar (anahtar TEXT PRIMARY KEY, deger TEXT);
  CREATE TABLE IF NOT EXISTS gelen_mal (
    id TEXT PRIMARY KEY,
    gonderen_id TEXT,
    gonderen_ad TEXT,
    durum TEXT NOT NULL DEFAULT 'bekliyor',
    not_metni TEXT,
    tarih TEXT NOT NULL,
    onay_tarih TEXT
  );
  CREATE TABLE IF NOT EXISTS gelen_mal_kalem (
    id TEXT PRIMARY KEY,
    gelen_id TEXT NOT NULL,
    sira INTEGER NOT NULL,
    urun_ad TEXT NOT NULL,
    urun_kod TEXT,
    renk TEXT NOT NULL,
    cuval INTEGER NOT NULL,
    toplam_seri INTEGER
  );
  CREATE TABLE IF NOT EXISTS fasoncu_bildirim (
    id TEXT PRIMARY KEY,
    alici_id TEXT NOT NULL,
    metin TEXT NOT NULL,
    tur TEXT,
    ref_id TEXT,
    okundu INTEGER NOT NULL DEFAULT 0,
    tarih TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS fasoncu_rota (
    id TEXT PRIMARY KEY,
    fasoncu_id TEXT NOT NULL,
    ad TEXT NOT NULL,
    duraklar TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'aktif',
    son_ziyaret_gun TEXT,
    soru_gun TEXT,
    alindi_gun TEXT,
    cikis_gun TEXT,
    tarih TEXT NOT NULL
  );
`);

// Artık kullanılmayan roller (çalışan, izleyici) kaldırıldı. Bu roldeki hesaplar silinir.
try {
  db.prepare("DELETE FROM users WHERE rol NOT IN ('yonetici','muhasebe','fasoncu')").run();
} catch (e) {
  console.error('Eski roller temizlenemedi:', e.message);
}

const router = express.Router();
let sonKonum = null; // fasoncunun son bildirdiği konum (bellekte)

const gecerliKonum = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// Türkiye saatine göre bugünün tarihi (YYYY-MM-DD)
const gun = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());

const depoKonumu = () => {
  const r = db.prepare("SELECT deger FROM ayarlar WHERE anahtar = 'depo_konum'").get();
  return r ? JSON.parse(r.deger) : null;
};

const kalemYazi = (k) =>
  `${k.urunAd}${k.urunKod ? ` (${k.urunKod})` : ''} · ${k.renk} · ${k.cuval} çuval${k.toplam ? ` · ${k.toplam} seri` : ''}`;

const bildirimEkle = (aliciId, metin, tur, refId) => {
  if (!aliciId) return;
  db.prepare('INSERT INTO fasoncu_bildirim (id, alici_id, metin, tur, ref_id, okundu, tarih) VALUES (?,?,?,?,?,0,?)')
    .run(uid(), aliciId, metin, tur, refId ?? null, now());
};

const muhasebeyeMesaj = (icerik, gonderenAd) =>
  db.prepare(`INSERT INTO mesajlar (id, tur, gonderen_id, gonderen_ad, alici_id, alici_rol, ref_gun, icerik, tarih)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(uid(), 'gelen', null, gonderenAd, null, 'muhasebe', null, icerik, now());

function kalemleriDogrula(girdi) {
  if (!Array.isArray(girdi) || girdi.length === 0) throw new Error('En az bir kalem girin.');
  if (girdi.length > 30) throw new Error('Bir bildirimde en fazla 30 kalem olabilir.');
  return girdi.map((k, i) => {
    const no = i + 1;
    const urunAd = String(k?.urunAd ?? '').trim();
    const urunKod = String(k?.urunKod ?? '').trim();
    const renk = String(k?.renk ?? '').trim();
    const cuval = parseInt(k?.cuval, 10);
    const topRaw = String(k?.toplamSeri ?? '').trim();
    const toplam = topRaw === '' ? null : parseInt(topRaw, 10);
    if (!urunAd) throw new Error(`${no}. kalemde ürün modeli eksik.`);
    if (!renk) throw new Error(`${no}. kalemde renk eksik.`);
    if (!(cuval > 0)) throw new Error(`${no}. kalemde çuval sayısı eksik.`);
    if (toplam !== null && !(toplam > 0)) throw new Error(`${no}. kalemde toplam seri geçersiz.`);
    return { urunAd, urunKod: urunKod || null, renk, cuval, toplam };
  });
}

const baslikBul = (id) => {
  const b = db.prepare('SELECT * FROM gelen_mal WHERE id = ?').get(id);
  if (!b) throw new Error('Kayıt bulunamadı.');
  return b;
};

const kalemOzet = (gelenId) =>
  db.prepare('SELECT * FROM gelen_mal_kalem WHERE gelen_id = ? ORDER BY sira').all(gelenId)
    .map((k) => kalemYazi({ urunAd: k.urun_ad, urunKod: k.urun_kod, renk: k.renk, cuval: k.cuval, toplam: k.toplam_seri }))
    .join('; ');

function gelenListesi(sorgu, params) {
  const ks = db.prepare('SELECT * FROM gelen_mal_kalem WHERE gelen_id = ? ORDER BY sira');
  return db.prepare(sorgu).all(...params).map((b) => ({
    id: b.id,
    gonderenAd: b.gonderen_ad ?? '',
    durum: b.durum,
    not: b.not_metni ?? '',
    tarih: b.tarih,
    onayTarih: b.onay_tarih,
    kalemler: ks.all(b.id).map((k) => ({
      id: k.id,
      urunAd: k.urun_ad,
      urunKod: k.urun_kod ?? '',
      renk: k.renk,
      cuval: k.cuval,
      toplamSeri: k.toplam_seri,
    })),
  }));
}

const duraklariDogrula = (girdi) => {
  if (!Array.isArray(girdi) || girdi.length < 1) throw new Error('En az bir durak ekleyin.');
  if (girdi.length > 20) throw new Error('Bir rotada en fazla 20 durak olabilir.');
  return girdi.map((d) => {
    const lat = Number(d?.lat), lng = Number(d?.lng);
    if (!gecerliKonum(lat, lng)) throw new Error('Durak konumu geçersiz.');
    return { ad: String(d.ad ?? 'Durak').slice(0, 120), lat, lng };
  });
};

const rotaBul = (id, userId) => {
  const r = db.prepare('SELECT * FROM fasoncu_rota WHERE id = ? AND fasoncu_id = ?').get(id, userId);
  if (!r) throw new Error('Rotasyon bulunamadı.');
  return r;
};

const rotaSatir = (r) => ({
  id: r.id,
  ad: r.ad,
  duraklar: JSON.parse(r.duraklar),
  durum: r.durum,
  sonZiyaretGun: r.son_ziyaret_gun,
  soruGun: r.soru_gun,
  alindiGun: r.alindi_gun,
  cikisGun: r.cikis_gun,
});

/* ---------- Depo konumu (muhasebenin ETA hesabı için) ---------- */

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

/* ---------- Fasoncu canlı konumu ---------- */

router.post('/api/konum/fasoncu', wrap((req, res) => {
  const lat = Number(req.body.lat), lng = Number(req.body.lng);
  if (!gecerliKonum(lat, lng)) throw new Error('Geçersiz konum.');
  sonKonum = { lat, lng, ad: req.kullanici.ad, zaman: now() };
  res.json({ ok: true });
}));

router.get('/api/konum/fasoncu', wrap((req, res) => res.json(sonKonum)));

/* ---------- Fasoncu: gelen mal ---------- */

router.get('/api/fasoncu/gelen-mallar', wrap((req, res) => {
  res.json(gelenListesi(
    'SELECT * FROM gelen_mal WHERE gonderen_id = ? ORDER BY tarih DESC LIMIT 50',
    [req.kullanici.id],
  ));
}));

router.post('/api/fasoncu/gelen-mallar', wrap((req, res) => {
  const kalemler = kalemleriDogrula(req.body.kalemler);
  const id = uid();
  db.transaction(() => {
    db.prepare(`INSERT INTO gelen_mal (id, gonderen_id, gonderen_ad, durum, tarih) VALUES (?,?,?,?,?)`)
      .run(id, req.kullanici.id, req.kullanici.ad, 'bekliyor', now());
    const ekle = db.prepare(`INSERT INTO gelen_mal_kalem
      (id, gelen_id, sira, urun_ad, urun_kod, renk, cuval, toplam_seri) VALUES (?,?,?,?,?,?,?,?)`);
    kalemler.forEach((k, i) => ekle.run(uid(), id, i + 1, k.urunAd, k.urunKod, k.renk, k.cuval, k.toplam));
    muhasebeyeMesaj([
      'Dışarıdan mal geliyor (onay bekliyor)',
      `Bildiren: ${req.kullanici.ad}`,
      ...kalemler.map((k) => `• ${kalemYazi(k)}`),
    ].join('\n'), req.kullanici.ad);
  })();
  logH('gelen mal bildirildi', '', '', `${req.kullanici.ad}: ${kalemler.length} kalem`);
  res.status(201).json({ ok: true, id });
}));

// Onaylanan malla fasoncu fasona başlar
router.post('/api/fasoncu/gelen-mallar/:id/basla', wrap((req, res) => {
  const b = baslikBul(req.params.id);
  if (b.gonderen_id !== req.kullanici.id) throw new Error('Bu bildirim size ait değil.');
  if (b.durum !== 'onaylandi') throw new Error('Bu bildirim henüz onaylanmadı.');
  db.transaction(() => {
    db.prepare("UPDATE gelen_mal SET durum = 'fasonda' WHERE id = ?").run(b.id);
    muhasebeyeMesaj(`Fason başladı: ${kalemOzet(b.id)}`, req.kullanici.ad);
  })();
  res.json({ ok: true });
}));

/* ---------- Muhasebe / depo sorumlusu: gelen mal onayı ---------- */

router.get('/api/gelen-mallar', wrap((req, res) => {
  res.json(gelenListesi('SELECT * FROM gelen_mal ORDER BY tarih DESC LIMIT 100', []));
}));

router.post('/api/gelen-mallar/:id/onay', wrap((req, res) => {
  const b = baslikBul(req.params.id);
  if (b.durum !== 'bekliyor') throw new Error('Bu bildirim zaten işlendi.');
  db.transaction(() => {
    db.prepare("UPDATE gelen_mal SET durum = 'onaylandi', onay_tarih = ? WHERE id = ?").run(now(), b.id);
    bildirimEkle(
      b.gonderen_id,
      `Muhasebe bildiriminizi kabul etti (${kalemOzet(b.id)}). Artık fasona başlayabilirsiniz.`,
      'onay',
      b.id,
    );
  })();
  res.json({ ok: true });
}));

router.post('/api/gelen-mallar/:id/reddet', wrap((req, res) => {
  const b = baslikBul(req.params.id);
  if (b.durum !== 'bekliyor') throw new Error('Bu bildirim zaten işlendi.');
  const not = String(req.body.not ?? '').trim();
  db.transaction(() => {
    db.prepare("UPDATE gelen_mal SET durum = 'reddedildi', not_metni = ?, onay_tarih = ? WHERE id = ?")
      .run(not || null, now(), b.id);
    bildirimEkle(
      b.gonderen_id,
      `Muhasebe bildiriminizi reddetti.${not ? ` Neden: ${not}` : ''}`,
      'red',
      b.id,
    );
  })();
  res.json({ ok: true });
}));

// Mal sisteme girildiğinde işaretlenir
router.post('/api/gelen-mallar/:id/girildi', wrap((req, res) => {
  const b = baslikBul(req.params.id);
  if (!['onaylandi', 'fasonda'].includes(b.durum)) throw new Error('Bu mal henüz onaylanmadı.');
  db.prepare("UPDATE gelen_mal SET durum = 'girildi' WHERE id = ?").run(b.id);
  res.json({ ok: true });
}));

/* ---------- Fasoncu: bildirimler ---------- */

router.get('/api/fasoncu/bildirimler', wrap((req, res) => {
  const satirlar = db.prepare(`SELECT * FROM fasoncu_bildirim WHERE alici_id = ?
                               ORDER BY tarih DESC LIMIT 30`).all(req.kullanici.id);
  res.json(satirlar.map((b) => ({ id: b.id, metin: b.metin, tur: b.tur, refId: b.ref_id, okundu: !!b.okundu, tarih: b.tarih })));
}));

router.post('/api/fasoncu/bildirimler/okundu', wrap((req, res) => {
  db.prepare('UPDATE fasoncu_bildirim SET okundu = 1 WHERE alici_id = ? AND okundu = 0').run(req.kullanici.id);
  res.json({ ok: true });
}));

/* ---------- Fasoncu: rotasyonlar ---------- */

router.get('/api/fasoncu/rotalar', wrap((req, res) => {
  const satirlar = db.prepare('SELECT * FROM fasoncu_rota WHERE fasoncu_id = ? ORDER BY tarih DESC').all(req.kullanici.id);
  res.json(satirlar.map(rotaSatir));
}));

router.post('/api/fasoncu/rotalar', wrap((req, res) => {
  const ad = String(req.body.ad ?? '').trim().slice(0, 60);
  if (!ad) throw new Error('Rotasyona bir ad verin.');
  const duraklar = duraklariDogrula(req.body.duraklar);
  const id = uid();
  db.prepare(`INSERT INTO fasoncu_rota (id, fasoncu_id, ad, duraklar, durum, tarih) VALUES (?,?,?,?,'aktif',?)`)
    .run(id, req.kullanici.id, ad, JSON.stringify(duraklar), now());
  res.status(201).json({ ok: true, id });
}));

router.put('/api/fasoncu/rotalar/:id', wrap((req, res) => {
  rotaBul(req.params.id, req.kullanici.id);
  const ad = String(req.body.ad ?? '').trim().slice(0, 60);
  if (!ad) throw new Error('Rotasyona bir ad verin.');
  const duraklar = duraklariDogrula(req.body.duraklar);
  db.prepare('UPDATE fasoncu_rota SET ad = ?, duraklar = ? WHERE id = ?')
    .run(ad, JSON.stringify(duraklar), req.params.id);
  res.json({ ok: true });
}));

router.delete('/api/fasoncu/rotalar/:id', wrap((req, res) => {
  rotaBul(req.params.id, req.kullanici.id);
  db.prepare('DELETE FROM fasoncu_rota WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
}));

// Rotanın bir durağına yakın olunca istemci bildirir (gün içinde ilk ziyaret)
router.post('/api/fasoncu/rotalar/:id/ziyaret', wrap((req, res) => {
  const r = rotaBul(req.params.id, req.kullanici.id);
  if (r.durum === 'aktif' && r.son_ziyaret_gun !== gun()) {
    db.prepare('UPDATE fasoncu_rota SET son_ziyaret_gun = ? WHERE id = ?').run(gun(), r.id);
  }
  res.json({ ok: true });
}));

// "Mal alındı mı?" sorusunun cevabı
router.post('/api/fasoncu/rotalar/:id/alindi', wrap((req, res) => {
  const r = rotaBul(req.params.id, req.kullanici.id);
  if (r.son_ziyaret_gun !== gun()) throw new Error('Bugün bu rotada ziyaret tespit edilmedi.');
  const evet = !!req.body.evet;
  db.prepare('UPDATE fasoncu_rota SET soru_gun = ?, alindi_gun = ? WHERE id = ?')
    .run(gun(), evet ? gun() : r.alindi_gun, r.id);
  res.json({ ok: true });
}));

// "Mal çıkacak mı?" sorusunun cevabı: evet → beklemede, hayır → pasif
router.post('/api/fasoncu/rotalar/:id/cikis', wrap((req, res) => {
  const r = rotaBul(req.params.id, req.kullanici.id);
  if (r.alindi_gun !== gun()) throw new Error('Önce bugün mal alındı bilgisi girilmeli.');
  const evet = !!req.body.evet;
  db.prepare('UPDATE fasoncu_rota SET cikis_gun = ?, durum = ? WHERE id = ?')
    .run(gun(), evet ? 'beklemede' : 'pasif', r.id);
  res.json({ ok: true });
}));

// Beklemede ya da pasif rotayı yeniden aktif yapar
router.post('/api/fasoncu/rotalar/:id/aktif', wrap((req, res) => {
  rotaBul(req.params.id, req.kullanici.id);
  db.prepare("UPDATE fasoncu_rota SET durum = 'aktif' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
}));

export default router;