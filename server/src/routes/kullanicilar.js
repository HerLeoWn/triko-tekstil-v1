// Oturum (ben, kurulum, giriş, çıkış) ve kullanıcı yönetimi
import express from 'express';
import { db } from '../db.js';
import {
  kullaniciSayisi, kullaniciOlustur, girisDogrula, oturumAc, oturumKapat,
  kullaniciOturumlariniKapat, cookieYaz, cookieSil, sifreHash, ROLLER,
} from '../auth.js';
import { logH, wrap } from '../lib/yardimcilar.js';

const router = express.Router();

/* ---------- Oturum ---------- */

router.get('/api/ben', (req, res) => {
  if (!kullaniciSayisi()) return res.json({ durum: 'kurulum' });
  if (!req.kullanici) return res.status(401).json({ error: 'Oturum yok.' });
  res.json({ durum: 'oturum', kullanici: req.kullanici });
});

router.post('/api/kurulum', wrap((req, res) => {
  if (kullaniciSayisi()) throw new Error('Kurulum zaten tamamlanmış.');
  const u = kullaniciOlustur({ ...req.body, rol: 'yonetici' });
  cookieYaz(res, oturumAc(u.id));
  res.status(201).json({ kullanici: u });
}));

router.post('/api/giris', wrap((req, res) => {
  const u = girisDogrula(req.body.kullanici, req.body.sifre);
  if (!u) return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
  cookieYaz(res, oturumAc(u.id));
  res.json({ kullanici: u });
}));

router.post('/api/cikis', (req, res) => {
  if (req.oturumToken) oturumKapat(req.oturumToken);
  cookieSil(res);
  res.json({ ok: true });
});

/* ---------- Kullanıcılar (yalnızca yönetici, yetki auth.js'te kontrol edilir) ---------- */

router.get('/api/kullanicilar', wrap((req, res) => {
  res.json(db.prepare('SELECT id, ad, kullanici, rol, aktif FROM users ORDER BY ad').all());
}));

router.post('/api/kullanicilar', wrap((req, res) => {
  const u = kullaniciOlustur(req.body);
  logH('kullanıcı eklendi', '', '', `${u.ad} (${u.rol})`);
  res.status(201).json(u);
}));

// Güncelleme: ad, kullanıcı adı, rol, aktiflik ve şifre. Gönderilmeyen alanlar değişmez.
router.put('/api/kullanicilar/:id', wrap((req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) throw new Error('Kullanıcı bulunamadı.');

  const ad = req.body.ad === undefined ? u.ad : String(req.body.ad).trim();
  const kullanici = req.body.kullanici === undefined
    ? u.kullanici
    : String(req.body.kullanici).trim().toLowerCase();
  if (!ad) throw new Error('Ad soyad boş olamaz.');
  if (!/^[a-z0-9_.-]{3,}$/.test(kullanici)) {
    throw new Error('Kullanıcı adı en az 3 karakter olmalı (harf, rakam, _ . -).');
  }
  if (kullanici !== u.kullanici && db.prepare('SELECT id FROM users WHERE kullanici = ?').get(kullanici)) {
    throw new Error('Bu kullanıcı adı zaten var.');
  }

  const rol = req.body.rol ?? u.rol;
  const aktif = req.body.aktif === undefined ? u.aktif : (req.body.aktif ? 1 : 0);
  if (!ROLLER.includes(rol)) throw new Error('Geçersiz rol.');

  // Son aktif yöneticinin yetkisi alınamaz
  const yoneticiKaybi = u.rol === 'yonetici' && u.aktif === 1 && (rol !== 'yonetici' || aktif === 0);
  if (yoneticiKaybi) {
    const n = db.prepare("SELECT COUNT(*) AS n FROM users WHERE rol = 'yonetici' AND aktif = 1").get().n;
    if (n <= 1) throw new Error('En az bir aktif yönetici kalmalı.');
  }

  db.prepare('UPDATE users SET ad = ?, kullanici = ?, rol = ?, aktif = ? WHERE id = ?')
    .run(ad, kullanici, rol, aktif, u.id);

  if (req.body.sifre) {
    if (String(req.body.sifre).length < 4) throw new Error('Şifre en az 4 karakter olmalı.');
    db.prepare('UPDATE users SET sifre = ? WHERE id = ?').run(sifreHash(String(req.body.sifre)), u.id);
    kullaniciOturumlariniKapat(u.id);
  }
  if (!aktif) kullaniciOturumlariniKapat(u.id);

  const degisenler = [];
  if (ad !== u.ad) degisenler.push('ad');
  if (kullanici !== u.kullanici) degisenler.push('kullanıcı adı');
  if (req.body.sifre) degisenler.push('şifre');
  logH('kullanıcı güncellendi', '', '',
    `${ad} (${kullanici}): ${rol}${aktif ? '' : ', pasif'}${degisenler.length ? ', değişen: ' + degisenler.join(', ') : ''}`);
  res.json({ ok: true });
}));

router.delete('/api/kullanicilar/:id', wrap((req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!u) throw new Error('Kullanıcı bulunamadı.');
  if (req.kullanici?.id === u.id) throw new Error('Kendi hesabınızı silemezsiniz.');

  if (u.rol === 'yonetici' && u.aktif === 1) {
    const n = db.prepare("SELECT COUNT(*) AS n FROM users WHERE rol = 'yonetici' AND aktif = 1").get().n;
    if (n <= 1) throw new Error('En az bir aktif yönetici kalmalı.');
  }

  kullaniciOturumlariniKapat(u.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
  logH('kullanıcı silindi', '', '', `${u.ad} (${u.kullanici})`);
  res.json({ ok: true });
}));

export default router;