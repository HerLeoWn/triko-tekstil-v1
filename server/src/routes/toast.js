// Toast kayıtlarını, isteyen kullanıcının rolüne göre verir
import express from 'express';
import { wrap } from '../lib/yardimcilar.js';
import { toastListele } from '../lib/toast.js';

const router = express.Router();

router.get('/api/toast', wrap((req, res) => {
  const since = String(req.query.since || '1970-01-01T00:00:00.000Z');
  res.json(toastListele(req.kullanici.rol, since).map((t) => ({
    id: t.id,
    baslik: t.baslik,
    metin: t.metin ?? '',
    tarih: t.tarih,
  })));
}));

export default router;