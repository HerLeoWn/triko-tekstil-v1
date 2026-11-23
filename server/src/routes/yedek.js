// Yedek al / yedekten yükle ve son işlemi geri al
import express from 'express';
import { yedekAl, listele, geriYukle, geriAl, geriAlDurum } from '../yedek.js';
import { wrap } from '../lib/yardimcilar.js';

const router = express.Router();

router.get('/api/yedek', wrap((req, res) => res.json(listele())));
router.post('/api/yedek', wrap((req, res) => res.status(201).json({ ad: yedekAl() })));
router.post('/api/yedek/geri-yukle', wrap((req, res) => res.json(geriYukle())));

router.get('/api/geri-al', wrap((req, res) => res.json(geriAlDurum())));
router.post('/api/geri-al', wrap((req, res) => {
  geriAl();
  res.json({ ok: true });
}));

export default router;
