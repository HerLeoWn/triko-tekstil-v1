// GEÇİCİ: veritabanını bilgisayardan sunucuya yüklemek için.
// Yalnızca VERI_YUKLE_ANAHTAR ortam değişkeni tanımlıysa ve doğru anahtar gönderilirse çalışır.
// Yüklenen dosya bir sonraki başlatmada veritabanının yerine geçer.
// Taşıma bitince bu dosyayı ve index.js'deki iki satırı silin.
import express from 'express';
import fs from 'node:fs';

const router = express.Router();

router.post('/api/veri-yukle',
  express.raw({ type: 'application/octet-stream', limit: '200mb' }),
  (req, res) => {
    const anahtar = process.env.VERI_YUKLE_ANAHTAR;
    if (!anahtar || req.get('x-anahtar') !== anahtar) {
      return res.status(403).json({ error: 'Yetkisiz.' });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length < 100) {
      return res.status(400).json({ error: 'Dosya boş ya da geçersiz.' });
    }
    const yol = (process.env.DB_PATH || '/data/triko.db') + '.yeni';
    fs.writeFileSync(yol, req.body);
    res.json({ ok: true, boyut: req.body.length, not: 'Şimdi servisi yeniden başlatın.' });
  });

export default router;