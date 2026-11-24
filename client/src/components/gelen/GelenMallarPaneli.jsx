import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { MapPaneli } from '../harita/MapPaneli.jsx';
import { osrmRota, sureYazi } from '../../lib/rota.js';
import { Empty } from '../ui/Empty.jsx';
import { saatYazi, tarihYazi } from '../../lib/tarih.js';

// Gelen mallar listesi, fasoncunun canlı konumu ve depoya tahmini süre
export function GelenMallarPaneli({ yonetici = false }) {
  const [liste, setListe] = useState([]);
  const [fasoncu, setFasoncu] = useState(null);
  const [depo, setDepo] = useState(null);
  const [rota, setRota] = useState(null);
  const [hata, setHata] = useState('');

  const yukle = () => {
    api.get('/api/gelen-mallar').then(setListe).catch(() => {});
    api.get('/api/konum/fasoncu').then(setFasoncu).catch(() => {});
    api.get('/api/konum/depo').then((d) => setDepo(d?.lat ? d : null)).catch(() => {});
  };

  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 10000);
    return () => clearInterval(t);
  }, []);

  // Fasoncu konumu değiştikçe depoya tahmini süreyi yeniden hesapla
  const fLat = fasoncu?.lat;
  const fLng = fasoncu?.lng;
  const dLat = depo?.lat;
  const dLng = depo?.lng;
  useEffect(() => {
    if (fLat == null || dLat == null) {
      setRota(null);
      return;
    }
    osrmRota([{ lat: fLat, lng: fLng }, { lat: dLat, lng: dLng }])
      .then(setRota)
      .catch(() => setRota(null));
  }, [fLat, fLng, dLat, dLng]);

  const girildi = async (id) => {
    setHata('');
    try {
      await api.post(`/api/gelen-mallar/${id}/girildi`);
      yukle();
    } catch (e) {
      setHata(e.message);
    }
  };

  const depoKonumKaydet = () => {
    setHata('');
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          await api.put('/api/konum/depo', { lat: p.coords.latitude, lng: p.coords.longitude });
          yukle();
        } catch (e) {
          setHata(e.message);
        }
      },
      () => setHata('Konum alınamadı. Bu işlemi depoda, konum izni verilmiş cihazla yapın.'),
      { enableHighAccuracy: true },
    );
  };

  const noktalar = [
    ...(depo ? [{ lat: depo.lat, lng: depo.lng, ad: 'Depo', renk: '#3d7a4f' }] : []),
    ...(fasoncu ? [{ lat: fasoncu.lat, lng: fasoncu.lng, ad: fasoncu.ad, renk: '#2563eb' }] : []),
  ];

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted">Fasoncu konumu</h3>
          {yonetici && (
            <button className="btn-ghost btn-sm" onClick={depoKonumKaydet}>Depo konumunu bu cihazdan kaydet</button>
          )}
        </div>

        <div className="mb-3 text-sm">
          {fasoncu
            ? <>{fasoncu.ad} · son konum {saatYazi(fasoncu.zaman)}</>
            : <span className="text-muted">Fasoncu konumunu paylaşmıyor.</span>}
          {rota && (
            <div className="mt-1">
              Depoya tahmini <b>{sureYazi(rota.sureSn)}</b> · {(rota.mesafeM / 1000).toFixed(1)} km
            </div>
          )}
          {!depo && <div className="mt-1 text-muted">Depo konumu tanımlı değil.</div>}
        </div>

        <MapPaneli noktalar={noktalar} cizgi={rota?.cizgi ?? null} yukseklik={260} />
        {hata && <p className="mt-2 text-sm text-warn">⚠ {hata}</p>}
      </div>

      <div className="card p-4">
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Gelen mallar</h3>
        {liste.length === 0 ? (
          <Empty text="Henüz gelen mal bildirimi yok." />
        ) : (
          <div className="space-y-2">
            {liste.map((g) => (
              <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3">
                <div>
                  <div className="font-semibold">
                    {g.urunAd}{g.urunKod ? <span className="ml-1 font-normal text-muted">({g.urunKod})</span> : null}
                  </div>
                  <div className="text-xs tabular-nums text-muted">
                    {g.cuval} çuval{g.toplamSeri ? ` · ${g.toplamSeri} seri` : ''} · {g.gonderenAd} · {tarihYazi(g.tarih)} {saatYazi(g.tarih)}
                  </div>
                </div>
                {g.durum === 'bekliyor' ? (
                  <button className="btn btn-sm" onClick={() => girildi(g.id)}>Sisteme girdim</button>
                ) : (
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent">Sisteme girildi</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}