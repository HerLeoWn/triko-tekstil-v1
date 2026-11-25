import { tarihYazi } from './tarih.js';
import { swatch } from '../renk.js';

// Dar tuval: telefonda açılınca küçültülse bile yazılar okunur kalır
const W = 640;
const S = 2; // retina için 2x
const PAD = 36;
const HEADER_H = 150;
const MODEL_HEAD_H = 120;
const ROW_H = 130;
const CARD_GAP = 24;
const FOOT_H = 170;
const FONT = 'Arial, Helvetica, sans-serif';
const YAZI = '#111111';
const SOLUK = '#444444';

const kartH = (n) => MODEL_HEAD_H + n * ROW_H + 20;

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
  const H = HEADER_H + 110 + govde + FOOT_H;

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
  const dikdortgen = (X, Y, w, h, r = 0, dolgu = null, cizgi = null, cizgiKalinlik = 2) => {
    x.beginPath();
    x.roundRect(X, Y, w, h, r);
    if (dolgu) {
      x.fillStyle = dolgu;
      x.fill();
    }
    if (cizgi) {
      x.strokeStyle = cizgi;
      x.lineWidth = cizgiKalinlik;
      x.stroke();
    }
  };

  // Beyaz zemin
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, W, H);

  // Üst bant
  x.fillStyle = '#1f4d2e';
  x.fillRect(0, 0, W, HEADER_H);
  yazi('GİDEN MALLAR', PAD, 56, 'bold', 26, '#ffffff');
  yazi(tarihYazi(tarih), PAD, 118, 'bold', 52, '#ffffff');

  // Özet
  yazi(`${modeller.length} model · ${toplamSeri} seri`, PAD, HEADER_H + 66, 'bold', 40, YAZI);

  // Model kartları
  let y = HEADER_H + 110;
  modeller.forEach((m) => {
    const h = kartH(m.satirlar.length);
    dikdortgen(PAD, y, W - PAD * 2, h, 18, '#ffffff', '#8c8676', 3);

    // Model başlığı: kod büyük
    x.fillStyle = '#f1efe8';
    x.fillRect(PAD + 2, y + 2, W - PAD * 2 - 4, MODEL_HEAD_H - 2);
    yazi(m.kod, PAD + 28, y + 80, 'bold', 76, YAZI);
    yazi(`${m.toplam} seri`, W - PAD - 28, y + 80, 'bold', 52, YAZI, 'right');

    // Renk satırları
    m.satirlar.forEach((s, i) => {
      const ry = y + MODEL_HEAD_H + i * ROW_H;
      if (i > 0) {
        x.fillStyle = '#d6d2c4';
        x.fillRect(PAD + 20, ry, W - PAD * 2 - 40, 2);
      }
      dikdortgen(PAD + 28, ry + 34, 60, 60, 10, s.bg, '#8c8676', 2);
      yazi(s.renk, PAD + 104, ry + 84, 'bold', 52, YAZI);
      yazi(`${s.seri} seri`, W - PAD - 28, ry + 84, 'bold', 52, YAZI, 'right');
    });

    y += h + CARD_GAP;
  });

  // Alt bilgi
  x.fillStyle = '#d6d2c4';
  x.fillRect(PAD, y + 4, W - PAD * 2, 3);
  yazi('TOPLAM', PAD, y + 70, 'bold', 30, SOLUK);
  yazi(`${toplamSeri} seri`, W - PAD, y + 84, 'bold', 64, YAZI, 'right');
  yazi('BA Tekstil · Triko Çuval Takibi', PAD, y + 130, 'normal', 22, SOLUK);

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