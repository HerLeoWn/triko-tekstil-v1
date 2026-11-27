// Oturum, şifre, kullanıcı ve rol yetkileri
import crypto from 'node:crypto';
import { db } from './db.js';

// yonetici: Depo sorumlusu (gelen malı onaylar, fasoncu takibi, fason hareketleri) · muhasebe: görev atar · fasoncu: gelen mal ve depo hareketi bildirir, rotasyon yönetir, konum paylaşır
export const ROLLER = ['yonetici', 'muhasebe', 'fasoncu'];
const OTURUM_GUN = 30;
const COOKIE = 'triko_oturum';
const HERKESE_ACIK = ['/api/kurulum', '/api/giris', '/api/cikis', '/api/ben', '/api/sifre-talebi'];
// Şifresini yenilemesi gereken kullanıcının erişebildiği yollar
const SIFRE_ISTISNA = ['/api/hesap', '/api/ben', '/api/cikis'];
// Fasoncu GET ile yalnızca kendi alanındaki verilere ulaşır (stok, çuval, giden vb. görmez).
// Depo konumu, fasoncunun tahmini süresi için açıktır.
const FASONCU_GET = ['/api/fasoncu', '/api/konum/depo', '/api/push'];

let aktifAd = 'sistem';
export const getAktif = () => aktifAd;

export function sifreHash(sifre) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(sifre, salt, 64).toString('hex')}`;
}

function sifreDogrula(sifre, kayit) {
  const [salt, hash] = String(kayit).split(':');
  if (!salt || !hash) return false;
  const yeni = crypto.scryptSync(sifre, salt, 64);
  const eski = Buffer.from(hash, 'hex');
  return eski.length === yeni.length && crypto.timingSafeEqual(eski, yeni);
}

export const kullaniciSayisi = () =>
  db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

export function kullaniciOlustur({ ad, kullanici, sifre, rol = 'fasoncu', sifreDegistir = false }) {
  const a = String(ad ?? '').trim();
  const k = String(kullanici ?? '').trim().toLowerCase();
  if (!a || !k) throw new Error('Ad ve kullanıcı adı zorunlu.');
  if (!/^[a-z0-9_.-]{3,}$/.test(k)) throw new Error('Kullanıcı adı en az 3 karakter olmalı (harf, rakam, _ . -).');
  if (String(sifre ?? '').length < 4) throw new Error('Şifre en az 4 karakter olmalı.');
  if (!ROLLER.includes(rol)) throw new Error('Geçersiz rol.');
  if (db.prepare('SELECT id FROM users WHERE kullanici = ?').get(k)) {
    throw new Error('Bu kullanıcı adı zaten var.');
  }
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, ad, kullanici, sifre, rol, aktif, olusturma, sifre_degistir) VALUES (?,?,?,?,?,1,?,?)')
    .run(id, a, k, sifreHash(String(sifre)), rol, new Date().toISOString(), sifreDegistir ? 1 : 0);
  return { id, ad: a, kullanici: k, rol };
}

export function girisDogrula(kullanici, sifre) {
  const u = db.prepare('SELECT * FROM users WHERE kullanici = ? AND aktif = 1')
    .get(String(kullanici ?? '').trim().toLowerCase());
  if (!u || !sifreDogrula(String(sifre ?? ''), u.sifre)) return null;
  return {
    id: u.id, ad: u.ad, kullanici: u.kullanici, rol: u.rol,
    sifreDegistir: !!u.sifre_degistir,
  };
}

export function oturumAc(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO oturumlar (token, kullanici_id, tarih) VALUES (?,?,?)')
    .run(token, userId, new Date().toISOString());
  return token;
}

export const oturumKapat = (token) =>
  db.prepare('DELETE FROM oturumlar WHERE token = ?').run(token);

export const kullaniciOturumlariniKapat = (userId) =>
  db.prepare('DELETE FROM oturumlar WHERE kullanici_id = ?').run(userId);

function cookieOku(req, ad) {
  for (const parca of (req.headers.cookie || '').split(';')) {
    const [k, ...v] = parca.trim().split('=');
    if (k === ad) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function cookieYaz(res, token) {
  res.setHeader('Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${OTURUM_GUN * 86400}`);
}

export function cookieSil(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Her istekte oturumu çözer. Loglarda görünecek kullanıcı adını da ayarlar.
export function kimlik(req, res, next) {
  const token = cookieOku(req, COOKIE);
  const sinir = new Date(Date.now() - OTURUM_GUN * 86400000).toISOString();
  const row = token
    ? db.prepare(`SELECT u.id, u.ad, u.kullanici, u.rol, u.sifre_degistir FROM oturumlar o
                  JOIN users u ON u.id = o.kullanici_id
                  WHERE o.token = ? AND o.tarih > ? AND u.aktif = 1`).get(token, sinir)
    : null;
  req.kullanici = row
    ? { id: row.id, ad: row.ad, kullanici: row.kullanici, rol: row.rol, sifreDegistir: !!row.sifre_degistir }
    : null;
  req.oturumToken = token;
  aktifAd = row?.ad ?? 'sistem';
  next();
}

// Hangi roller hangi isteği yapabilir. Liste null ise giriş yapmış herkes yapabilir.
function izinliRoller(method, path) {
  if (path === '/api/hesap') return null;
  if (path.startsWith('/api/fasoncu')) return ['fasoncu'];
  if (path.startsWith('/api/kullanicilar')) return ['yonetici'];
  if (path.startsWith('/api/sifre-talepleri')) return ['yonetici'];
  if (path.startsWith('/api/mesajlar') && method !== 'GET') return ['yonetici', 'muhasebe'];
  if (path.startsWith('/api/gorevler') && method !== 'GET') {
    // Görev atama ve iptal muhasebeye ait; kabul, red ve gönderim depo sorumlusuna ait
    if (path === '/api/gorevler' || path.endsWith('/iptal')) return ['muhasebe'];
    return ['yonetici'];
  }
  if (path.startsWith('/api/fason-islemler')) return ['yonetici'];
  if (path.startsWith('/api/konum/depo') && method !== 'GET') return ['yonetici'];
  if (path.startsWith('/api/konum/fasoncu')) return method === 'GET' ? ['yonetici'] : ['fasoncu'];
  if (path.startsWith('/api/gelen-mallar')) return ['yonetici'];
  if (method === 'GET') return null;
  if (path.startsWith('/api/yedek') || path === '/api/geri-al') return ['yonetici'];
  if (path.startsWith('/api/giden/') && method === 'PUT') return ['yonetici', 'muhasebe'];
  return ['yonetici'];
}

export function yetkiKontrol(req, res, next) {
  if (!req.path.startsWith('/api/') || HERKESE_ACIK.includes(req.path)) return next();
  if (!req.kullanici) return res.status(401).json({ error: 'Oturum gerekli.' });
  if (req.kullanici.sifreDegistir && !SIFRE_ISTISNA.includes(req.path)) {
    return res.status(403).json({ error: 'Önce yeni şifrenizi belirlemeniz gerekiyor.', sifreDegistir: true });
  }
  if (req.kullanici.rol === 'fasoncu' && req.method === 'GET'
      && !FASONCU_GET.some((p) => req.path.startsWith(p))) {
    return res.status(403).json({ error: 'Bu bilgi için yetkiniz yok.' });
  }
  const roller = izinliRoller(req.method, req.path);
  if (roller && !roller.includes(req.kullanici.rol)) {
    return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
  }
  next();
}