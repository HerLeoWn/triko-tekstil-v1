import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';
import { MapPaneli } from '../harita/MapPaneli.jsx';
import { osrmRota, enYakinSiraya, sureYazi, adaAra } from '../../lib/rota.js';

const BOS_FORM = { urunAd: '', urunKod: '', cuval: '', toplamSeri: '' };

// Fasoncu ekranı: gelen mal bildirimi, konum paylaşımı ve depoya rota
export function FasonculSayfa({ kullanici, onCikis }) {
  const [form, setForm] = useState(BOS_FORM);
  const [bildirim, setBildirim] = useState({ tur: '', yazi: '' });
  const [paylasim, setPaylasim] = useState(false);
  const [konum, setKonum] = useState(null);
  const konumRef = useRef(null);
  const [depo, setDepo] = useState(null);
  const [duraklar, setDuraklar] = useState([]);
  const [rota, setRota] = useState(null);
  const [aramaMetni, setAramaMetni] = useState('');
  const [sonuclar, setSonuclar] = useState([]);
  const [hata, setHata] = useState('');

  useEffect(() => {
    api.get('/api/konum/depo').then((d) => setDepo(d?.lat ? d : null)).catch(() => {});
  }, []);

  // Konum izlemesi (yalnızca paylaşım açıkken)
  useEffect(() => {
    if (!paylasim) return undefined;
    if (!navigator.geolocation) {
      setHata('Bu cihaz konum desteklemiyor.');
      return undefined;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const k = { lat: p.coords.latitude, lng: p.coords.longitude };
        konumRef.current = k;
        setKonum(k);
      },
      () => setHata('Konum alınamadı. Tarayıcıda konum iznini kontrol edin.'),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [paylasim]);

  // Konum 15 saniyede bir sunucuya gönderilir
  useEffect(() => {
    if (!paylasim) return undefined;
    const t = setInterval(() => {
      if (konumRef.current) api.post('/api/konum/fasoncu', konumRef.current).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [paylasim]);

  const rotayiYenile = () => {
    const k = konumRef.current;
    if (!k || !depo) return;
    setHata('');
    const sirali = enYakinSiraya(k, duraklar);
    osrmRota([k, ...sirali, depo]).then(setRota).catch(() => setHata('Rota alınamadı. Biraz sonra tekrar deneyin.'));
  };

  // Konum ilk alındığında, depo bilgisi geldiğinde ya da ek durak değiştiğinde rotayı yeniden hesapla
  const konumVar = !!konum;
  useEffect(() => {
    if (konumVar && depo) rotayiYenile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [konumVar, depo, duraklar]);

  const bildir = async () => {
    setBildirim({ tur: '', yazi: '' });
    try {
      await api.post('/api/gelen-mallar', form);
      setBildirim({ tur: 'ok', yazi: 'Muhasebeye bildirildi.' });
      setForm(BOS_FORM);
    } catch (e) {
      setBildirim({ tur: 'hata', yazi: e.message });
    }
  };

  const ara = async () => {
    setHata('');
    try {
      setSonuclar(await adaAra(aramaMetni));
    } catch {
      setHata('Arama yapılamadı.');
    }
  };

  const durakEkle = (s) => {
    setDuraklar((d) => [...d, { ad: s.ad.split(',')[0], lat: s.lat, lng: s.lng }]);
    setSonuclar([]);
    setAramaMetni('');
  };

  const noktalar = [
    ...(depo ? [{ lat: depo.lat, lng: depo.lng, ad: 'Depo', renk: '#3d7a4f' }] : []),
    ...(konum ? [{ lat: konum.lat, lng: konum.lng, ad: 'Ben', renk: '#2563eb' }] : []),
    ...duraklar.map((d) => ({ lat: d.lat, lng: d.lng, ad: d.ad, renk: '#d97706' })),
  ];

  const inputCls = 'inp';

  return (
    <div className="min-h-screen bg-bg pb-10">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-accent to-accent-hover text-white shadow-soft">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Fasoncu</h1>
            <p className="text-xs text-white/70">{kullanici.ad}</p>
          </div>
          <button className="underline underline-offset-2 hover:text-white/80" onClick={onCikis}>Çıkış</button>
        </div>
      </header>

      <main className="mx-auto grid max-w-2xl gap-4 p-4">
        <section className="card p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Gelen mal bildir</h2>
          <div className="grid gap-2.5">
            <input className={inputCls} placeholder="Ürün modeli (tam adı)" value={form.urunAd}
              onChange={(e) => setForm({ ...form, urunAd: e.target.value })} />
            <input className={inputCls} placeholder="Ürün kodu (biliyorsanız)" value={form.urunKod}
              onChange={(e) => setForm({ ...form, urunKod: e.target.value })} />
            <div className="grid grid-cols-2 gap-2.5">
              <input className={inputCls} type="number" min="1" placeholder="Çuval sayısı" value={form.cuval}
                onChange={(e) => setForm({ ...form, cuval: e.target.value })} />
              <input className={inputCls} type="number" min="1" placeholder="Toplam seri (opsiyonel)" value={form.toplamSeri}
                onChange={(e) => setForm({ ...form, toplamSeri: e.target.value })} />
            </div>
          </div>
          <button className="btn mt-3" onClick={bildir}>Muhasebeye bildir</button>
          {bildirim.yazi && (
            <p className={`mt-2 text-sm ${bildirim.tur === 'ok' ? 'text-accent' : 'text-warn'}`}>{bildirim.yazi}</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Konumum</h2>
          <button className={paylasim ? 'btn' : 'btn-ghost'} onClick={() => setPaylasim((p) => !p)}>
            {paylasim ? 'Konum paylaşımını durdur' : 'Konumumu paylaşmaya başla'}
          </button>
          <p className="mt-2 text-xs text-muted">
            Konum yalnızca bu sayfa açıkken paylaşılır. Uygulamayı kapatırsanız paylaşım durur.
          </p>
        </section>

        <section className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted">Depoya rota</h2>
            <button className="btn-ghost btn-sm" onClick={rotayiYenile} disabled={!konum || !depo}>
              Rotayı yenile
            </button>
          </div>

          {!depo && <p className="text-sm text-muted">Depo konumu henüz tanımlanmamış. Depo sorumlusu depoda bir kez kaydetmeli.</p>}

          {rota && (
            <p className="mb-3 text-sm">
              Depoya tahmini <b>{sureYazi(rota.sureSn)}</b> · {(rota.mesafeM / 1000).toFixed(1)} km
            </p>
          )}

          <MapPaneli noktalar={noktalar} cizgi={rota?.cizgi ?? null} />

          <div className="mt-4">
            <div className="mb-2 text-sm font-medium">Ek durak ekle</div>
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Adres ya da yer adı" value={aramaMetni}
                onChange={(e) => setAramaMetni(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aramaMetni.trim() && ara()} />
              <button className="btn-ghost btn-sm" onClick={ara} disabled={!aramaMetni.trim()}>Ara</button>
            </div>
            {sonuclar.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {sonuclar.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
                    <span className="line-clamp-2">{s.ad}</span>
                    <button className="btn-ghost btn-sm shrink-0" onClick={() => durakEkle(s)}>Ekle</button>
                  </div>
                ))}
              </div>
            )}
            {duraklar.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {duraklar.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span>{i + 1}. {d.ad}</span>
                    <button className="btn-ghost btn-sm" onClick={() => setDuraklar((x) => x.filter((_, j) => j !== i))}>Kaldır</button>
                  </div>
                ))}
                <p className="text-xs text-muted">Duraklar, başlangıca en yakından başlayarak sıralanır.</p>
              </div>
            )}
          </div>

          {hata && <p className="mt-3 text-sm text-warn">⚠ {hata}</p>}
        </section>
      </main>
    </div>
  );
}