// İşlem geçmişi (hareketler)
import express from 'express';
import { db } from '../db.js';
import { wrap } from '../lib/yardimcilar.js';

const router = express.Router();

router.get('/api/hareketler', wrap((req, res) => {
  res.json(db.prepare('SELECT * FROM hareketler ORDER BY id DESC LIMIT 15').all());
}));

router.delete('/api/hareketler', wrap((req, res) => {
  db.prepare('DELETE FROM hareketler').run();
  res.json({ ok: true });
}));

export default router;
