// Bilinen renklere sabit ton, bilinmeyenlere isme göre sabit bir ton verilir.
const PALET = {
  lacivert: '#1f2f5c',
  indigo: '#3f3f96',
  'buz mavi': '#c6e4ee',
  'bebe mavi': '#8ec5ea',
  bordo: '#6d1f2c',
  yeşil: '#3d7a4f',
  çağla: '#c5e8a0',
  haki: '#8a8b5c',
  siyah: '#1d1d1d',
  antrasit: '#3a3d42',
  gri: '#9aa0a6',
  kahve: '#6f4e37',
  taş: '#c9b79c',
  ekru: '#ece2c8',
  bej: '#d8c3a0',
  vanilya: '#f3e5a6',
  krem: '#f3e7cc',
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const hashHue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);

// Tek bir rengin tonu (küçük harf girilmiş olmalı)
const tekRenk = (key) => PALET[key] ?? `hsl(${hashHue(key)} 45% 84%)`;

// "antrasit - buz mavi", "kahve/vanilya", "ekru+bordo" gibi girişleri renk parçalarına böler
export function renkParcalari(renk = '') {
  return String(renk)
    .split(/\s*[-/+,&]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Koyu zeminde beyaz, açık zeminde koyu yazı (birden fazla renkte ortalama parlaklığa göre)
const fgFor = (renkler) => {
  const ort = renkler.reduce((s, c) => s + (c.startsWith('#') ? luminance(c) : 0.8), 0) / renkler.length;
  return ort < 0.45 ? '#ffffff' : '#1f1e1a';
};

// bg: düz renk (grafikler ve metin rengi için)
// grad: CSS background değeri. Tek renkte düz renk, iki ya da daha çok renkte soldan sağa gradyan.
export function swatch(renk = '') {
  const parcalar = renkParcalari(renk);

  if (parcalar.length <= 1) {
    const key = (parcalar[0] ?? '').toLocaleLowerCase('tr-TR');
    const bg = tekRenk(key);
    return { bg, fg: fgFor([bg]), grad: bg };
  }

  const renkler = parcalar.map((p) => tekRenk(p.toLocaleLowerCase('tr-TR')));
  const son = renkler.length - 1;
  const grad = `linear-gradient(to right, ${renkler
    .map((c, i) => `${c} ${Math.round((i / son) * 100)}%`)
    .join(', ')})`;

  return { bg: renkler[0], fg: fgFor(renkler), grad };
}