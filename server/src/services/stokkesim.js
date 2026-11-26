// Stok düşme, geri ekleme ve renk toplamları. Giden kayıtlarının kalbi.
import { db } from '../db.js';
import { FULL } from '../stok.js';
import { now, same, anaRenk, guvenliParse, parcaListesi, insertCuval } from '../lib/yardimcilar.js';

// Stokta her rengin toplam seri sayısı: { vanilya: 6, bordo: 3 }
// depoId verilmezse tüm depolar toplanır (biten listesi için)
export function stokSeriByRenk(kod, depoId = null) {
  const map = {};
  db.prepare('SELECT * FROM cuvallar WHERE kod = ? COLLATE NOCASE AND (? IS NULL OR depo_id = ?)')
    .all(kod, depoId, depoId).forEach((r) => {
      parcaListesi(r).forEach((p) => {
        const k = p.renk.trim().toLowerCase();
        map[k] = (map[k] || 0) + p.seri;
      });
    });
  return map;
}

// Verilen renkten `need` seriyi, yalnızca verilen depodaki en eski çuvallardan düşer.
// Çuvalın diğer renkleri yerinde kalır.
export function renktenDus(kod, renk, need, depoId) {
  const rows = db.prepare('SELECT * FROM cuvallar WHERE kod = ? COLLATE NOCASE AND depo_id = ? ORDER BY olusturma')
    .all(kod, depoId);
  const upd = db.prepare('UPDATE cuvallar SET seriler = ?, parcalar = ?, renk = ?, guncelleme = ? WHERE id = ?');
  const del = db.prepare('DELETE FROM cuvallar WHERE id = ?');
  const t = now();
  let kalan = need, cuvalSayisi = 0, cuvalIci = null;

  for (const r of rows) {
    if (kalan <= 0) break;
    const parcalar = parcaListesi(r).map((p) => ({ ...p }));
    const hedef = parcalar.find((p) => same(p.renk, renk) && p.seri > 0);
    if (!hedef) continue;

    const al = Math.min(kalan, hedef.seri);
    hedef.seri -= al;
    kalan -= al;
    cuvalSayisi++;
    cuvalIci ??= r.cuval_ici;

    const kalanParca = parcalar.filter((p) => p.seri > 0);
    const seriler = guvenliParse(r.seriler, []);
    const yeniSeriler = seriler.slice(0, seriler.length - al);

    if (!kalanParca.length || !yeniSeriler.length) del.run(r.id);
    else upd.run(JSON.stringify(yeniSeriler), JSON.stringify(kalanParca), anaRenk(kalanParca), t, r.id);
  }
  return { cuvalSayisi, cuvalIci };
}

// Geri alınan (silinen giden kaydının) seriler yeni çuval olarak, çıktığı depoya eklenir
export function geriEkle(kod, renk, seri, cuvalIci, depoId = 1) {
  const t = now();
  let kalan = seri;
  while (kalan > 0) {
    const k = Math.min(kalan, cuvalIci);
    insertCuval(kod, renk, cuvalIci, [...Array(k)].map(() => [...FULL]), t, [{ renk, seri: k }], depoId);
    kalan -= k;
  }
}

// Karma çuval ekler: her çuvalın içinde birden fazla renk-seri parçası olabilir.
// parcalar: [{ renk, seri }] (tek çuvalın içeriği), adet: kaç özdeş çuval
export function karmaCuvalEkle(kod, parcalar, adet, depoId) {
  const t = now();
  const cuvalIci = parcalar.reduce((s, p) => s + p.seri, 0);
  const renk = anaRenk(parcalar);
  for (let i = 0; i < adet; i++) {
    insertCuval(
      kod,
      renk,
      cuvalIci,
      [...Array(cuvalIci)].map(() => [...FULL]),
      t,
      parcalar.map((p) => ({ renk: p.renk, seri: p.seri })),
      depoId,
    );
  }
}