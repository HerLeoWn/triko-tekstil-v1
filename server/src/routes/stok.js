// Stok özeti: depo dağılımlı ürün grupları ve toplamlar
import express from 'express';
import { db } from '../db.js';
import { toCuval, depoListe, wrap } from '../lib/Yardimcilar.js';

const router = express.Router();

router.get('/api/stok', wrap((req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const list = db.prepare('SELECT * FROM cuvallar').all().map((r) => toCuval(r))
    .filter((c) => !q
      || c.kod.toLowerCase().includes(q)
      || c.ad.toLowerCase().includes(q)
      || c.parcalar.some((p) => p.renk.toLowerCase().includes(q)));

  const groups = {};
  const totals = { cuval: 0, kismi: 0, seri: 0, eksik: 0 };

  for (const c of list) {
    const t = c.kismi ? 'kismi' : 'cuval';
    const g = (groups[c.kod.toLowerCase()] ??= {
      kod: c.kod, ad: c.ad, renks: {}, depoSeri: {}, cuval: 0, kismi: 0, seri: 0, eksik: 0,
    });
    g[t]++; g.seri += c.seri; g.eksik += c.eksik;
    g.depoSeri[c.depoId] = (g.depoSeri[c.depoId] || 0) + c.seri;
    totals[t]++; totals.seri += c.seri; totals.eksik += c.eksik;

    let eksikKalan = c.eksik;
    for (const p of c.parcalar) {
      const r = (g.renks[p.renk.toLowerCase()] ??= {
        renk: p.renk, cuval: 0, kismi: 0, seri: 0, eksik: 0, depoSeri: {},
      });
      const e = Math.min(eksikKalan, p.seri);
      eksikKalan -= e;
      r[t]++; r.seri += p.seri; r.eksik += e;
      r.depoSeri[c.depoId] = (r.depoSeri[c.depoId] || 0) + p.seri;
    }
  }

  const sorted = Object.values(groups)
    .map((g) => ({ ...g, renks: Object.values(g.renks).sort((a, b) => a.renk.localeCompare(b.renk, 'tr')) }))
    .sort((a, b) => a.kod.localeCompare(b.kod, 'tr', { numeric: true }));
  res.json({ depolar: depoListe(), totals, groups: sorted });
}));

export default router;
