// Uygulama içi toast bildirimleri: rolüne göre kısa süreli uyarılar
import { db } from '../db.js';
import { uid } from './yardimcilar.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS toast (
    id TEXT PRIMARY KEY,
    hedef_rol TEXT NOT NULL,
    baslik TEXT NOT NULL,
    metin TEXT,
    tarih TEXT NOT NULL
  );
`);

export function toastEkle(hedefRol, baslik, metin = '') {
  db.prepare('INSERT INTO toast (id, hedef_rol, baslik, metin, tarih) VALUES (?,?,?,?,?)')
    .run(uid(), hedefRol, baslik, metin, new Date().toISOString());
  // İki günden eski kayıtlar temizlenir
  db.prepare('DELETE FROM toast WHERE tarih < ?')
    .run(new Date(Date.now() - 2 * 86400000).toISOString());
}

// Verilen zamandan sonra oluşmuş kayıtları, eskiden yeniye sıralı döndürür
export function toastListele(hedefRol, since) {
  return db.prepare('SELECT * FROM toast WHERE hedef_rol = ? AND tarih > ? ORDER BY tarih ASC LIMIT 20')
    .all(hedefRol, since);
}