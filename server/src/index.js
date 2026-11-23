// Uygulamanın giriş noktası: ara katmanları kurar, rotaları bağlar, sunucuyu başlatır
import { exec } from 'node:child_process';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ilkKez } from './db.js';
import { listele, geriYukle, islemOncesi, baslatOtomatikYedek } from './yedek.js';
import { kimlik, yetkiKontrol } from './auth.js';
import { olaylarRoute, degisiklikBildirimi } from './lib/sse.js';

import cuvallarRouter from './routes/cuvallar.js';
import gidenRouter from './routes/giden.js';
import bitenRouter from './routes/biten.js';
import stokRouter from './routes/stok.js';
import depolarRouter from './routes/depolar.js';
import urunlerRouter from './routes/urunler.js';
import hareketlerRouter from './routes/hareketler.js';
import yedekRouter from './routes/yedek.js';
import kullanicilarRouter from './routes/kullanicilar.js';
import raporRouter from './routes/rapor.js';
import mesajlarRouter from './routes/mesajlar.js';
import gorevlerRouter from './routes/gorevler.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(kimlik);            // oturumu çöz
app.use(yetkiKontrol);      // rol kontrolü
app.use(mesajlarRouter);    // mesajlar geri al (undo) kaydına girmez
app.use(islemOncesi);       // veri değiştiren isteklerden önce anlık görüntü

// Canlı güncelleme
app.get('/api/olaylar', olaylarRoute);
app.use(degisiklikBildirimi);

// İş rotaları
[
  cuvallarRouter, gidenRouter, bitenRouter, stokRouter, depolarRouter, urunlerRouter,
  hareketlerRouter, yedekRouter, kullanicilarRouter, raporRouter, gorevlerRouter,
].forEach((r) => app.use(r));

// Veritabanı dosyası silinmişse son yedek otomatik yüklenir, sonra periyodik yedek başlar
if (ilkKez && listele().length) {
  const y = geriYukle(undefined, { guvenlik: false });
  console.log(`Veritabanı bulunamadı, son yedek otomatik yüklendi: ${y.ad}`);
}
baslatOtomatikYedek();

/* ---------- Arayüz (derlenmiş client/dist) ---------- */

const here = path.dirname(fileURLToPath(import.meta.url));
const arayuzKlasoru = process.pkg
  ? path.join(path.dirname(process.execPath), '..', 'client', 'dist')
  : path.join(here, '..', '..', 'client', 'dist');

if (fs.existsSync(arayuzKlasoru)) {
  app.use(express.static(arayuzKlasoru));
  // Bilinmeyen sayfa adresleri index.html'e gider (React yönlendirmesi için)
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(arayuzKlasoru, 'index.html'));
  });
} else {
  console.log('Uyarı: client/dist bulunamadı. Önce client klasöründe "npm run build" çalıştırın.');
}

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API çalışıyor: http://localhost:${PORT}`);
  if (process.pkg) {
    const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    exec(`start "" "${edge}" --app=http://localhost:${PORT} --new-window`);
  }
});