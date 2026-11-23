// Giden mallar: listele, ekle, düzenle, sil (hepsi stoktan düşer / geri ekler)
import express from 'express';
import { db } from '../db.js';
import { stokSeriByRenk, renktenDus, geriEkle } from '../services/stokKesim.js';
import { wrap, like, uid, now, logH, depoGecerli, depoAd, guvenliParse } from '../lib/yardimcilar.js';
import { gidenBildirimi } from './mesajlar.js';

const router = express.Router();

// Listele: her kaydın özeti ve çıkış deposu adı ile birlikte
router.get('/api/giden', wrap((req, res) => {
  const q = String(req.query.q || '').trim();
  const rows = db.prepare('SELECT * FROM giden WHERE kod LIKE ? OR renk LIKE ? ORDER BY tarih DESC')
    .all(like(q), like(q));
  const kal = db.prepare('SELECT * FROM giden_kalemler WHERE giden_id = ?');
  res.json(rows.map((g) => {
    const kalemler = kal.all(g.id).map((k) => ({ boyut: k.boyut, cuvalIci: k.cuval_ici, adet: k.adet, stok: !!k.stok }));
    const ozet = kalemler.length
      ? kalemler.map((k) => `${k.adet}×${k.boyut}'li${k.stok ? '' : ' (manuel)'}`).join(' + ')
      : `${g.renk} ${g.seri} seri${g.stok ? '' : ' (manuel)'}`;
    return { ...g, cuvalAdedi: g.cuval_adedi, kalemler, ozet, depo: depoAd(g.depo_id ?? 1) };
  }));
}));

// Yeni giden kaydı(satırları) ekle, seçilen depodan stok düş, muhasebeye bildirim düş
router.post('/api/giden', wrap((req, res) => {
  const kod = String(req.body.kod ?? '').trim();
  const depoId = depoGecerli(req.body.depoId);
  const satirlar = (req.body.satirlar || []).map((s) => ({
    renk: String(s.renk ?? '').trim(),
    seri: parseInt(s.seri, 10),
    stok: s.stok !== false,
  }));
  if (!kod) throw new Error('Kod zorunlu.');
  if (!satirlar.length || satirlar.some((s) => !s.renk || !(s.seri > 0))) {
    throw new Error('Her satırda renk ve seri sayısı olmalı.');
  }

  db.transaction(() => {
    const stok = stokSeriByRenk(kod, depoId);
    const ihtiyac = {};
    satirlar.filter((s) => s.stok).forEach((s) => {
      const k = s.renk.toLowerCase();
      ihtiyac[k] = (ihtiyac[k] || 0) + s.seri;
    });
    for (const [k, adet] of Object.entries(ihtiyac)) {
      if (adet > (stok[k] || 0)) {
        throw new Error(`${k} renginde ${depoAd(depoId)} deposunda yalnızca ${stok[k] || 0} seri var, ${adet} istendi.`);
      }
    }

    const t = now();
    const ins = db.prepare(`INSERT INTO giden (id, kod, renk, cuval_adedi, seri, tarih, cuval_ici, stok, depo_id)
                            VALUES (?,?,?,?,?,?,?,?,?)`);
    satirlar.forEach((s) => {
      let cuvalAdet = 0, cuvalIci = 0;
      if (s.stok) {
        const sonuc = renktenDus(kod, s.renk, s.seri, depoId);
        cuvalAdet = sonuc.cuvalSayisi;
        cuvalIci = sonuc.cuvalIci ?? 0;
      }
      ins.run(uid(), kod, s.renk, cuvalAdet, s.seri, t, cuvalIci, s.stok ? 1 : 0, depoId);
      logH('gitti', kod, s.renk, `${depoAd(depoId)}: ${s.seri} seri${s.stok ? '' : ' (manuel)'}`);
    });
  })();

  gidenBildirimi({ gonderen: req.kullanici, kod, depo: depoAd(depoId), satirlar });
  res.status(201).json({ ok: true });
}));

// Giden kaydını sil: stoktan düşen çuvallar geri eklenir
router.delete('/api/giden/:id', wrap((req, res) => {
  const g = db.prepare('SELECT * FROM giden WHERE id = ?').get(req.params.id);
  if (!g) throw new Error('Giden kaydı bulunamadı.');
  db.transaction(() => {
    const kal = db.prepare('SELECT * FROM giden_kalemler WHERE giden_id = ?').all(g.id);
    if (kal.length) {
      kal.filter((k) => k.stok).forEach((k) => {
        for (let i = 0; i < k.adet; i++) geriEkle(g.kod, g.renk, k.boyut, k.cuval_ici, g.depo_id ?? 1);
      });
    } else if (g.stok && g.cuval_ici) {
      geriEkle(g.kod, g.renk, g.seri, g.cuval_ici, g.depo_id ?? 1);
    }
    db.prepare('DELETE FROM giden WHERE id = ?').run(g.id);
    logH('geri alındı', g.kod, g.renk, `${g.seri} seri kaydı silindi`);
  })();
  res.json({ ok: true });
}));

// Giden kaydını düzenle: eski kaydın stok etkisi geri alınır, yeni bilgiyle yeniden düşülür
router.put('/api/giden/:id', wrap((req, res) => {
  const g = db.prepare('SELECT * FROM giden WHERE id = ?').get(req.params.id);
  if (!g) throw new Error('Giden kaydı bulunamadı.');

  const kod = String(req.body.kod ?? '').trim();
  const renk = String(req.body.renk ?? '').trim();
  const seri = parseInt(req.body.seri, 10);
  const depoId = depoGecerli(req.body.depoId);
  if (!kod || !renk) throw new Error('Kod ve renk zorunlu.');
  if (!(seri > 0)) throw new Error('Seri 1 veya daha büyük olmalı.');

  db.transaction(() => {
    // 1) Eski kaydın stoğa etkisini geri al (silme ile aynı mantık)
    const eskiDepo = g.depo_id ?? 1;
    const kal = db.prepare('SELECT * FROM giden_kalemler WHERE giden_id = ?').all(g.id);
    if (kal.length) {
      kal.filter((k) => k.stok).forEach((k) => {
        for (let i = 0; i < k.adet; i++) geriEkle(g.kod, g.renk, k.boyut, k.cuval_ici, eskiDepo);
      });
    } else if (g.stok && g.cuval_ici) {
      geriEkle(g.kod, g.renk, g.seri, g.cuval_ici, eskiDepo);
    }

    // 2) Yeni kaydı uygula. Giden kayıtları her zaman stoktan düşer.
    const mevcut = stokSeriByRenk(kod, depoId)[renk.toLowerCase()] || 0;
    if (seri > mevcut) {
      throw new Error(`${renk} renginde ${depoAd(depoId)} deposunda yalnızca ${mevcut} seri var, ${seri} istendi.`);
    }
    const sonuc = renktenDus(kod, renk, seri, depoId);

    db.prepare('UPDATE giden SET kod = ?, renk = ?, seri = ?, cuval_adedi = ?, cuval_ici = ?, depo_id = ?, stok = 1 WHERE id = ?')
      .run(kod, renk, seri, sonuc.cuvalSayisi, sonuc.cuvalIci ?? 0, depoId, g.id);
    logH('giden düzenlendi', kod, renk,
      `${depoAd(eskiDepo)} → ${depoAd(depoId)} · ${g.seri} → ${seri} seri`);
  })();
  res.json({ ok: true });
}));

export default router;