// Raporlar: uyarılar, depo özeti, gün sonu raporu
import express from 'express';
import { db } from '../db.js';
import { toCuval, depoListe, parcaListesi, wrap } from '../lib/yardimcilar.js';

const router = express.Router();

const bugunYerel = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const gunBaslangic = (tarih) => new Date(`${tarih}T00:00:00`).toISOString();
const gunBitis = (tarih) => new Date(`${tarih}T23:59:59.999`).toISOString();

// Her renk için güncel toplam seri (tüm depolar)
function stokOzeti() {
  const map = {};
  db.prepare('SELECT * FROM cuvallar').all().forEach((r) => {
    parcaListesi(r).forEach((p) => {
      const renk = String(p.renk).trim();
      const k = `${r.kod.toLowerCase()}|${renk.toLowerCase()}`;
      const e = (map[k] ??= { kod: r.kod, renk, seri: 0 });
      e.seri += p.seri;
    });
  });
  return Object.values(map).filter((e) => e.seri > 0);
}

// Düşük stok ve uzun süre çıkış yapılmayan renkler
router.get('/api/uyari', wrap((req, res) => {
  const esik = Math.max(0, parseInt(req.query.esik, 10) || 10);
  const gun = Math.max(1, parseInt(req.query.gun, 10) || 14);
  const sinir = Date.now() - gun * 86400000;

  // Her renk için en son çıkış tarihi
  const sonCikis = {};
  db.prepare(`SELECT kod, renk, MAX(tarih) AS son FROM giden
              GROUP BY kod COLLATE NOCASE, renk COLLATE NOCASE`).all()
    .forEach((g) => { sonCikis[`${g.kod.toLowerCase()}|${g.renk.trim().toLowerCase()}`] = g.son; });

  const stok = stokOzeti();

  const dusuk = stok
    .filter((s) => s.seri <= esik)
    .sort((a, b) => a.seri - b.seri)
    .map((s) => ({ kod: s.kod, renk: s.renk, seri: s.seri }));

  const hareketsiz = stok
    .map((s) => ({
      kod: s.kod,
      renk: s.renk,
      seri: s.seri,
      sonCikis: sonCikis[`${s.kod.toLowerCase()}|${s.renk.toLowerCase()}`] ?? null,
    }))
    .filter((s) => !s.sonCikis || new Date(s.sonCikis).getTime() < sinir)
    .sort((a, b) => (a.sonCikis ?? '').localeCompare(b.sonCikis ?? ''));

  res.json({ esik, gun, dusuk, hareketsiz });
}));

// Depo bazlı özet: her depoda ürün ve renk dökümü
router.get('/api/ozet', wrap((req, res) => {
  const depolar = depoListe();
  const list = db.prepare('SELECT * FROM cuvallar').all().map((r) => toCuval(r));

  const sonuc = depolar.map((d) => {
    const bu = list.filter((c) => c.depoId === d.id);
    const urunMap = {};
    bu.forEach((c) => {
      const k = `${c.kod.toLowerCase()}|${c.cuvalIci}`;
      const u = (urunMap[k] ??= { kod: c.kod, ad: c.ad || '', cuvalIci: c.cuvalIci, renks: {}, cuval: 0, seri: 0 });
      if (!u.ad && c.ad) u.ad = c.ad;
      u.cuval += 1;
      u.seri += c.seri;
      c.parcalar.forEach((p) => {
        const rk = p.renk.toLowerCase();
        const r = (u.renks[rk] ??= { renk: p.renk, seri: 0 });
        r.seri += p.seri;
      });
    });

    const urunler = Object.values(urunMap)
      .map((u) => ({
        kod: u.kod,
        ad: u.ad,
        cuvalIci: u.cuvalIci,
        cuval: u.cuval,
        seri: u.seri,
        renks: Object.values(u.renks).sort((a, b) => a.renk.localeCompare(b.renk, 'tr')),
      }))
      .sort((a, b) => a.kod.localeCompare(b.kod, 'tr', { numeric: true }));

    return {
      depo: d.ad,
      cuval: bu.length,
      seri: bu.reduce((s, c) => s + c.seri, 0),
      urunler,
    };
  });

  res.json({ tarih: new Date().toISOString(), depolar: sonuc });
}));

// Gün sonu raporu: seçilen günün girişleri, çıkışları ve anlık stok
router.get('/api/rapor', wrap((req, res) => {
  const tarih = /^\d{4}-\d{2}-\d{2}$/.test(req.query.tarih || '') ? req.query.tarih : bugunYerel();
  const bas = gunBaslangic(tarih);
  const bit = gunBitis(tarih);

  const girilen = db.prepare('SELECT * FROM cuvallar WHERE olusturma BETWEEN ? AND ? ORDER BY olusturma')
    .all(bas, bit)
    .map(toCuval)
    .map((c) => ({ kod: c.kod, etiket: c.etiket, cuvalIci: c.cuvalIci, seri: c.seri, saat: c.olusturma }));

  const kalemStmt = db.prepare('SELECT boyut, adet, stok FROM giden_kalemler WHERE giden_id = ?');
  const giden = db.prepare('SELECT * FROM giden WHERE tarih BETWEEN ? AND ? ORDER BY tarih')
    .all(bas, bit)
    .map((g) => {
      const kal = kalemStmt.all(g.id);
      const ozet = kal.length
        ? kal.map((k) => `${k.adet}×${k.boyut}'li${k.stok ? '' : ' (manuel)'}`).join(' + ')
        : `${g.renk} ${g.seri} seri${g.stok === 0 ? ' (manuel)' : ''}`;
      return { kod: g.kod, renk: g.renk, seri: g.seri, cuval: g.cuval_adedi, ozet, saat: g.tarih };
    });

  // Anlık stok: rapor tarihinden bağımsız, şu anki durum
  const kalan = stokOzeti().sort((a, b) =>
    a.kod.localeCompare(b.kod, 'tr', { numeric: true }) || a.renk.localeCompare(b.renk, 'tr'));

  res.json({
    tarih,
    girilen,
    giden,
    kalan,
    toplam: {
      girilenSeri: girilen.reduce((s, c) => s + c.seri, 0),
      gidenSeri: giden.reduce((s, g) => s + g.seri, 0),
      kalanSeri: kalan.reduce((s, k) => s + k.seri, 0),
    },
  });
}));

export default router;
