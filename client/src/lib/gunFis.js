import { tarihYazi } from './tarih.js';
import { swatch } from '../renk.js';

const W = 640;
const S = 2; // retina için 2x
const PAD = 32;
const HEADER_H = 200;
const MODEL_HEAD_H = 110;
const ROW_H = 76;
const CARD_GAP = 20;
const FOOT_H = 150;
const FONT = 'Arial, Helvetica, sans-serif';
const YAZI = '#24231f';
const SOLUK = '#77746a';
const CIZGI = '#e6e3da';
const ZEMIN = '#fafaf7';
const BASLIK = '#2e4d3c';

const kartH = (n) => MODEL_HEAD_H + n * ROW_H + 14;

// Günün giden kayıtlarını model (kod) ve renk bazında toplar
export function gunOzeti(rows) {
  const modeller = new Map();
  rows.forEach((r) => {
    if (!modeller.has(r.kod)) modeller.set(r.kod, new Map());
    const renkler = modeller.get(r.kod);
    const rk = r.renk.trim().toLowerCase();
    const satir = renkler.get(rk) ?? { renk: r.renk.trim(), seri: 0 };
    satir.seri += r.seri;
    renkler.set(rk, satir);
  });

  const liste = [...modeller.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'tr', { numeric: true }))
    .map(([kod, renkler]) => {
      const satirlar = [...renkler.values()].map((s) => ({ ...s, ...swatch(s.renk) }));
      return { kod, satirlar, toplam: satirlar.reduce((s, r) => s + r.seri, 0) };
    });

  return { modeller: liste, toplamSeri: liste.reduce((s, m) => s + m.toplam, 0) };
}

function gunCanvas(rows, tarih) {
  const { modeller, toplamSeri } = gunOzeti(rows);
  const govde = modeller.reduce((s, m) => s + kartH(m.satirlar.length) + CARD_GAP, 0);
  const H = HEADER_H + 30 + govde + FOOT_H;

  const c = document.createElement('canvas');
  c.width = W * S;
  c.height = H * S;
  const x = c.getContext('2d');
  x.scale(S, S);

  const yazi = (t, X, Y, kalinlik, boyut, renk = YAZI, hiza = 'left') => {
    x.font = `${kalinlik} ${boyut}px ${FONT}`;
    x.fillStyle = renk;
    x.textAlign = hiza;
    x.fillText(t, X, Y);
  };
  const yol = (X, Y, w, h, r) => {
    x.beginPath();
    x.roundRect(X, Y, w, h, r);
  };
  // Sade beyaz kart, ince kenarlık, gölge yok
  const kart = (X, Y, w, h, r) => {
    yol(X, Y, w, h, r);
    x.fillStyle = '#ffffff';
    x.fill();
    yol(X + 0.5, Y + 0.5, w - 1, h - 1, r);
    x.strokeStyle = CIZGI;
    x.lineWidth = 1;
    x.stroke();
  };
  const cizgi = (X, Y, w) => {
    x.fillStyle = CIZGI;
    x.fillRect(X, Y, w, 1.5);
  };

  // Zemin
  x.fillStyle = ZEMIN;
  x.fillRect(0, 0, W, H);

  // Üst bant: sade koyu yeşil, yazılar birbirine değmeden dizilmiş
  x.fillStyle = BASLIK;
  x.fillRect(0, 0, W, HEADER_H);
  yazi('GİDEN MALLAR', PAD + 8, 60, 'normal', 22, '#c9dccf');
  yazi(tarihYazi(tarih), PAD + 8, 124, 'bold', 52, '#ffffff');
  yazi(`${modeller.length} model · ${toplamSeri} seri`, PAD + 8, 172, 'normal', 22, '#c9dccf');

  // Model kartları
  let y = HEADER_H + 30;
  modeller.forEach((m) => {
    const h = kartH(m.satirlar.length);
    kart(PAD, y, W - PAD * 2, h, 16);

    // Model başlığı
    yazi(m.kod, PAD + 28, y + 70, 'bold', 56, YAZI);
    yazi(`${m.toplam} seri`, W - PAD - 28, y + 70, 'normal', 34, SOLUK, 'right');
    cizgi(PAD + 28, y + MODEL_HEAD_H - 14, W - PAD * 2 - 56);

    // Renk satırları
    m.satirlar.forEach((s, i) => {
      const ry = y + MODEL_HEAD_H + i * ROW_H;
      if (i > 0) cizgi(PAD + 28, ry - 1, W - PAD * 2 - 56);

      // Renk noktası
      x.beginPath();
      x.arc(PAD + 44, ry + 38, 12, 0, Math.PI * 2);
      x.fillStyle = s.bg;
      x.fill();
      x.strokeStyle = '#d4d1c8';
      x.lineWidth = 1;
      x.stroke();

      yazi(s.renk, PAD + 72, ry + 50, 'bold', 38, YAZI);
      yazi(`${s.seri} seri`, W - PAD - 28, ry + 50, 'bold', 38, YAZI, 'right');
    });

    y += h + CARD_GAP;
  });

  // Alt bilgi
  cizgi(PAD, y + 4, W - PAD * 2);
  yazi('Toplam', PAD + 4, y + 60, 'normal', 26, SOLUK);
  yazi(`${toplamSeri} seri`, W - PAD - 4, y + 60, 'bold', 50, YAZI, 'right');
  yazi('BA Tekstil · Triko Çuval Takibi', W / 2, y + 122, 'normal', 18, SOLUK, 'center');

  return c;
}

// Günün tüm giden malları tek PNG olarak indirilir. Dosya adı: 25.11.2026.png
export function gunPngIndir(rows, gunTarih) {
  if (!rows.length) return;
  gunCanvas(rows, gunTarih).toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tarihYazi(gunTarih)}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}