// Konum ve rota yardımcıları. Rota OpenStreetMap tabanlı OSRM servisinden alınır, anahtar gerekmez.
// Not: OSRM ücretsiz sunucusu garanti vermez. Ek duraklar kuş uçuşu mesafeye göre sıralanır.

// İki nokta arası kuş uçuşu mesafe (metre)
export function mesafeM(a, b) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Duraklar başlangıç noktasına en yakından başlayarak sıralanır
export function enYakinSiraya(baslangic, duraklar) {
  const kalan = [...duraklar];
  const sira = [];
  let nokta = baslangic;
  while (kalan.length) {
    let en = 0;
    kalan.forEach((d, i) => { if (mesafeM(nokta, d) < mesafeM(nokta, kalan[en])) en = i; });
    nokta = kalan.splice(en, 1)[0];
    sira.push(nokta);
  }
  return sira;
}

// Noktalar verilen sırayla yol üzerinden bağlanır. Çizgi, süre (sn) ve mesafe (m) döner.
export async function osrmRota(noktalar) {
  const yol = noktalar.map((p) => `${p.lng},${p.lat}`).join(';');
  const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${yol}?overview=full&geometries=geojson`);
  const j = await r.json();
  if (j.code !== 'Ok' || !j.routes?.length) throw new Error('Rota alınamadı.');
  const rota = j.routes[0];
  return {
    cizgi: rota.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    sureSn: rota.duration,
    mesafeM: rota.distance,
  };
}

export const sureYazi = (sn) => {
  const dk = Math.max(1, Math.round(sn / 60));
  return dk < 60 ? `${dk} dk` : `${Math.floor(dk / 60)} sa ${dk % 60} dk`;
};

// Adres arama (OpenStreetMap Nominatim)
export async function adaAra(q) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=tr&q=${encodeURIComponent(q)}`,
  );
  const j = await r.json();
  return j.map((x) => ({ ad: x.display_name, lat: Number(x.lat), lng: Number(x.lon) }));
}