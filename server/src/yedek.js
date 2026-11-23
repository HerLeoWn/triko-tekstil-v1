import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Yedek klasörü: önce YEDEK_KLASORU ortam değişkenine bakılır (bulut sunucu için).
// Yoksa paketli .exe'de "veri/yedekler", geliştirmede server/yedekler kullanılır.
const KOK = process.env.YEDEK_KLASORU
  || (process.pkg
    ? path.join(path.dirname(process.execPath), 'veri', 'yedekler')
    : path.join(here, '..', 'yedekler'));
const MAX_YEDEK = 30;
const MAX_GERI_AL = 20;
const BIR_GUN = 24 * 60 * 60 * 1000;

const now = () => new Date().toISOString();
const pad = (n) => String(n).padStart(2, '0');
const tr = (iso) => (iso
  ? new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '');
const isTam = (s) => s.length === 4 && ['S', 'M', 'L', 'XL'].every((b) => s.includes(b));

/* ---------- CSV (noktalı virgül, Türkçe Excel'de direkt açılır) ---------- */

const SEP = ';';
const hucre = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const satir = (arr) => arr.map(hucre).join(SEP) + '\r\n';

function csvYaz(klasor, dosya, basliklar, satirlar) {
  const icerik = '\uFEFF' + satir(basliklar) + satirlar.map(satir).join('');
  fs.writeFileSync(path.join(klasor, dosya), icerik, 'utf8');
}

function csvOku(dosya) {
  const metin = fs.readFileSync(dosya, 'utf8').replace(/^\uFEFF/, '');
  const satirlar = [];
  let kur = [], alan = '', tirnak = false;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnak) {
      if (c === '"') {
        if (metin[i + 1] === '"') { alan += '"'; i++; } else tirnak = false;
      } else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === SEP) { kur.push(alan); alan = ''; }
    else if (c === '\n') { kur.push(alan); satirlar.push(kur); kur = []; alan = ''; }
    else if (c !== '\r') alan += c;
  }
  if (alan || kur.length) { kur.push(alan); satirlar.push(kur); }
  return satirlar.slice(1); // ilk satır başlık
}

const teknikOku = (row) => JSON.parse(row[row.length - 1]);

/* ---------- Yedek alma ---------- */

export function yedekAl() {
  fs.mkdirSync(KOK, { recursive: true });
  const d = new Date();
  let ad = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  if (fs.existsSync(path.join(KOK, ad))) ad += '_' + Date.now().toString(36).slice(-4);
  const klasor = path.join(KOK, ad);
  fs.mkdirSync(klasor);

  // Çuvallar
  const cuvallar = db.prepare('SELECT * FROM cuvallar ORDER BY kod, renk, olusturma').all();
  csvYaz(klasor, 'cuvallar.csv',
    ['Kod', 'Ana renk', 'Çuval içi seri', 'Tam seri', 'Eksik seriler', 'İçerik', 'Durum', 'Oluşturulma', 'Son değişiklik', 'Teknik veri'],
    cuvallar.map((r) => {
      const seriler = JSON.parse(r.seriler);
      const parcalar = r.parcalar ? JSON.parse(r.parcalar) : null;
      const tam = seriler.filter(isTam).length;
      const eksik = seriler.filter((s) => !isTam(s)).map((s) => s.join(' ')).join('; ');
      const icerik = parcalar
        ? parcalar.map((p) => `${p.renk} ${p.seri}`).join(' + ')
        : `${r.renk} ${seriler.length}`;
      const teknik = {
        id: r.id, kod: r.kod, renk: r.renk, cuval_ici: r.cuval_ici, durum: r.durum,
        olusturma: r.olusturma, guncelleme: r.guncelleme, seriler, parcalar,
      };
      return [r.kod, r.renk, r.cuval_ici, tam, eksik, icerik,
        r.durum === 'acik' ? 'Açık' : 'Kapalı', tr(r.olusturma), tr(r.guncelleme), JSON.stringify(teknik)];
    }));

  // Giden kayıtlar
  const kalemStmt = db.prepare('SELECT boyut, cuval_ici, adet, stok FROM giden_kalemler WHERE giden_id = ?');
  const giden = db.prepare('SELECT * FROM giden ORDER BY tarih').all();
  csvYaz(klasor, 'giden.csv',
    ['Kod', 'Renk', 'Tarih', 'Çuval adedi', 'Seri', 'Stoktan düştü', 'Özet', 'Teknik veri'],
    giden.map((g) => {
      const kalemler = kalemStmt.all(g.id);
      const ozet = kalemler.length
        ? kalemler.map((k) => `${k.adet}×${k.boyut}'li${k.stok ? '' : ' (manuel)'}`).join(' + ')
        : `${g.renk} ${g.seri} seri${g.stok === 0 ? ' (manuel)' : ''}`;
      const teknik = {
        id: g.id, kod: g.kod, renk: g.renk, tarih: g.tarih, cuval_adedi: g.cuval_adedi,
        seri: g.seri, stok: g.stok, cuval_ici: g.cuval_ici, kalemler,
      };
      return [g.kod, g.renk, tr(g.tarih), g.cuval_adedi, g.seri,
        g.stok === 0 ? 'Hayır (manuel)' : 'Evet', ozet, JSON.stringify(teknik)];
    }));

  // Hareket geçmişi
  const hareket = db.prepare('SELECT * FROM hareketler ORDER BY id').all();
  csvYaz(klasor, 'hareketler.csv',
    ['Tarih', 'Tür', 'Kod', 'Renk', 'Açıklama', 'Teknik veri'],
    hareket.map((h) => [tr(h.tarih), h.tur, h.kod, h.renk, h.aciklama,
      JSON.stringify({ tur: h.tur, kod: h.kod, renk: h.renk, aciklama: h.aciklama, tarih: h.tarih })]));

  fs.writeFileSync(path.join(klasor, 'LEEME.txt'), [
    'Triko Çuval Takibi - Yedek',
    '',
    'Dosyalar:',
    '  cuvallar.csv     Stoktaki çuvallar',
    '  giden.csv        Giden mal kayıtları',
    '  hareketler.csv   İşlem geçmişi',
    '',
    'Dosyalar noktalı virgül (;) ile ayrılmıştır. Excel\'de çift tıklayarak açabilirsiniz.',
    'Son sütun ("Teknik veri") uygulamanın yedekten geri yükleme için kullandığı kayıttır, silmeyin.',
    'Bu dosyaları düzenlemeyin, yalnızca okuyun. Düzenlerseniz geri yükleme bu değişiklikleri yansıtmaz.',
  ].join('\r\n'), 'utf8');

  // Depo özeti (okunabilir düz metin)
  const depoRows = db.prepare('SELECT * FROM depolar ORDER BY sira, id').all();
  const satirlar = [];
  depoRows.forEach((d) => {
    const bu = db.prepare('SELECT * FROM cuvallar WHERE depo_id = ?').all(d.id).map((r) => ({
      kod: r.kod,
      ad: db.prepare('SELECT ad FROM urunler WHERE kod = ? COLLATE NOCASE').get(r.kod)?.ad ?? '',
      cuvalIci: r.cuval_ici,
      seri: JSON.parse(r.seriler).length,
      parcalar: r.parcalar ? JSON.parse(r.parcalar) : [{ renk: r.renk, seri: JSON.parse(r.seriler).length }],
    }));
    satirlar.push(d.ad.toUpperCase());
    satirlar.push('─'.repeat(60));
    const urunMap = {};
    bu.forEach((c) => {
      const k = `${c.kod}|${c.cuvalIci}`;
      const u = (urunMap[k] ??= { kod: c.kod, ad: c.ad, cuvalIci: c.cuvalIci, cuval: 0, seri: 0, renks: {} });
      u.cuval++;
      u.seri += c.seri;
      c.parcalar.forEach((p) => { u.renks[p.renk] = (u.renks[p.renk] || 0) + p.seri; });
    });
    Object.values(urunMap).sort((a, b) => a.kod.localeCompare(b.kod, 'tr', { numeric: true })).forEach((u) => {
      satirlar.push(`${u.kod}${u.ad ? '  ' + u.ad : ''}`);
      satirlar.push(`  ${u.cuvalIci}'li çuval · ${u.cuval} çuval · ${u.seri} seri`);
      Object.entries(u.renks).forEach(([renk, seri]) => satirlar.push(`    ${renk}: ${seri} seri`));
      satirlar.push('');
    });
    satirlar.push(`TOPLAM: ${bu.length} çuval · ${bu.reduce((s, c) => s + c.seri, 0)} seri`);
    satirlar.push('');
    satirlar.push('');
  });
  fs.writeFileSync(path.join(klasor, 'ozet.txt'), '\uFEFF' + satirlar.join('\r\n'), 'utf8');

  // Eski yedekleri sil
  listele().slice(MAX_YEDEK).forEach((y) =>
    fs.rmSync(path.join(KOK, y.ad), { recursive: true, force: true }));

  return ad;
}

export function listele() {
  if (!fs.existsSync(KOK)) return [];
  return fs.readdirSync(KOK, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(KOK, d.name, 'cuvallar.csv')))
    .map((d) => ({ ad: d.name, tarih: fs.statSync(path.join(KOK, d.name)).mtime.toISOString() }))
    .sort((a, b) => b.ad.localeCompare(a.ad));
}

/* ---------- Yedekten geri yükleme ---------- */

export function geriYukle(ad, { guvenlik = true } = {}) {
  const liste = listele();
  const hedef = ad ? liste.find((y) => y.ad === ad) : liste[0];
  if (!hedef) throw new Error('Geri yüklenecek yedek bulunamadı.');
  if (guvenlik) yedekAl(); // mevcut durumun güvenlik kopyası

  const klasor = path.join(KOK, hedef.ad);
  const cuvallar = csvOku(path.join(klasor, 'cuvallar.csv')).map(teknikOku);
  const giden = csvOku(path.join(klasor, 'giden.csv')).map(teknikOku);
  const hareket = csvOku(path.join(klasor, 'hareketler.csv')).map(teknikOku);

  db.transaction(() => {
    db.exec(`DELETE FROM giden_kalemler; DELETE FROM giden; DELETE FROM cuvallar;
             DELETE FROM hareketler; DELETE FROM snapshots;`);

    const insCuval = db.prepare(`INSERT INTO cuvallar (id, kod, renk, cuval_ici, seriler, parcalar, durum, olusturma, guncelleme)
                                 VALUES (?,?,?,?,?,?,?,?,?)`);
    cuvallar.forEach((c) => insCuval.run(
      c.id, c.kod, c.renk, c.cuval_ici, JSON.stringify(c.seriler),
      c.parcalar ? JSON.stringify(c.parcalar) : null, c.durum, c.olusturma, c.guncelleme));

    const insGiden = db.prepare(`INSERT INTO giden (id, kod, renk, cuval_adedi, seri, tarih, cuval_ici, stok)
                                 VALUES (?,?,?,?,?,?,?,?)`);
    const insKalem = db.prepare(`INSERT INTO giden_kalemler (giden_id, boyut, cuval_ici, adet, stok)
                                 VALUES (?,?,?,?,?)`);
    giden.forEach((g) => {
      insGiden.run(g.id, g.kod, g.renk, g.cuval_adedi, g.seri, g.tarih, g.cuval_ici ?? null, g.stok ?? null);
      (g.kalemler || []).forEach((k) => insKalem.run(g.id, k.boyut, k.cuval_ici, k.adet, k.stok));
    });

    const insHareket = db.prepare('INSERT INTO hareketler (tur, kod, renk, aciklama, tarih) VALUES (?,?,?,?,?)');
    hareket.forEach((h) => insHareket.run(h.tur, h.kod, h.renk, h.aciklama, h.tarih));
    insHareket.run('yedekten yüklendi', '', '', hedef.ad, now());
  })();

  return { ad: hedef.ad };
}

/* ---------- Geri al (anlık görüntü tabanlı) ---------- */

function snapshotAl(aciklama) {
  const data = JSON.stringify({
    cuvallar: db.prepare('SELECT * FROM cuvallar').all(),
    giden: db.prepare('SELECT * FROM giden').all(),
    giden_kalemler: db.prepare('SELECT * FROM giden_kalemler').all(),
  });
  const info = db.prepare('INSERT INTO snapshots (aciklama, tarih, data) VALUES (?,?,?)')
    .run(aciklama, now(), data);
  db.prepare('DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY id DESC LIMIT ?)')
    .run(MAX_GERI_AL);
  return Number(info.lastInsertRowid);
}

function etiket(req) {
  const m = req.method, p = req.path;
  if (m === 'POST' && p.endsWith('/durum')) return 'Çuval durumu değişti';
  if (m === 'POST' && p === '/api/cuvallar') return 'Çuval eklendi';
  if (m === 'PUT' && p.startsWith('/api/cuvallar/')) return 'Çuval düzenlendi';
  if (m === 'DELETE' && p.startsWith('/api/cuvallar/')) return 'Çuval silindi';
  if (m === 'POST' && p === '/api/giden') return 'Giden mal eklendi';
  if (m === 'DELETE' && p.startsWith('/api/giden/')) return 'Giden kaydı silindi';
  if (m === 'DELETE' && p.startsWith('/api/urun/')) return 'Ürün grubu silindi';
  return 'İşlem';
}

// Veri değiştiren her istekten önce anlık görüntü alır. İstek hata verirse görüntü silinir.
export function islemOncesi(req, res, next) {
  const degisiklik = ['POST', 'PUT', 'DELETE'].includes(req.method)
    && /^\/api\/(cuvallar|giden|urun)/.test(req.path);
  if (!degisiklik) return next();

  const id = snapshotAl(etiket(req));
  res.on('finish', () => {
    if (res.statusCode >= 400) db.prepare('DELETE FROM snapshots WHERE id = ?').run(id);
  });
  next();
}

export function geriAlDurum() {
  return db.prepare('SELECT id, aciklama, tarih FROM snapshots ORDER BY id DESC LIMIT 1').get() ?? null;
}

function tabloEkle(tablo, satirlar) {
  if (!satirlar?.length) return;
  const kolon = Object.keys(satirlar[0]);
  const st = db.prepare(`INSERT INTO ${tablo} (${kolon.join(', ')}) VALUES (${kolon.map(() => '?').join(', ')})`);
  satirlar.forEach((r) => st.run(...kolon.map((k) => r[k] ?? null)));
}

export function geriAl() {
  const s = db.prepare('SELECT * FROM snapshots ORDER BY id DESC LIMIT 1').get();
  if (!s) throw new Error('Geri alınacak işlem yok.');
  const d = JSON.parse(s.data);

  db.transaction(() => {
    db.exec('DELETE FROM giden_kalemler; DELETE FROM giden; DELETE FROM cuvallar;');
    tabloEkle('cuvallar', d.cuvallar);
    tabloEkle('giden', d.giden);
    tabloEkle('giden_kalemler', d.giden_kalemler);
    db.prepare('DELETE FROM snapshots WHERE id = ?').run(s.id);
    db.prepare('INSERT INTO hareketler (tur, kod, renk, aciklama, tarih) VALUES (?,?,?,?,?)')
      .run('geri alındı', '', '', s.aciklama, now());
  })();
}

/* ---------- Otomatik yedek ---------- */

export function baslatOtomatikYedek() {
  const son = listele()[0];
  const yas = son ? Date.now() - new Date(son.tarih).getTime() : Infinity;
  if (yas > BIR_GUN) yedekAl();
  setInterval(() => yedekAl(), BIR_GUN).unref();
}