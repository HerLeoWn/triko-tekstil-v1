// Bitenler: giden olup stokta kalmayan renkler
import express from 'express';
import { db } from '../db.js';
import { stokSeriByRenk } from '../services/stokkesim.js';
import { wrap } from '../lib/yardimcilar.js';

const router = express.Router();

router.get('/api/biten', wrap((req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const pairs = {};
  db.prepare('SELECT * FROM giden').all().forEach((g) => {
    const key = g.kod.toLowerCase() + '|' + g.renk.toLowerCase();
    const p = (pairs[key] ??= { kod: g.kod, renk: g.renk, seri: 0, cuval: 0, son: '' });
    p.seri += g.seri;
    p.cuval += g.cuval_adedi;
    if (g.tarih > p.son) p.son = g.tarih;
  });

  // Tüm depolardaki toplam stok (depo ayrımı yok)
  const stokCache = {};
  const stokOf = (kod) => (stokCache[kod.toLowerCase()] ??= stokSeriByRenk(kod));

  const items = Object.values(pairs).filter((p) => {
    if (q && !(p.kod.toLowerCase().includes(q) || p.renk.toLowerCase().includes(q))) return false;
    return (stokOf(p.kod)[p.renk.toLowerCase()] || 0) === 0;
  });

  const groups = {};
  items.forEach((p) => {
    const k = p.kod.toLowerCase();
    (groups[k] ??= { kod: p.kod, items: [] }).items.push(p);
  });
  res.json(Object.values(groups)
    .sort((a, b) => a.kod.localeCompare(b.kod, 'tr', { numeric: true }))
    .map((g) => ({ ...g, items: g.items.sort((a, b) => a.renk.localeCompare(b.renk, 'tr')) })));
}));

export default router;
