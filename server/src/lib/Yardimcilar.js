import crypto from 'node:crypto';
import { db } from '../db.js';
import { getAktif } from '../auth.js';
import { stats } from '../stok.js';

export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const like = (q = '') => `%${q}%`;
export const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

// Ana renk: çuvaldaki en çok seri olan renk (kayıt için kullanılır)
export const anaRenk = (list) => [...list].sort((a, b) => b.seri - a.seri)[0].renk;

export const guvenliParse = (s, varsayilan) => {
  try { return s ? JSON.parse(s) : varsayilan; } catch { return varsayilan; }
};

// Hata olursa 400 ve hata mesajı döner
export const wrap = (fn) => (req, res) => {
  try { fn(req, res); }
  catch (e) { res.status(400).json({ error: e.message }); }
};

// İşlem geçmişine (hareketler) kayıt yazar
export const logH = (tur, kod, renk, aciklama) =>
  db.prepare('INSERT INTO hareketler (tur, kod, renk, aciklama, tarih, kullanici) VALUES (?,?,?,?,?,?)')
    .run(tur, kod, renk, aciklama, now(), getAktif());

/* ---------- Depo ---------- */

export const depoListe = () => db.prepare('SELECT id, ad, sira FROM depolar ORDER BY sira, id').all();
export const depoAd = (id) => db.prepare('SELECT ad FROM depolar WHERE id = ?').get(Number(id))?.ad ?? '-';
export const depoGecerli = (id) => {
  const d = db.prepare('SELECT id FROM depolar WHERE id = ?').get(Number(id));
  if (!d) throw new Error('Geçersiz depo.');
  return d.id;
};

/* ---------- Ürün ---------- */

export const urunAd = (kod) => db.prepare('SELECT ad FROM urunler WHERE kod = ?').get(kod)?.ad ?? '';

export const urunKaydet = (kod, ad) => {
  const a = String(ad ?? '').trim();
  db.prepare(`INSERT INTO urunler (kod, ad) VALUES (?,?)
              ON CONFLICT(kod) DO UPDATE SET ad = CASE WHEN excluded.ad <> '' THEN excluded.ad ELSE urunler.ad END`)
    .run(kod, a);
};

/* ---------- Çuval ---------- */

// İstekten gelen renk/seri listesini temizler
export const parcalarGelen = (liste) => (Array.isArray(liste) ? liste : [])
  .map((p) => ({ renk: String(p.renk ?? '').trim(), seri: parseInt(p.seri, 10) || 0 }))
  .filter((p) => p.renk && p.seri > 0);

// Bir çuvalın renk dağılımı. Eski kayıtlarda parcalar yoksa tek renk varsayılır.
export const parcaListesi = (r) => {
  const seriler = guvenliParse(r.seriler, []);
  const p = guvenliParse(r.parcalar, null);
  return p?.length ? p : [{ renk: r.renk, seri: seriler.length }];
};

// Veritabanı satırını arayüzün kullandığı çuval nesnesine çevirir
export const toCuval = (r) => {
  const seriler = guvenliParse(r.seriler, []);
  const parcalar = guvenliParse(r.parcalar, null);
  const liste = parcalar?.length ? parcalar : [{ renk: r.renk ?? '', seri: seriler.length }];
  const cuvalIci = Number(r.cuval_ici) || seriler.length || 0;
  return {
    id: r.id,
    kod: String(r.kod ?? ''),
    ad: urunAd(r.kod),
    renk: String(r.renk ?? ''),
    depoId: Number(r.depo_id ?? 1),
    cuvalIci,
    durum: r.durum ?? 'acik',
    olusturma: r.olusturma ?? '',
    guncelleme: r.guncelleme ?? r.olusturma ?? '',
    seriler,
    ...stats(seriler),
    kismi: seriler.length < cuvalIci,
    parcalar: liste,
    etiket: liste.map((p) => `${p.renk} ${p.seri}`).join(' + '),
  };
};

export const insertCuval = (kod, renk, cuvalIci, seriler, t, parcalar = null, depoId = 1) =>
  db.prepare(`INSERT INTO cuvallar (id, kod, renk, cuval_ici, seriler, durum, olusturma, guncelleme, parcalar, depo_id)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(uid(), kod, renk, cuvalIci, JSON.stringify(seriler), 'acik', t, t,
      parcalar ? JSON.stringify(parcalar) : null, depoId);
