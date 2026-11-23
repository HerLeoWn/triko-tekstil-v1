// Depolar: listele, ekle, yeniden adlandır, sil
import express from 'express';
import { db } from '../db.js';
import { depoListe, depoAd, logH, wrap } from '../lib/yardimcilar.js';

const router = express.Router();

router.get('/api/depolar', wrap((req, res) => res.json(depoListe())));

router.post('/api/depolar', wrap((req, res) => {
  const ad = String(req.body.ad ?? '').trim();
  if (!ad) throw new Error('Depo adı zorunlu.');
  const sira = db.prepare('SELECT COALESCE(MAX(sira), 0) AS m FROM depolar').get().m + 1;
  db.prepare('INSERT INTO depolar (ad, sira) VALUES (?,?)').run(ad, sira);
  logH('depo eklendi', '', '', ad);
  res.status(201).json({ ok: true });
}));

router.put('/api/depolar/:id', wrap((req, res) => {
  const ad = String(req.body.ad ?? '').trim();
  if (!ad) throw new Error('Depo adı zorunlu.');
  const r = db.prepare('UPDATE depolar SET ad = ? WHERE id = ?').run(ad, Number(req.params.id));
  if (!r.changes) throw new Error('Depo bulunamadı.');
  logH('depo yeniden adlandırıldı', '', '', ad);
  res.json({ ok: true });
}));

// Depo silinebilmesi için en az bir depo kalmalı ve içinde çuval olmamalı
router.delete('/api/depolar/:id', wrap((req, res) => {
  const id = Number(req.params.id);
  if (db.prepare('SELECT COUNT(*) AS n FROM depolar').get().n <= 1) throw new Error('En az bir depo kalmalı.');
  const dolu = db.prepare('SELECT COUNT(*) AS n FROM cuvallar WHERE depo_id = ?').get(id).n;
  if (dolu) throw new Error('Bu depoda çuval var. Önce çuvalları başka depoya taşıyın.');
  const ad = depoAd(id);
  db.prepare('DELETE FROM depolar WHERE id = ?').run(id);
  logH('depo silindi', '', '', ad);
  res.json({ ok: true });
}));

export default router;
