import { tarihYazi } from './tarih.js';
import { swatch } from '../renk.js';

const W = 720;
const S = 2; // retina için 2x
const PAD = 32;
const GAP = 16;
const COL_W = (W - PAD * 2 - GAP) / 2;
const HEADER_H = 186;
const CARD_HEAD_H = 72;
const ROW_H = 58;
const CARD_PAD_B = 14;
const CARD_GAP = 16;
const FOOT_H = 130;
const FONT = 'Arial, Helvetica, sans-serif';
const YAZI = '#24231f';
const SOLUK = '#77746a';
const CIZGI = '#e6e3da';
const ZEMIN = '#fafaf7';
const BASLIK = '#2e4d3c';
const ROZET = '#ebeee9';

const kartH = (n) => CARD_HEAD_H + n * ROW_H + CARD_PAD_B;

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

function gunCanvas(rows, tarih, saat = '') {
  const { modeller, toplamSeri } = gunOzeti(rows);

  // Modelleri iki sütunlu ızgaraya diz, her satır en uzun kartına göre yükselir
  const satirlar = [];
  for (let i = 0; i < modeller.length; i += 2) satirlar.push(modeller.slice(i, i + 2));
  const izgaraH = satirlar.reduce(
    (s, sat) => s + Math.max(...sat.map((m) => kartH(m.satirlar.length))) + CARD_GAP,
    0,
  );
  const H = HEADER_H + 24 + izgaraH + FOOT_H;

  const c = document.createElement('canvas');
  c.width = W * S;
  c.height = H * S;
  const x = c.getContext('2d');
  x.scale(S, S);

  const font = (kalinlik, boyut) => {
    x.font = `${kalinlik} ${boyut}px ${FONT}`;
  };
  const yazi = (t, X, Y, kalinlik, boyut, renk = YAZI, hiza = 'left') => {
    font(kalinlik, boyut);
    x.fillStyle = renk;
    x.textAlign = hiza;
    x.fillText(t, X, Y);
  };
  const genislik = (t, kalinlik, boyut) => {
    font(kalinlik, boyut);
    return x.measureText(t).width;
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
  // Sağa hizalı gri seri rozeti
  const rozet = (metin, sagX, Y) => {
    const w = genislik(metin, 'bold', 24) + 28;
    yol(sagX - w, Y, w, 40, 20);
    x.fillStyle = ROZET;
    x.fill();
    yazi(metin, sagX - w / 2, Y + 27, 'bold', 24, SOLUK, 'center');
  };

  // Zemin
  x.fillStyle = ZEMIN;
  x.fillRect(0, 0, W, H);

  // Üst bant
  x.fillStyle = BASLIK;
  x.fillRect(0, 0, W, HEADER_H);
  yazi('GİDEN MALLAR', PAD, 56, 'normal', 22, '#c9dccf');
  yazi(tarihYazi(tarih), PAD, 116, 'bold', 52, '#ffffff');
  yazi(
    `${saat ? `${saat}  ·  ` : ''}${modeller.length} model · ${toplamSeri} seri`,
    PAD,
    162,
    'normal',
    24,
    '#c9dccf',
  );

  // Model kartları
  let y = HEADER_H + 24;
  satirlar.forEach((sat) => {
    const h = Math.max(...sat.map((m) => kartH(m.satirlar.length)));
    sat.forEach((m, k) => {
      const X = PAD + k * (COL_W + GAP);
      const ic = X + 20;
      const sag = X + COL_W - 20;
      kart(X, y, COL_W, h, 16);

      yazi(m.kod, ic, y + 46, 'bold', 36, YAZI);
      rozet(`${m.toplam} seri`, sag, y + 16);
      cizgi(ic, y + CARD_HEAD_H - 8, COL_W - 40);

      m.satirlar.forEach((s, i) => {
        const ry = y + CARD_HEAD_H + i * ROW_H;
        const cy = ry + 28;

        // Renk noktası
        x.beginPath();
        x.arc(ic + 10, cy, 10, 0, Math.PI * 2);
        x.fillStyle = s.bg;
        x.fill();
        x.strokeStyle = '#d4d1c8';
        x.lineWidth = 1;
        x.stroke();

        // Renk adı, seriyle çakışmayacak kadar küçülür
        const seriMetin = `${s.seri} seri`;
        const seriW = genislik(seriMetin, 'bold', 28);
        const renkMaks = sag - seriW - 12 - (ic + 34);
        let boyut = 28;
        while (boyut > 20 && genislik(s.renk, 'bold', boyut) > renkMaks) boyut -= 2;
        yazi(s.renk, ic + 34, cy + boyut * 0.36, 'bold', boyut, YAZI);
        yazi(seriMetin, sag, cy + 10, 'bold', 28, YAZI, 'right');
      });
    });
    y += h + CARD_GAP;
  });

  // Alt bilgi
  cizgi(PAD, y + 4, W - PAD * 2);
  yazi('Toplam', PAD, y + 56, 'normal', 26, SOLUK);
  yazi(`${toplamSeri} seri`, W - PAD, y + 58, 'bold', 46, YAZI, 'right');
  yazi('BA Tekstil · Triko Çuval Takibi', W / 2, y + 112, 'normal', 18, SOLUK, 'center');

  return c;
}

// Bir nakliyatın fişi PNG olarak indirilir. Dosya adı: 25.11.2026 16.26–16.28.png
export function gunPngIndir(rows, gunTarih, saat = '') {
  if (!rows.length) return;
  gunCanvas(rows, gunTarih, saat).toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tarihYazi(gunTarih)}${saat ? ` ${saat.replace(':', '.')}` : ''}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}