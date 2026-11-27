import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// Veritabanı yolu: önce DB_PATH ortam değişkenine bakılır (bulut sunucu için).
// Yoksa paketli .exe'de .exe'nin yanındaki "veri" klasörü, geliştirmede server klasörü kullanılır.
const veriKlasoru = process.pkg
  ? path.join(path.dirname(process.execPath), 'veri')
  : path.join(here, '..');
const dbYolu = process.env.DB_PATH || path.join(veriKlasoru, 'triko.db');
fs.mkdirSync(path.dirname(dbYolu), { recursive: true });

// Yükleme bekleyen veritabanı varsa (veri-yukle ile gelen) önce onu yerine koy
const bekleyen = dbYolu + '.yeni';
if (fs.existsSync(bekleyen)) {
  for (const ek of ['', '-wal', '-shm']) fs.rmSync(dbYolu + ek, { force: true });
  fs.renameSync(bekleyen, dbYolu);
}

export const ilkKez = !fs.existsSync(dbYolu);

const raw = new DatabaseSync(dbYolu);
raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = {
  exec: (sql) => raw.exec(sql),
  prepare: (sql) => raw.prepare(sql),
  transaction(fn) {
    return (...args) => {
      raw.exec('BEGIN');
      try {
        const result = fn(...args);
        raw.exec('COMMIT');
        return result;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    };
  },
};

db.exec(`
  CREATE TABLE IF NOT EXISTS cuvallar (
    id TEXT PRIMARY KEY,
    kod TEXT NOT NULL,
    renk TEXT NOT NULL,
    cuval_ici INTEGER NOT NULL,
    seriler TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'acik',
    olusturma TEXT NOT NULL,
    guncelleme TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS giden (
    id TEXT PRIMARY KEY,
    kod TEXT NOT NULL,
    renk TEXT NOT NULL,
    cuval_adedi INTEGER NOT NULL,
    seri INTEGER NOT NULL,
    tarih TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS giden_kalemler (
    giden_id TEXT NOT NULL REFERENCES giden(id) ON DELETE CASCADE,
    boyut INTEGER NOT NULL,
    cuval_ici INTEGER NOT NULL,
    adet INTEGER NOT NULL,
    stok INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS hareketler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tur TEXT,
    kod TEXT,
    renk TEXT,
    aciklama TEXT,
    tarih TEXT
  );

  CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aciklama TEXT,
    tarih TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    ad TEXT NOT NULL,
    kullanici TEXT NOT NULL UNIQUE,
    sifre TEXT NOT NULL,
    rol TEXT NOT NULL,
    aktif INTEGER NOT NULL DEFAULT 1,
    olusturma TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS oturumlar (
    token TEXT PRIMARY KEY,
    kullanici_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tarih TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS depolar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    sira INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS urunler (
    kod TEXT PRIMARY KEY,
    ad TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_cuval_kod ON cuvallar(kod COLLATE NOCASE, renk COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_giden_kod ON giden(kod COLLATE NOCASE, renk COLLATE NOCASE);
`);

// Eski veritabanlarına sonradan eklenen sütunlar (zaten varsa atlanır)
for (const sql of [
  'ALTER TABLE cuvallar ADD COLUMN parcalar TEXT',
  'ALTER TABLE giden ADD COLUMN cuval_ici INTEGER',
  'ALTER TABLE giden ADD COLUMN stok INTEGER DEFAULT 1',
  'ALTER TABLE hareketler ADD COLUMN kullanici TEXT',
  'ALTER TABLE cuvallar ADD COLUMN depo_id INTEGER DEFAULT 1',
  'ALTER TABLE giden ADD COLUMN depo_id INTEGER',
  'ALTER TABLE users ADD COLUMN sifre_degistir INTEGER DEFAULT 0',
]) {
  try { raw.exec(sql); } catch {}
}

// İlk kurulumda varsayılan depolar (adlarını sonra değiştirebilirsiniz)
if (db.prepare('SELECT COUNT(*) AS n FROM depolar').get().n === 0) {
  ['Ana depo', 'Otopark 1', 'Otopark 2', 'Alt depo'].forEach((ad, i) =>
    db.prepare('INSERT INTO depolar (ad, sira) VALUES (?,?)').run(ad, i + 1));
}

// Depo bilgisi olmayan eski kayıtlar Ana depoya alınır, mevcut ürün kodları listeye eklenir
raw.exec('UPDATE cuvallar SET depo_id = 1 WHERE depo_id IS NULL');
raw.exec('UPDATE giden SET depo_id = 1 WHERE depo_id IS NULL');
raw.exec("INSERT OR IGNORE INTO urunler (kod, ad) SELECT DISTINCT kod, '' FROM cuvallar");