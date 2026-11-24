import { useEffect, useState } from 'react';
import { get, post, put } from '../../lib/istek.js';
import { MapPaneli } from '../harita/MapPaneli.jsx';
import { osrmRota, sureYazi } from '../../lib/rota.js';
import { Empty } from '../ui/Empty.jsx';

const DURUM = {
  bekliyor: ['Onay bekliyor', 'bg-warn-soft text-warn'],
  onaylandi: ['Onaylandı', 'bg-accent-soft text-accent'],
  fasonda: ['Fasonda', 'bg-accent-soft text-accent'],
  girildi: ['Sisteme girildi', 'bg-track text-muted'],
  reddedildi: ['Reddedildi', 'bg-warn-soft text-danger'],
};

const saatYazi = (iso) => (iso ? new Date(iso).toLocaleString('tr-TR', {
  timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}) : '');

// Gelen mallar: kalemler, muhasebe onayı, fasoncu konumu ve depoya tahmini süre
export function GelenMallarPaneli({ yonetici = false }) {
  const [liste, setListe] = useState([]);
  const [fasoncu, setFasoncu] = useState(null);
  const [depo, setDepo] = useState(null);
  const [rota, setRota] = useState(null);
  const [hata, setHata] = useState('');

  const yukle = () => {
    get('/api/gelen-mallar').then(setListe).catch(() => {});
    get('/api/konum/fasoncu').then(setFasoncu).catch(() => {});
    get('/api/konum/depo').then((d) => setDepo(d?.lat != null ? d : null)).catch(() => {});
  };

  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fLat = fasoncu?.lat;
  const fLng = fasoncu?.lng;
  const dLat = depo?.lat;
  const dLng = depo?.lng;
  useEffect(() => {
    if (fLat == null || dLat == null) {
      setRota(null);
      return undefined;
    }
    let iptal = false;
    osrmRota([{ lat: fLat, lng: fLng }, { lat: dLat, lng: dLng }])
      .then((r) => { if (!iptal) setRota(r); })
      .catch(() => { if (!iptal) setRota(null); });
    return () => { iptal = true; };
  }, [fLat, fLng, dLat, dLng]);

  const islem = async (fn) => {
    setHata('');
    try {
      await fn();
      yukle();
    } catch (e) {
      setHata(e.message);
    }
  };

  const onayla = (id) => islem(() => post(`/api/gelen-mallar/${id}/onay`));

  const reddet = (id) => {
    const not = window.prompt('Red sebebi (isteğe bağlı)', '');
    if (not === null) return;
    islem(() => post(`/api/gelen-mallar/${id}/reddet`, { not }));
  };

  const girildi = (id) => islem(() => post(`/api/gelen-mallar/${id}/girildi`));

  const depoKonumKaydet = () => {
    setHata('');
    if (!navigator.geolocation) {
      setHata('Bu cihaz konum desteklemiyor.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => islem(() => put('/api/konum/depo', { lat: p.coords.latitude, lng: p.coords.longitude })),
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
          <div className="space-y-2.5">
            {liste.map((g) => {
              const [yazi, cls] = DURUM[g.durum] ?? [g.durum, 'bg-track text-muted'];
              return (
                <div key={g.id} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-semibold">{g.gonderenAd || 'Fasoncu'}</span>
                      <span className="ml-2 text-xs tabular-nums text-muted">{saatYazi(g.tarih)}</span>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${cls}`}>{yazi}</span>
                  </div>

                  <ul className="space-y-1 text-sm">
                    {g.kalemler.map((k) => (
                      <li key={k.id}>
                        <span className="font-medium">{k.urunAd}</span>
                        {k.urunKod && <span className="text-muted"> ({k.urunKod})</span>}
                        <span className="text-muted"> · {k.renk} · {k.cuval} çuval{k.toplamSeri ? ` · ${k.toplamSeri} seri` : ''}</span>
                      </li>
                    ))}
                  </ul>

                  {g.durum === 'reddedildi' && g.not && (
                    <p className="mt-2 text-sm text-danger">Neden: {g.not}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {g.durum === 'bekliyor' && (
                      <>
                        <button className="btn btn-sm" onClick={() => onayla(g.id)}>Onayla</button>
                        <button className="btn-ghost btn-sm" onClick={() => reddet(g.id)}>Reddet</button>
                      </>
                    )}
                    {(g.durum === 'onaylandi' || g.durum === 'fasonda') && (
                      <button className="btn-ghost btn-sm" onClick={() => girildi(g.id)}>Sisteme girdim</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}