// Bildirim aboneliği: cihaz kaydı ve sunucunun genel anahtarı
import express from 'express';
import { wrap } from '../lib/yardimcilar.js';
import { vapidPublic, aboneEkle, aboneSil } from '../lib/push.js';

const router = express.Router();

router.get('/api/push/anahtar', wrap((req, res) => res.json({ anahtar: vapidPublic })));

router.post('/api/push/abone', wrap((req, res) => {
  const s = req.body;
  if (!s?.endpoint || !s?.keys?.p256dh || !s?.keys?.auth) throw new Error('Geçersiz bildirim aboneliği.');
  aboneEkle(req.kullanici.id, s);
  res.json({ ok: true });
}));

router.post('/api/push/abone-sil', wrap((req, res) => {
  if (req.body?.endpoint) aboneSil(String(req.body.endpoint));
  res.json({ ok: true });
}));

export default router;