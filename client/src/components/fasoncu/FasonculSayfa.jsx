import { useEffect, useRef, useState } from 'react';
import { get, post, put, del } from '../../lib/istek.js';
import { osrmRota, adaAra, mesafeM, sureYazi } from '../../lib/rota.js';
import { ConfirmButton } from '../../Confirm.jsx';

const DURAK_YAKIN_M = 150;
const BOS_KALEM = { urunAd: '', urunKod: '', renk: '', cuval: '', toplamSeri: '' };
const bugunKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
const saatYazi = (iso) => new Date(iso).toLocaleString('tr-TR', {
  timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
});

const GELEN_DURUM = {
  bekliyor: ['Depo onayı bekliyor', 'bg-warn-soft text-warn'],
  onaylandi: ['Onaylandı', 'bg-accent-soft text-accent'],
  fasonda: ['Fasonda', 'bg-accent-soft text-accent'],
  girildi: ['Sisteme girildi', 'bg-track text-muted'],
  reddedildi: ['Reddedildi', 'bg-warn-soft text-danger'],
};
const ROTA_DURUM = {
  aktif: ['Aktif', 'bg-accent-soft text-accent'],
  beklemede: ['Beklemede', 'bg-warn-soft text-warn'],
  pasif: ['Pasif', 'bg-track text-muted'],
};

function Rozet({ durum, harita }) {
  const [yazi, cls] = harita[durum] ?? [durum, 'bg-track text-muted'];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${cls}`}>{yazi}</span>;
}

const kalemYazi = (k) =>
  `${k.urunAd}${k.urunKod ? ` (${k.urunKod})` : ''} · ${k.renk} · ${k.cuval} çuval${k.toplamSeri ? ` · ${k.toplamSeri} seri` : ''}`;

// Konum yaklaşık 100 m hassasiyetle yuvarlanır, böylece her GPS güncellemesinde rota yeniden hesaplanmaz
const yuvarla = (n) => (n == null ? null : Math.round(n * 1000) / 1000);

// Fasoncu ekranı: gelen mal bildirimi, bildirimler, konum ve tahmini varış, rotasyonlar
export function FasonculSayfa({ kullanici, onCikis }) {
  const [kalemler, setKalemler] = useState([{ ...BOS_KALEM }]);
  const [gelenNot, setGelenNot] = useState({ tur: '', yazi: '' });
  const [gelenler, setGelenler] = useState([]);
  const [bildirimler, setBildirimler] = useState([]);
  const [rotalar, setRotalar] = useState([]);
  const [depo, setDepo] = useState(null);

  const [konum, setKonum] = useState(null);
  const [konumHata, setKonumHata] = useState('');
  const [paylasim, setPaylasim] = useState(false);
  const [eta, setEta] = useState(null);
  const konumRef = useRef(null);
  const ziyaretIsaretli = useRef(new Set());

  const [rotaForm, setRotaForm] = useState({ id: null, ad: '', duraklar: [] });
  const [aramaMetni, setAramaMetni] = useState('');
  const [sonuclar, setSonuclar] = useState([]);
  const [hata, setHata] = useState('');

  const yukle = () => {
    get('/api/fasoncu/gelen-mallar').then(setGelenler).catch(() => {});
    get('/api/fasoncu/bildirimler').then(setBildirimler).catch(() => {});
    get('/api/fasoncu/rotalar').then(setRotalar).catch(() => {});
    get('/api/konum/depo').then((d) => setDepo(d?.lat != null ? d : null)).catch(() => {});
  };

  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Konum sayfa açıkken izlenir. Sunucuya gönderimi ayrıca paylaşım düğmesi yönetir.
  useEffect(() => {
    if (!navigator.geolocation) {
      setKonumHata('Bu cihaz konum desteklemiyor.');
      return undefined;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const k = { lat: p.coords.latitude, lng: p.coords.longitude };
        konumRef.current = k;
        setKonum(k);
        setKonumHata('');
      },
      (err) => setKonumHata(
        err.code === 1
          ? 'Konum izni verilmemiş. Tarayıcı ya da cihaz ayarlarından konum iznini açıp sayfayı yenileyin.'
          : 'Konum alınamadı, biraz sonra tekrar deneyin.',
      ),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // Paylaşım açıkken konum 15 saniyede bir sunucuya gider
  useEffect(() => {
    if (!paylasim) return undefined;
    const gonder = () => {
      if (konumRef.current) post('/api/konum/fasoncu', konumRef.current).catch(() => {});
    };
    gonder();
    const t = setInterval(gonder, 15000);
    return () => clearInterval(t);
  }, [paylasim]);

  // Depoya tahmini varış süresi (konum ve depo konumu varsa)
  const kLat = yuvarla(konum?.lat);
  const kLng = yuvarla(konum?.lng);
  const dLat = depo?.lat;
  const dLng = depo?.lng;
  useEffect(() => {
    if (kLat == null || dLat == null) {
      setEta(null);
      return undefined;
    }
    let iptal = false;
    osrmRota([{ lat: kLat, lng: kLng }, { lat: dLat, lng: dLng }])
      .then((r) => { if (!iptal) setEta(r); })
      .catch(() => { if (!iptal) setEta(null); });
    return () => { iptal = true; };
  }, [kLat, kLng, dLat, dLng]);

  // Aktif bir rotanın durağına yakınsa, gün içinde ilk ziyaret sunucuya bildirilir
  useEffect(() => {
    if (!konum) return;
    const bugun = bugunKey();
    rotalar.forEach((r) => {
      if (r.durum !== 'aktif' || r.sonZiyaretGun === bugun) return;
      const anahtar = `${r.id}-${bugun}`;
      if (ziyaretIsaretli.current.has(anahtar)) return;
      if (r.duraklar.some((d) => mesafeM(konum, d) <= DURAK_YAKIN_M)) {
        ziyaretIsaretli.current.add(anahtar);
        post(`/api/fasoncu/rotalar/${r.id}/ziyaret`).then(yukle).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [konum, rotalar]);

  /* ---------- Gelen mal ---------- */

  const kalemGuncelle = (i, alan, deger) =>
    setKalemler((k) => k.map((x, j) => (j === i ? { ...x, [alan]: deger } : x)));
  const kalemEkle = () => setKalemler((k) => [...k, { ...BOS_KALEM }]);
  const kalemSil = (i) => setKalemler((k) => k.filter((_, j) => j !== i));

  const bildir = async () => {
    setGelenNot({ tur: '', yazi: '' });
    try {
      await post('/api/fasoncu/gelen-mallar', { kalemler });
      setGelenNot({ tur: 'ok', yazi: 'Depo sorumlusuna bildirildi. Onay gelince bildirim göreceksiniz.' });
      setKalemler([{ ...BOS_KALEM }]);
      yukle();
    } catch (e) {
      setGelenNot({ tur: 'hata', yazi: e.message });
    }
  };

  const fasonaBasla = (id) => {
    setHata('');
    post(`/api/fasoncu/gelen-mallar/${id}/basla`).then(yukle).catch((e) => setHata(e.message));
  };

  const gelenSil = (id) => {
    setHata('');
    del(`/api/fasoncu/gelen-mallar/${id}`).then(yukle).catch((e) => setHata(e.message));
  };

  const bildirimleriOkundu = () => {
    post('/api/fasoncu/bildirimler/okundu').then(yukle).catch(() => {});
  };

  /* ---------- Rotasyonlar ---------- */

  const ara = async () => {
    setHata('');
    try {
      setSonuclar(await adaAra(aramaMetni));
    } catch {
      setHata('Arama yapılamadı.');
    }
  };

  const durakEkle = (s) => {
    setRotaForm((f) => ({ ...f, duraklar: [...f.duraklar, { ad: s.ad.split(',')[0], lat: s.lat, lng: s.lng }] }));
    setSonuclar([]);
    setAramaMetni('');
  };

  const durakTasi = (i, yon) => setRotaForm((f) => {
    const d = [...f.duraklar];
    const j = i + yon;
    if (j < 0 || j >= d.length) return f;
    [d[i], d[j]] = [d[j], d[i]];
    return { ...f, duraklar: d };
  });

  const durakCikar = (i) =>
    setRotaForm((f) => ({ ...f, duraklar: f.duraklar.filter((_, j) => j !== i) }));

  const rotaFormSifirla = () => setRotaForm({ id: null, ad: '', duraklar: [] });

  const rotaKaydet = async () => {
    setHata('');
    if (!rotaForm.ad.trim()) {
      setHata('Rotasyona bir ad verin.');
      return;
    }
    if (rotaForm.duraklar.length === 0) {
      setHata('En az bir durak ekleyin.');
      return;
    }
    const govde = { ad: rotaForm.ad.trim(), duraklar: rotaForm.duraklar };
    try {
      if (rotaForm.id) await put(`/api/fasoncu/rotalar/${rotaForm.id}`, govde);
      else await post('/api/fasoncu/rotalar', govde);
      rotaFormSifirla();
      yukle();
    } catch (e) {
      setHata(e.message);
    }
  };

  const rotaDuzenle = (r) => setRotaForm({ id: r.id, ad: r.ad, duraklar: r.duraklar });

  const rotaSil = async (r) => {
    if (!window.confirm(`"${r.ad}" rotasyonu silinsin mi?`)) return;
    try {
      await del(`/api/fasoncu/rotalar/${r.id}`);
      if (rotaForm.id === r.id) rotaFormSifirla();
      yukle();
    } catch (e) {
      setHata(e.message);
    }
  };

  const soruCevap = (r, yol, evet) => {
    setHata('');
    post(`/api/fasoncu/rotalar/${r.id}/${yol}`, { evet }).then(yukle).catch((e) => setHata(e.message));
  };

  const aktifeAl = (r) => {
    setHata('');
    post(`/api/fasoncu/rotalar/${r.id}/aktif`).then(yukle).catch((e) => setHata(e.message));
  };

  const okunmamis = bildirimler.filter((b) => !b.okundu);
  const bugun = bugunKey();

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
        {okunmamis.length > 0 && (
          <section className="card border-l-4 border-accent p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Yeni bildirimler ({okunmamis.length})
              </h2>
              <button className="btn-ghost btn-sm" onClick={bildirimleriOkundu}>Tümünü okundu say</button>
            </div>
            <div className="space-y-1.5">
              {okunmamis.map((b) => (
                <p key={b.id} className="text-sm">{b.metin}</p>
              ))}
            </div>
          </section>
        )}

        <section className="card p-4">
          <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Konum ve tahmini varış</h2>
          <button className={paylasim ? 'btn' : 'btn-ghost'} onClick={() => setPaylasim((p) => !p)}>
            {paylasim ? 'Konum paylaşımını durdur' : 'Konumumu paylaşmaya başla'}
          </button>
          <p className="mt-2 text-xs text-muted">
            Paylaşım açıkken depo sorumlusu tahmini varış sürenizi görür. Kapattığınızda ya da sayfayı kapattığınızda paylaşım durur.
          </p>

          <div className="mt-3 text-base">
            {!konum && !konumHata && <span className="text-muted">Konum bekleniyor…</span>}
            {konum && !depo && <span className="text-muted">Depo konumu henüz tanımlanmadı.</span>}
            {konum && depo && eta && (
              <>Depoya tahmini <b>{sureYazi(eta.sureSn)}</b> · {(eta.mesafeM / 1000).toFixed(1)} km</>
            )}
            {konum && depo && !eta && <span className="text-muted">Süre hesaplanıyor…</span>}
          </div>
          {konumHata && <p className="mt-2 text-sm text-warn">⚠ {konumHata}</p>}
        </section>

        <section className="card p-4">
          <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Gelen mal bildir</h2>
          <p className="mb-3 text-xs text-muted">Her renk ve her farklı kod ayrı kalem olarak girilir.</p>
          <div className="grid gap-3">
            {kalemler.map((k, i) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">Kalem {i + 1}</span>
                  {kalemler.length > 1 && (
                    <button className="btn-ghost btn-sm" onClick={() => kalemSil(i)}>Kaldır</button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="inp" placeholder="Ürün modeli (tam adı)" value={k.urunAd}
                    onChange={(e) => kalemGuncelle(i, 'urunAd', e.target.value)} />
                  <input className="inp" placeholder="Ürün kodu (opsiyonel)" value={k.urunKod}
                    onChange={(e) => kalemGuncelle(i, 'urunKod', e.target.value)} />
                  <input className="inp" placeholder="Renk" value={k.renk}
                    onChange={(e) => kalemGuncelle(i, 'renk', e.target.value)} />
                  <input className="inp" type="number" min="1" placeholder="Çuval sayısı" value={k.cuval}
                    onChange={(e) => kalemGuncelle(i, 'cuval', e.target.value)} />
                  <input className="inp sm:col-span-2" type="number" min="1" placeholder="Toplam seri (opsiyonel)"
                    value={k.toplamSeri} onChange={(e) => kalemGuncelle(i, 'toplamSeri', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn-ghost btn-sm" onClick={kalemEkle}>+ Kalem ekle</button>
            <button className="btn" onClick={bildir}>Depo sorumlusuna bildir</button>
          </div>
          {gelenNot.yazi && (
            <p className={`mt-2 text-sm ${gelenNot.tur === 'ok' ? 'text-accent' : 'text-warn'}`}>{gelenNot.yazi}</p>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Bildirimlerim</h2>
          {gelenler.length === 0 ? (
            <p className="text-sm text-muted">Henüz gelen mal bildirmediniz.</p>
          ) : (
            <div className="space-y-2">
              {gelenler.map((g) => (
                <div key={g.id} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs tabular-nums text-muted">{saatYazi(g.tarih)}</span>
                    <Rozet durum={g.durum} harita={GELEN_DURUM} />
                  </div>
                  <ul className="space-y-1 text-sm">
                    {g.kalemler.map((k) => <li key={k.id}>{kalemYazi(k)}</li>)}
                  </ul>
                  {g.durum === 'reddedildi' && g.not && (
                    <p className="mt-2 text-sm text-danger">Neden: {g.not}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {g.durum === 'onaylandi' && (
                      <button className="btn btn-sm" onClick={() => fasonaBasla(g.id)}>Fasona başla</button>
                    )}
                    {(g.durum === 'bekliyor' || g.durum === 'reddedildi') && (
                      <ConfirmButton question="Silinsin mi?" onConfirm={() => gelenSil(g.id)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">
            {rotaForm.id ? 'Rotasyonu düzenle' : 'Yeni rotasyon'}
          </h2>
          <div className="grid gap-2.5">
            <input className="inp" placeholder="Rotasyon adı (ör. İplikten mal alınır)" value={rotaForm.ad}
              onChange={(e) => setRotaForm((f) => ({ ...f, ad: e.target.value }))} />
            <div className="flex gap-2">
              <input className="inp" placeholder="Durak adresi ya da yer adı" value={aramaMetni}
                onChange={(e) => setAramaMetni(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aramaMetni.trim() && ara()} />
              <button className="btn-ghost btn-sm shrink-0" onClick={ara} disabled={!aramaMetni.trim()}>Ara</button>
            </div>
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

          {rotaForm.duraklar.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {rotaForm.duraklar.map((d, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{i + 1}. {d.ad}</span>
                  <span className="flex shrink-0 gap-1">
                    <button className="btn-ghost btn-sm" onClick={() => durakTasi(i, -1)} aria-label="Yukarı">↑</button>
                    <button className="btn-ghost btn-sm" onClick={() => durakTasi(i, 1)} aria-label="Aşağı">↓</button>
                    <button className="btn-ghost btn-sm" onClick={() => durakCikar(i)}>Kaldır</button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" onClick={rotaKaydet}>{rotaForm.id ? 'Güncelle' : 'Rotasyonu kaydet'}</button>
            {rotaForm.id && <button className="btn-ghost" onClick={rotaFormSifirla}>Vazgeç</button>}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Rotasyonlarım</h2>
          {rotalar.length === 0 ? (
            <p className="text-sm text-muted">Henüz rotasyon yok. Yukarıdan ilk rotanızı kaydedin.</p>
          ) : (
            <div className="space-y-2.5">
              {rotalar.map((r) => {
                const ziyaret = r.sonZiyaretGun === bugun;
                const soruGoster = r.durum === 'aktif' && ziyaret && r.soruGun !== bugun;
                const cikisGoster = r.durum === 'aktif' && r.alindiGun === bugun && r.cikisGun !== bugun;
                return (
                  <div key={r.id} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold">{r.ad}</div>
                        <div className="text-xs text-muted">{r.duraklar.map((d) => d.ad).join(' → ')}</div>
                      </div>
                      <Rozet durum={r.durum} harita={ROTA_DURUM} />
                    </div>

                    {ziyaret && <p className="mt-2 text-sm text-accent">✓ Bugün bu rotada ziyaret tespit edildi</p>}
                    {r.alindiGun === bugun && <p className="text-sm text-accent">✓ Mal alındı</p>}

                    {soruGoster && (
                      <div className="mt-2 rounded-lg bg-track p-2.5">
                        <p className="mb-2 text-sm">Mal alındı mı?</p>
                        <div className="flex gap-2">
                          <button className="btn btn-sm" onClick={() => soruCevap(r, 'alindi', true)}>Evet</button>
                          <button className="btn-ghost btn-sm" onClick={() => soruCevap(r, 'alindi', false)}>Hayır</button>
                        </div>
                      </div>
                    )}

                    {cikisGoster && (
                      <div className="mt-2 rounded-lg bg-track p-2.5">
                        <p className="mb-2 text-sm">Mal çıkacak mı?</p>
                        <div className="flex gap-2">
                          <button className="btn btn-sm" onClick={() => soruCevap(r, 'cikis', true)}>Evet, beklemede kalsın</button>
                          <button className="btn-ghost btn-sm" onClick={() => soruCevap(r, 'cikis', false)}>Hayır, pasife al</button>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => rotaDuzenle(r)}>Düzenle</button>
                      {r.durum !== 'aktif' && (
                        <button className="btn-ghost btn-sm" onClick={() => aktifeAl(r)}>Aktife al</button>
                      )}
                      <button className="btn-ghost btn-sm text-danger" onClick={() => rotaSil(r)}>Sil</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {hata && <p className="mt-3 text-sm text-warn">⚠ {hata}</p>}
        </section>
      </main>
    </div>
  );
}