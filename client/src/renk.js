// Bilinen renklere sabit ton, bilinmeyenlere isme göre sabit bir ton verilir.
const PALET = {
  antrasit: '#3a3d42',
  ekru: '#ece2c8',
  vanilya: '#f3e5a6',
  krem: '#f1e6c8',
  lacivert: '#1f2f5c',
  siyah: '#1d1d1d',
  beyaz: '#fafafa',
  bordo: '#6d1f2c',
  gri: '#9aa0a6',
  kahve: '#6f4e37',
  bej: '#d8c3a0',
  taş: '#c9b79c',
  haki: '#8a8b5c',
  yeşil: '#3d7a4f',
  mavi: '#3a6ea5',
  kırmızı: '#b5323a',
  pembe: '#e8a0b4',
  mor: '#6b4c9a',
  turuncu: '#e07a2f',
  sarı: '#e8c547',
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const hashHue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);

export function swatch(renk = '') {
  const key = renk.trim().toLocaleLowerCase('tr-TR');
  const bg = PALET[key]
    ?? `hsl(${hashHue(key)} 45% 84%)`;
  // Koyu zeminde beyaz, açık zeminde koyu yazı
  const fg = bg.startsWith('#') && luminance(bg) < 0.45 ? '#ffffff' : '#1f1e1a';
  return { bg, fg };
}