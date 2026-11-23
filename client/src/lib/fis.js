import { swatch } from '../renk.js';

const p2 = (n) => String(n).padStart(2, '0');

// Giden kayıtlarını kod + güne göre fişlere böler. Aynı renk tek satırda toplanır.
export function fisGruplari(rows) {
  const map = new Map();
  rows.forEach((g) => {
    const t = new Date(g.tarih);
    const gun = t.toLocaleDateString('sv-SE');
    const anahtar = `${g.kod.toLowerCase()}|${gun}`;
    if (!map.has(anahtar)) map.set(anahtar, { kod: g.kod, t, gun, renkler: new Map() });
    const grup = map.get(anahtar);
    const rk = g.renk.trim().toLowerCase();
    const satir = grup.renkler.get(rk) ?? { renk: g.renk.trim(), seri: 0, cuval: 0 };
    satir.seri += g.seri;
    satir.cuval += g.cuvalAdedi || 0;
    grup.renkler.set(rk, satir);
  });

  return [...map.values()].map((grup) => {
    const satirlar = [...grup.renkler.values()].map((s) => ({ ...s, ...swatch(s.renk) }));
    return {
      kod: grup.kod,
      dosya: grup.gun,
      tarih: `${p2(grup.t.getDate())}.${p2(grup.t.getMonth() + 1)}.${grup.t.getFullYear()}`,
      satirlar,
      toplamSeri: satirlar.reduce((s, r) => s + r.seri, 0),
      toplamCuval: satirlar.reduce((s, r) => s + r.cuval, 0),
    };
  });
}

const W = 680;
const S = 2; // retina için 2x çözünürlük
const FONT = '"Segoe UI", system-ui, Arial, sans-serif';
const RENK = {
  zemin: '#f7f6f2',
  kart: '#ffffff',
  ink: '#1f1e1a',
  muted: '#8a877d',
  cizgi: '#e7e4da',
  vurgu: '#3d7a4f',
  vurguZemin: '#e3efe6',
};

// Fişi canvas üzerine çizer. Tasarım, HTML şablonundaki (giden-fis.html) ölçülerle aynıdır.
export function fisCanvas(f) {
  const n = f.satirlar.length;
  const satirBaslangic = 199;
  const ozetY = satirBaslangic + (n - 1) * 102 + 130;
  const altCizgi = ozetY + 106;
  const kartSon = altCizgi + 38;
  const H = kartSon + 36;

  const c = document.createElement('canvas');
  c.width = W * S;
  c.height = H * S;
  const x = c.getContext('2d');
  x.scale(S, S);

  const yuvarla = (X, Y, w, h, r) => {
    x.beginPath();
    x.roundRect(X, Y, w, h, r);
  };
  const yazi = (metin, X, Y, font, renk, hiza = 'left', harf = '0px') => {
    x.font = `${font} ${FONT}`;
    x.fillStyle = renk;
    x.textAlign = hiza;
    x.letterSpacing = harf;
    x.fillText(metin, X, Y);
  };

  // Zemin ve kart
  x.fillStyle = RENK.zemin;
  x.fillRect(0, 0, W, H);
  x.save();
  x.shadowColor = 'rgba(31,30,26,0.10)';
  x.shadowBlur = 24;
  x.shadowOffsetY = 8;
  yuvarla(36, 36, 608, kartSon - 36, 20);
  x.fillStyle = RENK.kart;
  x.fill();
  x.restore();
  yuvarla(36.5, 36.5, 607, kartSon - 37, 20);
  x.strokeStyle = RENK.cizgi;
  x.lineWidth = 1;
  x.stroke();

  // Başlık
  yazi('GİDEN MAL', 68, 76, '600 11px', RENK.muted, 'left', '1.3px');
  yazi(f.kod, 68, 124, '800 46px', RENK.ink);
  yazi('Tarih', 612, 76, '400 12px', RENK.muted, 'right');
  yazi(f.tarih, 612, 98, '600 15px', RENK.ink, 'right');
  x.fillStyle = RENK.cizgi;
  x.fillRect(36, 177, 608, 1);

  // Renk satırları
  const max = Math.max(...f.satirlar.map((s) => s.seri));
  f.satirlar.forEach((s, i) => {
    const y = satirBaslangic + i * 102;
    const X = 68;
    const w = 544;

    yuvarla(X, y, w, 92, 14);
    x.fillStyle = s.bg;
    x.fill();

    x.beginPath();
    x.arc(X + 23, y + 35, 7, 0, Math.PI * 2);
    x.fillStyle = s.bg;
    x.fill();
    x.globalAlpha = 0.4;
    x.strokeStyle = s.fg;
    x.lineWidth = 1;
    x.stroke();
    x.globalAlpha = 1;

    yazi(s.renk, X + 40, y + 41, '700 17px', s.fg);
    yazi(`${s.seri} seri`, X + w - 16, y + 34, '700 22px', s.fg, 'right');
    yazi(`${s.cuval} çuval`, X + w - 16, y + 52, '400 12px', s.fg, 'right');

    // Oran çubuğu: en çok seriyi taşıyan renk tam genişlik
    const bx = X + 16;
    const bw = w - 32;
    const by = y + 69;
    yuvarla(bx, by, bw, 8, 4);
    x.fillStyle = 'rgba(0,0,0,0.08)';
    x.fill();
    const dolu = bw * (s.seri / max);
    if (dolu > 0) {
      yuvarla(bx, by, dolu, 8, 4);
      x.globalAlpha = 0.55;
      x.fillStyle = s.fg;
      x.fill();
      x.globalAlpha = 1;
    }
  });

  // Toplam kutuları
  const kutu = (X, vurgu, etiket, deger) => {
    yuvarla(X, ozetY, 266, 80, 14);
    x.fillStyle = vurgu ? RENK.vurguZemin : RENK.zemin;
    x.fill();
    yazi(etiket, X + 16, ozetY + 28, '600 11px', vurgu ? RENK.vurgu : RENK.muted, 'left', '1px');
    yazi(String(deger), X + 16, ozetY + 64, '800 28px', vurgu ? RENK.vurgu : RENK.ink);
  };
  kutu(68, true, 'TOPLAM SERİ', f.toplamSeri);
  kutu(346, false, 'TOPLAM ÇUVAL', f.toplamCuval);

  // Alt bilgi
  x.fillStyle = RENK.cizgi;
  x.fillRect(36, altCizgi, 608, 1);
  yazi('BA Tekstil · Triko Çuval Takibi', 68, altCizgi + 25, '400 11px', RENK.muted);
  yazi(`${n} renk`, 612, altCizgi + 25, '400 11px', RENK.muted, 'right');

  return c;
}

// Fişi PNG olarak indirir
export function fisPngIndir(f) {
  fisCanvas(f).toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fis-${f.kod.replace(/[^\w-]+/g, '_')}-${f.dosya}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}