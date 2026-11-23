// Tarih yardımcıları. "yyyy-mm-dd" metinleri ve ISO zamanları ikisi de dd.mm.yyyy olarak yazılır.
export const tarihYazi = (v) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-');
    return `${d}.${m}.${y}`;
  }
  return new Date(v).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const gunAnahtari = (iso) => new Date(iso).toLocaleDateString('sv-SE');

export const saatYazi = (iso) => new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });