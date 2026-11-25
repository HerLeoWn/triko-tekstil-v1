import { tarihYazi } from './tarih.js';
import { swatch } from '../renk.js';

const W = 640;
const S = 2; // retina için 2x
const PAD = 32;
const HEADER_H = 190;
const OZET_H = 96;
const MODEL_HEAD_H = 120;
const ROW_H = 84;
const CARD_GAP = 22;
const FOOT_H = 200;
const FONT = 'Arial, Helvetica, sans-serif';
const YAZI = '#1b1a16';
const SOLUK = '#6f6c62';
const YESIL = '#1f4d2e';
const VURGU = ['#1f4d2e', '#2563eb', '#d97706', '#9333ea', '#0891b2', '#dc2626'];

const kartH = (n) => MODEL_HEAD_H + n * ROW_H + 16;

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
  const H = HEADER_H + OZET_H + 58 + govde + FOOT_H;

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
  // Gölgeli beyaz kart
  const kart = (X, Y, w, h, r) => {
    x.save();
    x.shadowColor = 'rgba(31,30,22,0.10)';
    x.shadowBlur = 20;
    x.shadowOffsetY = 6;
    yol(X, Y, w, h, r);
    x.fillStyle = '#ffffff';
    x.fill();
    x.restore();
    yol(X + 0.5, Y + 0.5, w - 1, h - 1, r);
    x.strokeStyle = '#e6e2d6';
    x.lineWidth = 1;
    x.stroke();
  };
  // Sağa hizalı yuvarlak etiket (ör. "81 seri")
  const etiket = (t, sagX, Y, bg, fg) => {
    x.font = `bold 36px ${FONT}`;
    const w = x.measureText(t).width + 44;
    yol(sagX - w, Y, w, 56, 28);
    x.fillStyle = bg;
    x.fill();
    yazi(t, sagX - w / 2, Y + 38, 'bold', 36, fg, 'center');
  };

  // Zemin
  x.fillStyle = '#f5f4ef';
  x.fillRect(0, 0, W, H);

  // Üst bant: gradyan
  const grad = x.createLinearGradient(0, 0, W, HEADER_H);
  grad.addColorStop(0, '#1f4d2e');
  grad.addColorStop(1, '#2f6b44');
  x.fillStyle = grad;
  x.fillRect(0, 0, W, HEADER_H);
  yazi('GİDEN MALLAR', PAD + 8, 58, 'bold', 22, 'rgba(255,255,255,0.75)');
  yazi(tarihYazi(tarih), PAD + 8, 124, 'bold', 56, '#ffffff');
  x.fillStyle = 'rgba(255,255,255,0.25)';
  x.fillRect(PAD + 8, 152, 72, 4);

  // Özet kutuları
  const kutuW = (W - PAD * 2 - 32) / 2;
  const kutular = [
    ['MODEL', `${modeller.length}`],
    ['TOPLAM SERİ', `${toplamSeri}`],
  ];
  kutular.forEach(([etk, deger], i) => {
    const X = PAD + i * (kutuW + 32);
    const Y = HEADER_H + 26;
    kart(X, Y, kutuW, OZET_H, 18);
    yazi(etk, X + 24, Y + 36, 'bold', 16, SOLUK);
    yazi(deger, X + 24, Y + 78, 'bold', 44, YAZI);
  });

  // Model kartları
  let y = HEADER_H + OZET_H + 58;
  modeller.forEach((m, mi) => {
    const h = kartH(m.satirlar.length);
    const vurgu = VURGU[mi % VURGU.length];
    kart(PAD, y, W - PAD * 2, h, 22);

    // Model başlığı
    x.fillStyle = vurgu;
    yol(PAD + 24, y + 32, 6, 60, 3);
    x.fill();
    yazi('MODEL', PAD + 46, y + 42, 'bold', 16, SOLUK);
    yazi(m.kod, PAD + 46, y + 94, 'bold', 64, YAZI);
    etiket(`${m.toplam} seri`, W - PAD - 24, y + 30, '#eef4ef', YESIL);

    // Renk çubukları
    m.satirlar.forEach((s, i) => {
      const ry = y + MODEL_HEAD_H + i * ROW_H;
      yol(PAD + 24, ry + 10, W - PAD * 2 - 48, 62, 16);
      x.fillStyle = s.bg;
      x.fill();
      yazi(s.renk, PAD + 46, ry + 50, 'bold', 40, s.fg);
      yazi(`${s.seri} seri`, W - PAD - 46, ry + 50, 'bold', 40, s.fg, 'right');
    });

    y += h + CARD_GAP;
  });

  // Alt bilgi: koyu toplam kutusu
  const fy = y + 6;
  yol(PAD, fy, W - PAD * 2, 110, 22);
  x.fillStyle = YESIL;
  x.fill();
  yazi('TOPLAM', PAD + 32, fy + 44, 'bold', 22, 'rgba(255,255,255,0.75)');
  yazi(`${toplamSeri} seri`, W - PAD - 32, fy + 72, 'bold', 52, '#ffffff', 'right');
  yazi('BA Tekstil · Triko Çuval Takibi', W / 2, fy + 160, 'normal', 18, SOLUK, 'center');

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