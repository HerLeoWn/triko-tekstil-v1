import { db } from './src/db.js';
import { sifreHash } from './src/auth.js';

const [, , kullanici, yeniSifre] = process.argv;

// Argüman yoksa mevcut kullanıcıları listeler
if (!kullanici) {
  const liste = db.prepare('SELECT ad, kullanici, rol, aktif FROM users ORDER BY ad').all();
  if (!liste.length) console.log('Hiç kullanıcı yok. Uygulama kurulum ekranını gösterecek.');
  liste.forEach((u) => console.log(`${u.kullanici}  |  ${u.ad}  |  ${u.rol}  |  ${u.aktif ? 'aktif' : 'pasif'}`));
  process.exit(0);
}

if (!yeniSifre || yeniSifre.length < 4) {
  console.log('Kullanım: node sifre-sifirla.js <kullanici> <yeni-sifre>  (şifre en az 4 karakter)');
  process.exit(1);
}

const u = db.prepare('SELECT id, ad FROM users WHERE kullanici = ?').get(kullanici.trim().toLowerCase());
if (!u) {
  console.log('Bu kullanıcı adıyla kayıt bulunamadı.');
  process.exit(1);
}

// Şifreyi değiştirir, hesabı tekrar aktif yapar ve açık oturumları kapatır
db.prepare('UPDATE users SET sifre = ?, aktif = 1 WHERE id = ?').run(sifreHash(yeniSifre), u.id);
db.prepare('DELETE FROM oturumlar WHERE kullanici_id = ?').run(u.id);
console.log(`${u.ad} için şifre değiştirildi. Yeni şifreyle giriş yapabilirsiniz.`);