import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Harita: renkli noktalar ve (varsa) rota çizgisi. Harita ilk açılışta tüm noktaları sığdırır.
export function MapPaneli({ noktalar = [], cizgi = null, yukseklik = 300 }) {
  const kapRef = useRef(null);
  const haritaRef = useRef(null);
  const katmanRef = useRef(null);
  const sigdirildi = useRef(false);

  useEffect(() => {
    if (!haritaRef.current) {
      haritaRef.current = L.map(kapRef.current).setView([41.04, 28.9], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(haritaRef.current);
      katmanRef.current = L.layerGroup().addTo(haritaRef.current);
    }

    const katman = katmanRef.current;
    katman.clearLayers();
    const tumNoktalar = [];

    noktalar.forEach((n) => {
      const ll = [n.lat, n.lng];
      tumNoktalar.push(ll);
      L.circleMarker(ll, { radius: 9, color: n.renk, fillColor: n.renk, fillOpacity: 0.9 })
        .bindTooltip(n.ad)
        .addTo(katman);
    });
    if (cizgi && cizgi.length > 1) {
      L.polyline(cizgi, { color: '#3d7a4f', weight: 5, opacity: 0.8 }).addTo(katman);
      tumNoktalar.push(...cizgi);
    }
    if (tumNoktalar.length && !sigdirildi.current) {
      haritaRef.current.fitBounds(L.latLngBounds(tumNoktalar).pad(0.2));
      sigdirildi.current = true;
    }
  }, [noktalar, cizgi]);

  // Ekran boyutu değişince ya da kart açılınca harita boyutunu yeniden hesapla
  useEffect(() => {
    const kap = kapRef.current;
    if (!kap || typeof ResizeObserver === 'undefined') return undefined;
    const gozlem = new ResizeObserver(() => haritaRef.current?.invalidateSize());
    gozlem.observe(kap);
    return () => gozlem.disconnect();
  }, []);

  useEffect(() => () => {
    haritaRef.current?.remove();
    haritaRef.current = null;
  }, []);

  // isolate + z-0: Leaflet'in katmanları kendi kutusunda kalır, başlık ve menülerin altına girmez
  return (
    <div
      ref={kapRef}
      style={{ height: yukseklik }}
      className="isolate relative z-0 w-full overflow-hidden rounded-xl border border-line"
    />
  );
}