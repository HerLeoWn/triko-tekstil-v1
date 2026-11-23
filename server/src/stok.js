export const FULL = ['S', 'M', 'L', 'XL'];

export const isTam = (s) => s.length === 4 && FULL.every((b) => s.includes(b));

// "S M L; XL" → [['S','M','L'], ['XL']]
export function parseEksik(text = '') {
  return String(text)
    .split(';')
    .map((part) => {
      const sizes = [];
      (part.match(/[A-Za-z]+/g) || []).forEach((t) => {
        const u = t.toUpperCase();
        if (FULL.includes(u)) sizes.push(u);
        else [...u].forEach((ch) => { if ('SML'.includes(ch)) sizes.push(ch); });
      });
      return sizes;
    })
    .filter((a) => a.length);
}

// toplam seri sayısı ve eksik seri listesinden tüm seri listesini üretir
export function buildSeriler(total, eksik) {
  return [...Array(total - eksik.length)].map(() => [...FULL]).concat(eksik);
}

export function stats(seriler) {
  const tam = seriler.filter(isTam).length;
  return { seri: seriler.length, tam, eksik: seriler.length - tam };
}
