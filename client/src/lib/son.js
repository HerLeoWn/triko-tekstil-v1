const SON_KEY = 'triko-son-cuval';

// Son girilen çuval içeriği ("Bunu kullan" için). Tarayıcı depolaması kapalıysa sessizce geçer.
export const sonKaydet = (kayit) => {
  try { localStorage.setItem(SON_KEY, JSON.stringify(kayit)); } catch {}
};

export const sonOku = () => {
  try { return JSON.parse(localStorage.getItem(SON_KEY)); } catch { return null; }
};