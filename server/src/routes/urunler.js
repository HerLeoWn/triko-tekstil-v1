// Ürünler: ürün listesi, ürün kodu/adı düzenleme, ürün grubunu silme
import express from 'express';
import { db } from '../db.js';
import { same, now, logH, wrap } from '../lib/yardimcilar.js';

const router = express.Router();

router.get('/api/urunler', wrap((req, res) => {
  res.json(db.prepare('SELECT kod, ad FROM urunler ORDER BY kod').all());
}));

// Kod ve ad değiştir. Yeni kod başka bir üründe kullanılıyorsa engellenir.
router.put('/api/urun/:kod', wrap((req, res) => {
  const eskiKod = String(req.params.kod).trim();
  const yeniKod = String(req.body.kod ?? '').trim();
  const yeniAd = String(req.body.ad ?? '').trim();
  if (!yeniKod) throw new Error('Ürün kodu zorunlu.');

  const eskiVar = db.prepare('SELECT COUNT(*) AS n FROM cuvallar WHERE kod = ? COLLATE NOCASE').get(eskiKod).n
    + db.prepare('SELECT COUNT(*) AS n FROM giden WHERE kod = ? COLLATE NOCASE').get(eskiKod).n
    + db.prepare('SELECT COUNT(*) AS n FROM urunler WHERE kod = ? COLLATE NOCASE').get(eskiKod).n;
  if (!eskiVar) throw new Error('Bu ürün kodu bulunamadı.');

  // Kod değişiyorsa, yeni kodun başka bir ürün tarafından kullanılmadığını kontrol et
  const kodDegisiyor = !same(eskiKod, yeniKod);
  if (kodDegisiyor) {
    const cakisma = db.prepare('SELECT COUNT(*) AS n FROM urunler WHERE kod = ? COLLATE NOCASE').get(yeniKod).n
      + db.prepare('SELECT COUNT(*) AS n FROM cuvallar WHERE kod = ? COLLATE NOCASE').get(yeniKod).n;
    if (cakisma) throw new Error(`${yeniKod} kodu zaten kullanılıyor. Farklı bir kod seçin.`);
  }

  db.transaction(() => {
    db.prepare('UPDATE cuvallar SET kod = ?, guncelleme = ? WHERE kod = ? COLLATE NOCASE').run(yeniKod, now(), eskiKod);
    db.prepare('UPDATE giden SET kod = ? WHERE kod = ? COLLATE NOCASE').run(yeniKod, eskiKod);
    db.prepare('DELETE FROM urunler WHERE kod = ? COLLATE NOCASE').run(eskiKod);
    db.prepare(`INSERT INTO urunler (kod, ad) VALUES (?, ?)
                ON CONFLICT(kod) DO UPDATE SET ad = excluded.ad`).run(yeniKod, yeniAd);
    logH('ürün düzenlendi', yeniKod, '', kodDegisiyor ? `${eskiKod} → ${yeniKod}` : `ad: ${yeniAd || '-'}`);
  })();
  res.json({ ok: true, kod: yeniKod });
}));

// Ürün grubunun tüm çuvallarını ve giden kayıtlarını siler
// Grup silme: yalnızca çuvalları siler. Giden (sevk) geçmişi korunur.
router.delete('/api/urun/:kod', wrap((req, res) => {
  const kod = req.params.kod;
  db.transaction(() => {
    const c = db.prepare('DELETE FROM cuvallar WHERE kod = ? COLLATE NOCASE').run(kod).changes;
    logH('grup silindi', kod, '', `${c} çuval silindi (giden geçmişi korundu)`);
  })();
  res.json({ ok: true });
}));

export default router;
