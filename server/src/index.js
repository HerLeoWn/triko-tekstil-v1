// Uygulamanın giriş noktası: ara katmanları kurar, rotaları bağlar, sunucuyu başlatır
import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import fasoncuRouter from './routes/fasoncu.js';

import { db, ilkKez } from './db.js';
import { listele, geriYukle, islemOncesi, baslatOtomatikYedek } from './yedek.js';
import { kimlik, yetkiKontrol, sifreHash } from './auth.js';
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
import sifreRouter from './routes/sifre.js';

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
    cuvallarRouter, gidenRouter, bitenRouter, stokRouter, depolarRouter, urunlerRouter, hareketlerRouter, yedekRouter, kullanicilarRouter, raporRouter, gorevlerRouter, sifreRouter, fasoncuRouter,
].forEach((r) => app.use(r));

/* ---------- Acil durum şifre sıfırlama ---------- */

// Railway'de SIFRE_SIFIRLA="kullaniciadi:gecicisifre" tanımlıysa o kullanıcının şifresi bu değere döner.
// Aynı değer iki kez uygulanmaz. Değişken kalsa bile her yeniden başlatmada sıfırlama olmaz.
// Giriş yaptıktan sonra Hesabım'dan yeni şifre belirleyip değişkeni silin.
function acilSifreSifirla() {
  const deger = process.env.SIFRE_SIFIRLA;
  if (!deger) return;

  db.exec('CREATE TABLE IF NOT EXISTS ayarlar (anahtar TEXT PRIMARY KEY, deger TEXT)');
  // Değerin kendisi değil, özeti saklanır
  const parmak = crypto.createHash('sha256').update(deger).digest('hex');
  const son = db.prepare("SELECT deger FROM ayarlar WHERE anahtar = 'son_sifirlama'").get()?.deger;
  if (son === parmak) return;

  const [k, ...rest] = deger.split(':');
  const yeni = rest.join(':');
  if (!k || yeni.length < 4) {
    console.log('SIFRE_SIFIRLA biçimi hatalı. Örnek: kullaniciadi:gecicisifre (şifre en az 4 karakter)');
    return;
  }

  const r = db.prepare('UPDATE users SET sifre = ? WHERE kullanici = ?')
    .run(sifreHash(yeni), k.trim().toLowerCase());
  db.prepare(`INSERT INTO ayarlar (anahtar, deger) VALUES ('son_sifirlama', ?)
              ON CONFLICT(anahtar) DO UPDATE SET deger = excluded.deger`).run(parmak);
  console.log(r.changes ? `Şifre sıfırlandı: ${k}` : `Kullanıcı bulunamadı: ${k}`);
}
acilSifreSifirla();

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

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`API çalışıyor: http://localhost:${PORT}`);
  if (process.pkg) {
    const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    exec(`start "" "${edge}" --app=http://localhost:${PORT} --new-window`);
  }
});