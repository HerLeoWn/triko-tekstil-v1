// Şifremi unuttum: giriş ekranından gelen talep depo sorumlusunun onayına düşer.
// Yeni şifre yalnızca şifreli özet olarak saklanır. Depo sorumlusu da kullanıcı da şifreyi göremez.
import express from 'express';
import { db } from '../db.js';
import './mesajlar.js'; // mesajlar tablosu hazır olsun
import { sifreHash } from '../auth.js';
import { wrap, uid, now, logH } from '../lib/yardimcilar.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS sifre_talepleri (
    id TEXT PRIMARY KEY,
    kullanici_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    sifre TEXT NOT NULL,
    tarih TEXT NOT NULL
  );
`);

const router = express.Router();

// Depo sorumlusuna mesaj düşer
const yoneticiyeBildir = (icerik) =>
  db.prepare(`INSERT INTO mesajlar (id, tur, gonderen_id, gonderen_ad, alici_id, alici_rol, ref_gun, icerik, tarih)
              VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(uid(), 'sifre', null, 'Sistem', null, 'yonetici', null, icerik, now());

// Giriş ekranından. Cevap her durumda aynıdır, hesabın var olup olmadığı belli olmaz.
router.post('/api/sifre-talebi', wrap((req, res) => {
  const kullanici = String(req.body.kullanici ?? '').trim().toLowerCase();
  const yeniSifre = String(req.body.yeniSifre ?? '');
  if (yeniSifre.length < 4) throw new Error('Yeni şifre en az 4 karakter olmalı.');

  const u = db.prepare('SELECT * FROM users WHERE kullanici = ? AND aktif = 1').get(kullanici);
  // Depo sorumlusu bu yolla şifresini sıfırlayamaz
  if (u && u.rol !== 'yonetici') {
    db.transaction(() => {
      db.prepare('DELETE FROM sifre_talepleri WHERE kullanici_id = ?').run(u.id);
      db.prepare('INSERT INTO sifre_talepleri (id, kullanici_id, sifre, tarih) VALUES (?,?,?,?)')
        .run(uid(), u.id, sifreHash(yeniSifre), now());
      yoneticiyeBildir(`${u.ad} (${u.kullanici}) şifre değişikliği talebinde bulundu. Kullanıcılar sekmesinden onaylayabilir ya da reddedebilirsiniz.`);
    })();
  }

  res.json({
    ok: true,
    mesaj: 'Talebiniz depo sorumlusuna iletildi. Onaylandığında yeni şifrenizle giriş yapabilirsiniz.',
  });
}));

// Depo sorumlusu: bekleyen talepler. Şifre hiçbir zaman gösterilmez.
router.get('/api/sifre-talepleri', wrap((req, res) => {
  res.json(db.prepare(`
    SELECT t.id, t.tarih, u.ad, u.kullanici
    FROM sifre_talepleri t JOIN users u ON u.id = t.kullanici_id
    ORDER BY t.tarih DESC
  `).all());
}));

// Evet: talepteki şifre aktif olur, kullanıcının açık oturumları kapanır
router.post('/api/sifre-talepleri/:id/onayla', wrap((req, res) => {
  const t = db.prepare('SELECT * FROM sifre_talepleri WHERE id = ?').get(req.params.id);
  if (!t) throw new Error('Talep bulunamadı ya da zaten işlendi.');
  const u = db.prepare('SELECT ad, kullanici FROM users WHERE id = ?').get(t.kullanici_id);

  db.transaction(() => {
    db.prepare('UPDATE users SET sifre = ?, sifre_degistir = 0 WHERE id = ?').run(t.sifre, t.kullanici_id);
    db.prepare('DELETE FROM oturumlar WHERE kullanici_id = ?').run(t.kullanici_id);
    db.prepare('DELETE FROM sifre_talepleri WHERE kullanici_id = ?').run(t.kullanici_id);
  })();

  logH('şifre talebi onaylandı', '', '', `${u?.ad ?? ''} (${u?.kullanici ?? ''})`);
  res.json({ ok: true });
}));

// Hayır: talep silinir, eski şifre geçerli kalır
router.post('/api/sifre-talepleri/:id/reddet', wrap((req, res) => {
  const t = db.prepare('SELECT * FROM sifre_talepleri WHERE id = ?').get(req.params.id);
  if (!t) throw new Error('Talep bulunamadı ya da zaten işlendi.');
  const u = db.prepare('SELECT ad, kullanici FROM users WHERE id = ?').get(t.kullanici_id);

  db.prepare('DELETE FROM sifre_talepleri WHERE id = ?').run(t.id);
  logH('şifre talebi reddedildi', '', '', `${u?.ad ?? ''} (${u?.kullanici ?? ''})`);
  res.json({ ok: true });
}));

export default router;