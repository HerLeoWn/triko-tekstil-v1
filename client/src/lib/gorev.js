// Görev durumlarının etiketi ve rengi
export const DURUM = {
  bekliyor: { yazi: 'Kabul bekliyor', renk: 'bg-warn-soft text-warn' },
  kabul: { yazi: 'Kabul edildi', renk: 'bg-accent-soft text-accent' },
  kismi: { yazi: 'Kısmi gönderildi', renk: 'bg-track text-ink' },
  tamamlandi: { yazi: 'Tamamlandı', renk: 'bg-accent text-white' },
  reddedildi: { yazi: 'Reddedildi', renk: 'bg-danger-soft text-danger' },
  iptal: { yazi: 'İptal edildi', renk: 'bg-danger-soft text-danger' },
};

// Kalemleri koda göre gruplar. Aynı kod tek başlık altında, renkler alt alta gelir.
export function kodGruplari(kalemler) {
  const map = new Map();
  kalemler.forEach((k) => {
    if (!map.has(k.kod)) map.set(k.kod, { kod: k.kod, kalemler: [] });
    map.get(k.kod).kalemler.push(k);
  });
  return [...map.values()];
}