// Çuvallar: listele, ekle, düzenle, durum değiştir, toplu düzelt, sil
import express from 'express';
import { db } from '../db.js';
import { FULL, parseEksik, buildSeriler, stats } from '../stok.js';
import {
  wrap, like, now, logH, depoGecerli, depoAd, urunKaydet, parcalarGelen,
  toCuval, insertCuval, anaRenk, guvenliParse,
} from '../lib/yardimcilar.js';

const router = express.Router();

// Listele (arama, durum ve depo filtresi)
router.get('/api/cuvallar', wrap((req, res) => {
  const q = String(req.query.q || '').trim();
  const durum = String(req.query.durum || '');
  const depo = Number(req.query.depo) || 0;
  const rows = db.prepare(`SELECT c.* FROM cuvallar c
                           LEFT JOIN urunler u ON u.kod = c.kod COLLATE NOCASE
                           WHERE (c.kod LIKE ? OR c.renk LIKE ? OR c.parcalar LIKE ? OR u.ad LIKE ?)
                             AND (? = '' OR c.durum = ?)
                             AND (? = 0 OR c.depo_id = ?)
                           ORDER BY c.kod, c.renk, c.guncelleme DESC`)
    .all(like(q), like(q), like(q), like(q), durum, durum, depo, depo);
  res.json(rows.map((r) => toCuval(r)));
}));

// Yeni çuval(lar) ekle
router.post('/api/cuvallar', wrap((req, res) => {
  const kod = String(req.body.kod ?? '').trim();
  const depoId = depoGecerli(req.body.depoId ?? 1);
  const cuvalIci = parseInt(req.body.cuvalIci, 10);
  const cuvalAdet = parseInt(req.body.cuvalAdet, 10) || 0;
  const extra = Array.isArray(req.body.extra) ? req.body.extra : [];
  const parcalar = parcalarGelen(req.body.parcalar);

  if (!kod) throw new Error('Kod zorunlu.');
  if (!(cuvalIci > 0)) throw new Error('Çuval içi seri 1 veya daha büyük olmalı.');
  if (cuvalAdet < 0) throw new Error('Çuval adedi geçersiz.');
  if (!parcalar.length) throw new Error('En az bir renk ve seri sayısı girin.');

  const dolu = parcalar.reduce((s, p) => s + p.seri, 0);
  if (dolu > cuvalIci) throw new Error(`Bir çuvalda en fazla ${cuvalIci} seri olabilir, ${dolu} girdiniz.`);

  const extraSeriler = extra
    .map((s) => (Array.isArray(s) ? s : []).map((x) => String(x).toUpperCase()).filter((x) => FULL.includes(x)))
    .filter((s) => s.length);

  if (cuvalAdet === 0 && !extraSeriler.length) {
    throw new Error('Çuval adedi veya asortiye girmeyen seri girin.');
  }

  const ana = anaRenk(parcalar);
  const t = now();
  db.transaction(() => {
    urunKaydet(kod, req.body.ad);
    for (let i = 0; i < cuvalAdet; i++) {
      insertCuval(kod, ana, cuvalIci, [...Array(dolu)].map(() => [...FULL]), t, parcalar, depoId);
    }
    for (let i = 0; i < extraSeriler.length; i += cuvalIci) {
      insertCuval(kod, ana, cuvalIci, extraSeriler.slice(i, i + cuvalIci), t, null, depoId);
    }
    const icerik = parcalar.map((p) => `${p.renk} ${p.seri}`).join(' + ');
    const ekNot = extraSeriler.length ? `, asortiye girmeyen ${extraSeriler.length} seri` : '';
    logH('eklendi', kod, ana, `${depoAd(depoId)}: ${cuvalAdet} çuval (${icerik}${ekNot})`);
  })();
  res.status(201).json({ ok: true });
}));

// Tek çuvalı düzenle (depo değiştirilirse çuval o depoya taşınır)
router.put('/api/cuvallar/:id', wrap((req, res) => {
  const old = db.prepare('SELECT * FROM cuvallar WHERE id = ?').get(req.params.id);
  if (!old) throw new Error('Çuval bulunamadı.');

  const kod = String(req.body.kod ?? '').trim();
  const depoId = depoGecerli(req.body.depoId ?? old.depo_id ?? 1);
  const cuvalIci = parseInt(req.body.cuvalIci, 10);
  const parcalar = parcalarGelen(req.body.parcalar);
  const eksik = parseEksik(req.body.eksik ?? '');

  if (!kod) throw new Error('Kod zorunlu.');
  if (!(cuvalIci > 0)) throw new Error('Çuval içi seri 1 veya daha büyük olmalı.');
  if (!parcalar.length) throw new Error('En az bir renk ve seri sayısı girin.');

  const toplam = parcalar.reduce((s, p) => s + p.seri, 0);
  if (toplam > cuvalIci) throw new Error(`Bir çuvalda en fazla ${cuvalIci} seri olabilir, ${toplam} girdiniz.`);
  if (eksik.length > toplam) throw new Error('Eksik seri sayısı toplam seriden fazla olamaz.');

  const before = stats(guvenliParse(old.seriler, []));
  const seriler = buildSeriler(toplam, eksik);
  const renk = anaRenk(parcalar);

  db.transaction(() => {
    urunKaydet(kod, req.body.ad);
    db.prepare(`UPDATE cuvallar SET kod = ?, renk = ?, cuval_ici = ?, seriler = ?, parcalar = ?, depo_id = ?, guncelleme = ?
                WHERE id = ?`)
      .run(kod, renk, cuvalIci, JSON.stringify(seriler), JSON.stringify(parcalar), depoId, now(), req.params.id);
    const after = stats(seriler);
    logH('düzenlendi', kod, renk,
      `${depoAd(depoId)} · ${parcalar.map((p) => `${p.renk} ${p.seri}`).join(' + ')} · seri ${before.seri}→${after.seri}, eksik ${before.eksik}→${after.eksik}`);
  })();
  res.json({ ok: true });
}));

// Açık / kapalı durumunu değiştir
router.post('/api/cuvallar/:id/durum', wrap((req, res) => {
  const c = db.prepare('SELECT * FROM cuvallar WHERE id = ?').get(req.params.id);
  if (!c) throw new Error('Çuval bulunamadı.');
  const yeni = c.durum === 'acik' ? 'kapali' : 'acik';
  db.prepare('UPDATE cuvallar SET durum = ?, guncelleme = ? WHERE id = ?').run(yeni, now(), c.id);
  logH(yeni === 'kapali' ? 'kapatıldı' : 'açıldı', c.kod, c.renk,
    `${guvenliParse(c.seriler, []).length} seri, ${c.cuval_ici}'li`);
  res.json({ ok: true });
}));

// Seçilen birden çok çuvalı aynı anda düzenle
router.post('/api/cuvallar/toplu-duzelt', wrap((req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) throw new Error('Düzeltilecek çuval seçilmedi.');

  const parcalar = parcalarGelen(req.body.parcalar);
  if (!parcalar.length) throw new Error('En az bir renk ve seri sayısı girin.');
  const cuvalIci = parseInt(req.body.cuvalIci, 10);
  if (!(cuvalIci > 0)) throw new Error('Çuval içi seri 1 veya daha büyük olmalı.');
  const toplam = parcalar.reduce((s, p) => s + p.seri, 0);
  if (toplam > cuvalIci) throw new Error(`Bir çuvalda en fazla ${cuvalIci} seri olabilir, ${toplam} girdiniz.`);
  const eksik = parseEksik(req.body.eksik ?? '');
  const depoId = req.body.depoId !== undefined && req.body.depoId !== ''
    ? depoGecerli(req.body.depoId) : null;

  const seriler = buildSeriler(toplam, eksik);
  const renk = anaRenk(parcalar);
  const t = now();

  db.transaction(() => {
    const upd = db.prepare(`UPDATE cuvallar SET renk = ?, cuval_ici = ?, seriler = ?, parcalar = ?,
                            depo_id = COALESCE(?, depo_id), guncelleme = ? WHERE id = ?`);
    let n = 0;
    for (const id of ids) {
      if (!db.prepare('SELECT id FROM cuvallar WHERE id = ?').get(id)) continue;
      upd.run(renk, cuvalIci, JSON.stringify(seriler), JSON.stringify(parcalar), depoId, t, id);
      n++;
    }
    logH('toplu düzeltme', '', renk, `${n} çuval: ${parcalar.map((p) => `${p.renk} ${p.seri}`).join(' + ')}`);
  })();
  res.json({ ok: true });
}));

// Tek çuvalı siler. Giden (sevk) geçmişine dokunmaz.
router.delete('/api/cuvallar/:id', wrap((req, res) => {
  const c = db.prepare('SELECT * FROM cuvallar WHERE id = ?').get(req.params.id);
  if (!c) throw new Error('Çuval bulunamadı.');
  db.prepare('DELETE FROM cuvallar WHERE id = ?').run(c.id);
  logH('çuval silindi', c.kod, c.renk, 'tek çuval silindi');
  res.json({ ok: true });
}));


export default router;
