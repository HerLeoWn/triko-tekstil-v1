import { swatch } from '../renk.js';
import { tarihYazi } from './tarih.js';

const FONT = '"Segoe UI", system-ui, Arial, sans-serif';
const W = 720;
const S = 2; // retina için 2x
const BASLIK_H = 170;
const SATIR_H = 46;
const MODEL_BASLIK_H = 56;
const ALT_H = 96;

const kartH = (n) => MODEL_BASLIK_H + n * SATIR_H + 10;

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
  const H = BASLIK_H + modeller.reduce((s, m) => s + kartH(m.satirlar.length) + 16, 0) + ALT_H;

  const c = document.createElement('canvas');
  c.width = W * S;
  c.height = H * S;
  const x = c.getContext('2d');
  x.scale(S, S);

  const yazi = (t, X, Y, font, renk, hiza = 'left', harf = '0px') => {
    x.font = `${font} ${FONT}`;
    x.fillStyle = renk;
    x.textAlign = hiza;
    x.letterSpacing = harf;
    x.fillText(t, X, Y);
  };
  const yuvarla = (X, Y, w, h, r) => {
    x.beginPath();
    x.roundRect(X, Y, w, h, r);
  };

  // Zemin ve ana kart
  x.fillStyle = '#f7f6f2';
  x.fillRect(0, 0, W, H);
  x.save();
  x.shadowColor = 'rgba(31,30,26,0.10)';
  x.shadowBlur = 24;
  x.shadowOffsetY = 8;
  yuvarla(16, 16, W - 32, H - 32, 20);
  x.fillStyle = '#ffffff';
  x.fill();
  x.restore();
  yuvarla(16.5, 16.5, W - 33, H - 33, 20);
  x.strokeStyle = '#e7e4da';
  x.lineWidth = 1;
  x.stroke();

  // Başlık
  yazi('GİDEN MALLAR · GÜN SONU', 56, 58, '600 12px', '#8a877d', 'left', '1.4px');
  yazi(`Tam ${modeller.length} model yüklendi`, 56, 104, '800 36px', '#1f1e1a');
  yazi(`${tarihYazi(tarih)} tarihinde bu modeller gitti`, 56, 134, '600 16px', '#3d7a4f');
  x.fillStyle = '#e7e4da';
  x.fillRect(56, 150, W - 112, 1);

  // Modeller: her model kendi kartında, renkler satır satır
  let y = BASLIK_H;
  modeller.forEach((m) => {
    const h = kartH(m.satirlar.length);
    yuvarla(56, y, W - 112, h, 16);
    x.fillStyle = '#fbfaf7';
    x.fill();
    yuvarla(56.5, y + 0.5, W - 113, h - 1, 16);
    x.strokeStyle = '#e7e4da';
    x.stroke();

    yazi(m.kod, 80, y + 40, '800 26px', '#1f1e1a');
    yazi(`${m.toplam} seri`, W - 80, y + 40, '700 18px', '#1f1e1a', 'right');

    m.satirlar.forEach((s, i) => {
      const ry = y + MODEL_BASLIK_H + i * SATIR_H;
      yuvarla(72, ry, W - 144, SATIR_H - 8, 10);
      x.fillStyle = s.bg;
      x.fill();
      yazi(s.renk, 88, ry + 22, '700 16px', s.fg);
      yazi(`${s.seri} seri`, W - 88, ry + 22, '700 16px', s.fg, 'right');
    });

    y += h + 16;
  });

  // Alt bilgi
  yazi(`Toplam ${toplamSeri} seri`, 56, y + 34, '800 20px', '#1f1e1a');
  yazi('BA Tekstil · Triko Çuval Takibi', W - 56, y + 34, '400 12px', '#8a877d', 'right');

  return c;
}

// Günün tüm giden malları tek PNG olarak indirilir. Dosya adı: 23.11.2026.png
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