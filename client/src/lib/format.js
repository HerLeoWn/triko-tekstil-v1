// Tarih biçimi (Türkçe, gün/ay/yıl saat:dakika)
export const fmt = (iso) =>
  new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

// Son 14 günün giden seri toplamı (grafik için)
export function son14Gun(rows) {
  return [...Array(14)].map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (13 - i));
    const key = d.toDateString();
    const value = rows
      .filter((g) => new Date(g.tarih).toDateString() === key)
      .reduce((s, g) => s + g.seri, 0);
    return { label: `${d.getDate()}/${d.getMonth() + 1}`, value };
  });
}