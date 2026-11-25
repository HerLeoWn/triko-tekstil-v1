// Görevler: muhasebe görev atar, depo sorumlusu kabul eder ya da reddeder, gönderir.
// Gönderimde giden kaydı oluşur. Hedef kendi depolarımızdan biriyse stok taşınır;
// dış yer (ör. Marrakech) ise stok değişmez. Elle girilen mallar stok etkilemez.
import express from 'express';
import { db } from '../db.js';
import './mesajlar.js'; // mesajlar tablosu bu dosyadan önce hazır olsun
import { wrap, uid, now, depoAd, depoGecerli, logH } from '../lib/yardimcilar.js';
import { stokSeriByRenk, renktenDus, geriEkle } from '../services/stokkesim.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS gorevler (
    id TEXT PRIMARY KEY,
    tarih TEXT NOT NULL,
    hedef_depo_id INTEGER,
    hedef_ad TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'bekliyor',
    not_metni TEXT,
    red_nedeni TEXT,
    olusturan_ad TEXT,
    olusturma TEXT NOT NULL,
    guncelleme TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS gorev_kalemler (
    id TEXT PRIMARY KEY,
    gorev_id TEXT NOT NULL,
    tur TEXT NOT NULL,
    kod TEXT NOT NULL,
    renk TEXT NOT NULL,
    kaynak_depo_id INTEGER NOT NULL,
    istenen INTEGER NOT NULL,
    gonderilen INTEGER NOT NULL DEFAULT 0
  );
`);

const router = express.Router();

const tarihYazi = (t) => {
  const [y, m, d] = String(t).split('-');
  return `${d}.${m}.${y}`;
};

// Rol bazlı mesaj/bildirim düşer
const bildir = (tur, aliciRol, icerik, gonderen) =>
  db.prepare(`INSERT INTO mesajlar (id, tur, gonderen_id, gonderen_ad, alici_id, alici_rol, ref_gun, icerik, tarih)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(uid(), tur, null, gonderen, null, aliciRol, null, icerik, now());

const gorevAl = (id) => {
  const g = db.prepare('SELECT * FROM gorevler WHERE id = ?').get(id);
  if (!g) throw new Error('Görev bulunamadı.');
  return g;
};

// Arayüzün kullandığı görev nesnesi (kalemler ve ilerleme dahil)
const gorevDetay = (g) => {
  const kalemler = db.prepare('SELECT * FROM gorev_kalemler WHERE gorev_id = ? ORDER BY rowid').all(g.id)
    .map((k) => ({
      id: k.id,
      tur: k.tur,
      kod: k.kod,
      renk: k.renk,
      kaynakDepoId: k.kaynak_depo_id,
      kaynakDepo: depoAd(k.kaynak_depo_id),
      istenen: k.istenen,
      gonderilen: k.gonderilen,
    }));
  return {
    id: g.id,
    tarih: g.tarih,
    hedefAd: g.hedef_ad,
    hedefDepoId: g.hedef_depo_id,
    dis: g.hedef_depo_id == null,
    durum: g.durum,
    not: g.not_metni ?? '',
    redNedeni: g.red_nedeni ?? '',
    olusturanAd: g.olusturan_ad ?? '',
    olusturma: g.olusturma,
    kalemler,
    toplamIstenen: kalemler.reduce((s, k) => s + k.istenen, 0),
    toplamGonderilen: kalemler.reduce((s, k) => s + k.gonderilen, 0),
  };
};

// Listele: en yeni 100 görev, kalemleri ve ilerlemesiyle
router.get('/api/gorevler', wrap((req, res) => {
  const rows = db.prepare('SELECT * FROM gorevler ORDER BY olusturma DESC LIMIT 100').all();
  res.json(rows.map(gorevDetay));
}));

// Görev ata (muhasebe)
router.post('/api/gorevler', wrap((req, res) => {
  const tarih = String(req.body.tarih ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) throw new Error('Tarih seçin.');
  const not = String(req.body.not ?? '').trim().slice(0, 300);

  // Hedef: kendi depomuz (stok taşınır) ya da dış yer (stok değişmez)
  let hedefDepoId = null;
  let hedefAd = String(req.body.hedefAd ?? '').trim();
  if (req.body.hedefDepoId) {
    hedefDepoId = depoGecerli(req.body.hedefDepoId);
    hedefAd = depoAd(hedefDepoId);
  }
  if (!hedefAd) throw new Error('Hedef seçin.');

  const kalemler = (Array.isArray(req.body.kalemler) ? req.body.kalemler : []).map((k) => ({
    tur: k.tur === 'manuel' ? 'manuel' : 'stok',
    ad: String(k.ad ?? '').trim().slice(0, 120),
    kod: String(k.kod ?? '').trim(),
    renk: String(k.renk ?? '').trim(),
    kaynakDepoId: depoGecerli(k.kaynakDepoId),
    istenen: parseInt(k.istenen, 10),
  }));
  if (!kalemler.length) throw new Error('En az bir mal ekleyin.');
    // Elle girilen mal yeni ürünse ürün listesine kaydedilir (varsa ad değişmez)
  kalemler.forEach((k) => {
    if (k.tur === 'manuel' && k.ad && k.kod) {
      db.prepare('INSERT INTO urunler (kod, ad) VALUES (?, ?) ON CONFLICT(kod) DO NOTHING').run(k.kod, k.ad);
    }
  });

  kalemler.forEach((k) => {
    if (!k.kod || !k.renk) throw new Error('Her malda kod ve renk olmalı.');
    if (!(k.istenen > 0)) throw new Error(`${k.kod} ${k.renk} için seri sayısı girin.`);
    if (hedefDepoId != null && k.kaynakDepoId === hedefDepoId) {
      throw new Error(`${k.kod} ${k.renk}: kaynak ve hedef depo aynı olamaz.`);
    }
    if (k.tur === 'stok') {
      const mevcut = stokSeriByRenk(k.kod, k.kaynakDepoId)[k.renk.toLowerCase()] || 0;
      if (k.istenen > mevcut) {
        throw new Error(`${k.kod} ${k.renk}: ${depoAd(k.kaynakDepoId)} deposunda yalnızca ${mevcut} seri var, ${k.istenen} istendi.`);
      }
    }
  });

  const id = uid();
  const t = now();
  db.transaction(() => {
    db.prepare(`INSERT INTO gorevler (id, tarih, hedef_depo_id, hedef_ad, durum, not_metni, red_nedeni, olusturan_ad, olusturma, guncelleme)
                VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id, tarih, hedefDepoId, hedefAd, 'bekliyor', not, null, req.kullanici.ad, t, t);

    const ekle = db.prepare(`INSERT INTO gorev_kalemler (id, gorev_id, tur, kod, renk, kaynak_depo_id, istenen, gonderilen)
                             VALUES (?,?,?,?,?,?,?,0)`);
    kalemler.forEach((k) => ekle.run(uid(), id, k.tur, k.kod, k.renk, k.kaynakDepoId, k.istenen));

    bildir('gorev', 'yonetici', [
      `Yeni görev · ${tarihYazi(tarih)} · Hedef: ${hedefAd}`,
      ...kalemler.map((k) => `• ${k.kod} ${k.renk}: ${k.istenen} seri (${depoAd(k.kaynakDepoId)}${k.tur === 'manuel' ? ', elle girildi' : ''})`),
      ...(not ? [`Not: ${not}`] : []),
    ].join('\n'), req.kullanici.ad);
  })();

  logH('görev atandı', '', '', `${hedefAd} · ${kalemler.length} kalem`);
  res.status(201).json({ ok: true, id });
}));

// Kabul (depo sorumlusu)
router.post('/api/gorevler/:id/kabul', wrap((req, res) => {
  const g = gorevAl(req.params.id);
  if (g.durum !== 'bekliyor') throw new Error('Bu görev zaten işlendi.');
  db.prepare("UPDATE gorevler SET durum = 'kabul', guncelleme = ? WHERE id = ?").run(now(), g.id);
  bildir('gorev', 'muhasebe', `Görev kabul edildi · ${tarihYazi(g.tarih)} · ${g.hedef_ad}`, req.kullanici.ad);
  res.json({ ok: true });
}));

// Red (depo sorumlusu): muhasebeye hemen bildirim gider
router.post('/api/gorevler/:id/reddet', wrap((req, res) => {
  const g = gorevAl(req.params.id);
  if (g.durum !== 'bekliyor') throw new Error('Bu görev zaten işlendi.');
  const neden = String(req.body.neden ?? '').trim().slice(0, 300) || 'Belirtilmedi';
  db.prepare("UPDATE gorevler SET durum = 'reddedildi', red_nedeni = ?, guncelleme = ? WHERE id = ?")
    .run(neden, now(), g.id);
  bildir('gorev', 'muhasebe',
    `GÖREV REDDEDİLDİ · ${tarihYazi(g.tarih)} · ${g.hedef_ad}\nNeden: ${neden}`,
    req.kullanici.ad);
  res.json({ ok: true });
}));

// Gönderim (depo sorumlusu). body.satirlar = [{ kalemId, seri }], kısmi gönderim desteklenir.
router.post('/api/gorevler/:id/gonder', wrap((req, res) => {
  const g = gorevAl(req.params.id);
  if (!['kabul', 'kismi'].includes(g.durum)) throw new Error('Önce görevi kabul edin.');

  const sevkler = (Array.isArray(req.body.satirlar) ? req.body.satirlar : [])
    .map((s) => ({ kalemId: String(s.kalemId ?? ''), seri: parseInt(s.seri, 10) || 0 }))
    .filter((s) => s.seri > 0);
  if (!sevkler.length) throw new Error('Gönderilecek seri girin.');

  const kalemler = db.prepare('SELECT * FROM gorev_kalemler WHERE gorev_id = ?').all(g.id);
  const dis = g.hedef_depo_id == null;
  const satirOzet = [];

  db.transaction(() => {
    sevkler.forEach((s) => {
      const k = kalemler.find((x) => x.id === s.kalemId);
      if (!k) throw new Error('Kalem bulunamadı.');
      const kalan = k.istenen - k.gonderilen;
      if (s.seri > kalan) throw new Error(`${k.kod} ${k.renk} için en fazla ${kalan} seri gönderilebilir.`);

      if (k.tur === 'stok') {
        const mevcut = stokSeriByRenk(k.kod, k.kaynak_depo_id)[k.renk.toLowerCase()] || 0;
        if (s.seri > mevcut) {
          throw new Error(`${k.kod} ${k.renk}: ${depoAd(k.kaynak_depo_id)} deposunda yalnızca ${mevcut} seri var.`);
        }
        // Kaynaktan düş
        const sonuc = renktenDus(k.kod, k.renk, s.seri, k.kaynak_depo_id);
        db.prepare(`INSERT INTO giden (id, kod, renk, cuval_adedi, seri, tarih, cuval_ici, stok, depo_id)
                    VALUES (?,?,?,?,?,?,?,1,?)`)
          .run(uid(), k.kod, k.renk, sonuc.cuvalSayisi, s.seri, now(), sonuc.cuvalIci ?? 0, k.kaynak_depo_id);
        // Kendi depomuza gidiyorsa hedefe çuval olarak ekle
        if (!dis) geriEkle(k.kod, k.renk, s.seri, sonuc.cuvalIci || s.seri, g.hedef_depo_id);
      } else {
        // Elle girilen mal: giden kaydı, stok etkisi yok
        db.prepare(`INSERT INTO giden (id, kod, renk, cuval_adedi, seri, tarih, cuval_ici, stok, depo_id)
                    VALUES (?,?,?,0,?,?,0,0,?)`)
          .run(uid(), k.kod, k.renk, s.seri, now(), k.kaynak_depo_id);
      }

      db.prepare('UPDATE gorev_kalemler SET gonderilen = gonderilen + ? WHERE id = ?').run(s.seri, k.id);
      k.gonderilen += s.seri;
      logH('gitti', k.kod, k.renk,
        `${depoAd(k.kaynak_depo_id)} → ${g.hedef_ad}: ${s.seri} seri (görev)`);
      satirOzet.push(`• ${k.kod} ${k.renk}: ${s.seri} seri (${depoAd(k.kaynak_depo_id)}${k.tur === 'manuel' ? ', elle girildi' : ''})`);
    });

    const tamam = kalemler.every((k) => k.gonderilen >= k.istenen);
    db.prepare('UPDATE gorevler SET durum = ?, guncelleme = ? WHERE id = ?')
      .run(tamam ? 'tamamlandi' : 'kismi', now(), g.id);

    bildir('gonderim', 'muhasebe', [
      `DEPOYA MAL GİDİLDİ · ${tarihYazi(g.tarih)}`,
      `Hedef: ${g.hedef_ad}${dis ? ' (dış yer, stok değişmez)' : ''}`,
      ...satirOzet,
      tamam ? 'Görev tamamlandı.' : 'Görev kısmi gönderildi, kalan miktar bekliyor.',
    ].join('\n'), req.kullanici.ad);
  })();

  res.json({ ok: true });
}));

// İptal (muhasebe): bekleyen ya da kısmi görevde kalan seriler iptal edilir.
// Daha önce gönderilen mallar geri alınmaz.
router.post('/api/gorevler/:id/iptal', wrap((req, res) => {
  const g = gorevAl(req.params.id);
  if (!['bekliyor', 'kabul', 'kismi'].includes(g.durum)) throw new Error('Bu görev artık iptal edilemez.');
  const neden = String(req.body.neden ?? '').trim().slice(0, 300) || 'Belirtilmedi';

  const kalemler = db.prepare('SELECT * FROM gorev_kalemler WHERE gorev_id = ?').all(g.id);
  const kalan = kalemler.reduce((s, k) => s + Math.max(0, k.istenen - k.gonderilen), 0);

  db.transaction(() => {
    db.prepare("UPDATE gorevler SET durum = 'iptal', red_nedeni = ?, guncelleme = ? WHERE id = ?")
      .run(neden, now(), g.id);
    bildir('gorev', 'yonetici',
      `GÖREV İPTAL EDİLDİ · ${tarihYazi(g.tarih)} · ${g.hedef_ad}\nNeden: ${neden}\nKalan ${kalan} seri iptal edildi.`,
      req.kullanici.ad);
  })();

  logH('görev iptal', '', '', `${g.hedef_ad}: ${kalan} seri iptal`);
  res.json({ ok: true });
}));

const BITMIS = ['tamamlandi', 'iptal', 'reddedildi'];

// Sil (depo sorumlusu): yalnızca bitmiş görevler silinir. Giden kayıtları ve stok etkilenmez.
router.delete('/api/gorevler/:id', wrap((req, res) => {
  const g = gorevAl(req.params.id);
  if (!BITMIS.includes(g.durum)) {
    throw new Error('Yalnızca tamamlanmış, iptal edilmiş ya da reddedilmiş görevler silinebilir.');
  }
  db.transaction(() => {
    db.prepare('DELETE FROM gorev_kalemler WHERE gorev_id = ?').run(g.id);
    db.prepare('DELETE FROM gorevler WHERE id = ?').run(g.id);
  })();
  res.json({ ok: true });
}));

// Toplu temizle: bitmiş tüm görevleri siler
router.post('/api/gorevler/temizle', wrap((req, res) => {
  const ids = db.prepare(
    `SELECT id FROM gorevler WHERE durum IN (${BITMIS.map(() => '?').join(',')})`
  ).all(...BITMIS).map((r) => r.id);
  db.transaction(() => {
    ids.forEach((id) => {
      db.prepare('DELETE FROM gorev_kalemler WHERE gorev_id = ?').run(id);
      db.prepare('DELETE FROM gorevler WHERE id = ?').run(id);
    });
  })();
  res.json({ ok: true, silinen: ids.length });
}));

export default router;