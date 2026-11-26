import { useEffect, useState } from 'react';
import { get, post, del } from '../../lib/istek.js';
import { ConfirmButton } from '../../Confirm.jsx';
import { Empty } from '../ui/Empty.jsx';

const saatYazi = (iso) => (iso ? new Date(iso).toLocaleString('tr-TR', {
  timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}) : '');

const TIP = { alim: 'Depodan mal aldım', teslim: 'Depoya mal bıraktım' };
const DURUM = {
  bekliyor: ['Onay bekliyor', 'bg-warn-soft text-warn'],
  onaylandi: ['Onaylandı', 'bg-accent-soft text-accent'],
  reddedildi: ['Reddedildi', 'bg-warn-soft text-danger'],
};
const BOS = { tip: 'alim', kod: '', renk: '', depoId: '', cuval: '', seri: '', not: '' };

function Rozet({ durum }) {
  const [yazi, cls] = DURUM[durum] ?? [durum, 'bg-track text-muted'];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${cls}`}>{yazi}</span>;
}

// Fasoncu: depodan alım ya da depoya teslim bildirimi ve kendi bildirimlerinin durumu
export function FasonHareketPaneli() {
  const [depolar, setDepolar] = useState([]);
  const [form, setForm] = useState(BOS);
  const [liste, setListe] = useState([]);
  const [bildirim, setBildirim] = useState({ tur: '', yazi: '' });

  const yukle = () => get('/api/fasoncu/hareketler').then(setListe).catch(() => {});

  useEffect(() => {
    get('/api/fasoncu/depolar').then((d) => {
      setDepolar(d);
      setForm((f) => (f.depoId ? f : { ...f, depoId: String(d[0]?.id ?? '') }));
    }).catch(() => {});
    yukle();
    const t = setInterval(yukle, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alanGuncelle = (alan, deger) => setForm((f) => ({ ...f, [alan]: deger }));

  const gonder = async () => {
    setBildirim({ tur: '', yazi: '' });
    try {
      await post('/api/fasoncu/hareketler', { ...form, depoId: Number(form.depoId) });
      setBildirim({ tur: 'ok', yazi: `${TIP[form.tip]} olarak bildirildi. Depo sorumlusu onaylayınca stok güncellenecek.` });
      setForm((f) => ({ ...BOS, tip: f.tip, depoId: f.depoId }));
      yukle();
    } catch (e) {
      setBildirim({ tur: 'hata', yazi: e.message });
    }
  };

  const hazir = form.kod.trim() && form.renk.trim() && +form.cuval > 0 && +form.seri > 0 && form.depoId;

  return (
    <section className="card p-4">
      <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Depo hareketi bildir</h2>
      <p className="mb-3 text-xs text-muted">Depodan mal aldığınızda ya da depoya mal bıraktığınızda girin. Depo sorumlusu onaylayınca stok güncellenir.</p>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {Object.entries(TIP).map(([k, ad]) => (
          <button
            key={k}
            type="button"
            className={form.tip === k ? 'btn btn-sm' : 'btn-ghost btn-sm'}
            onClick={() => alanGuncelle('tip', k)}
          >
            {ad}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input className="inp" placeholder="Ürün kodu (ör. 2606)" value={form.kod}
          onChange={(e) => alanGuncelle('kod', e.target.value)} />
        <input className="inp" placeholder="Renk (ör. Vanilya)" value={form.renk}
          onChange={(e) => alanGuncelle('renk', e.target.value)} />
        <select className="inp" value={form.depoId} onChange={(e) => alanGuncelle('depoId', e.target.value)}>
          {depolar.map((d) => <option key={d.id} value={String(d.id)}>{d.ad}</option>)}
        </select>
        <input className="inp" type="number" min="1" placeholder="Çuval sayısı" value={form.cuval}
          onChange={(e) => alanGuncelle('cuval', e.target.value)} />
        <input className="inp sm:col-span-2" type="number" min="1" placeholder="Toplam seri" value={form.seri}
          onChange={(e) => alanGuncelle('seri', e.target.value)} />
        <input className="inp sm:col-span-2" placeholder="Not (isteğe bağlı)" value={form.not}
          onChange={(e) => alanGuncelle('not', e.target.value)} />
      </div>

      <div className="mt-3">
        <button className="btn" disabled={!hazir} onClick={gonder}>Bildir</button>
      </div>
      {bildirim.yazi && (
        <p className={`mt-2 text-sm ${bildirim.tur === 'ok' ? 'text-accent' : 'text-warn'}`}>{bildirim.yazi}</p>
      )}

      <div className="mt-5">
        <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Bildirimlerim</h3>
        {liste.length === 0 ? (
          <p className="text-sm text-muted">Henüz depo hareketi bildirmediniz.</p>
        ) : (
          <div className="space-y-2">
            {liste.map((h) => (
              <div key={h.id} className="rounded-xl border border-line p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{TIP[h.tip]}</span>
                  <Rozet durum={h.durum} />
                </div>
                <div className="text-sm">
                  {h.kod}{h.urunAd ? ` (${h.urunAd})` : ''} · {h.renk} · {h.cuval} çuval · {h.seri} seri
                </div>
                <div className="mt-1 text-xs text-muted">{h.depo} · {saatYazi(h.tarih)}</div>
                {h.durum === 'reddedildi' && h.not && <p className="mt-1 text-sm text-danger">Neden: {h.not}</p>}
                {h.durum === 'bekliyor' && (
                  <div className="mt-2">
                    <ConfirmButton
                      question="Bildirim silinsin mi?"
                      onConfirm={() => del(`/api/fasoncu/hareketler/${h.id}`).then(yukle)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Depo sorumlusu: gelen fason hareketleri, onay ya da red
export function FasonHareketleriYonetici() {
  const [liste, setListe] = useState([]);
  const [hata, setHata] = useState('');

  const yukle = () => get('/api/fason-hareketler').then(setListe).catch((e) => setHata(e.message));

  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onayla = (id) => {
    setHata('');
    post(`/api/fason-hareketler/${id}/onay`).then(yukle).catch((e) => setHata(e.message));
  };

  const reddet = (id) => {
    const not = window.prompt('Red sebebi (isteğe bağlı)', '');
    if (not === null) return;
    setHata('');
    post(`/api/fason-hareketler/${id}/reddet`, { not }).then(yukle).catch((e) => setHata(e.message));
  };

  const bekleyen = liste.filter((h) => h.durum === 'bekliyor').length;

  if (!liste.length) return <Empty text="Henüz fason hareketi yok." />;

  return (
    <div className="space-y-3 p-4">
      <div className="text-sm">
        Onay bekleyen: <b className="tabular-nums">{bekleyen}</b>
      </div>
      {hata && <p className="text-sm text-warn">⚠ {hata}</p>}
      {liste.map((h) => (
        <div key={h.id} className="rounded-xl border border-line p-3">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              {h.fasoncuAd || 'Fasoncu'} · {TIP[h.tip]}
            </span>
            <Rozet durum={h.durum} />
          </div>
          <div className="text-sm">
            {h.kod}{h.urunAd ? ` (${h.urunAd})` : ''} · {h.renk} · {h.cuval} çuval · {h.seri} seri
          </div>
          <div className="mt-1 text-xs text-muted">{h.depo} · {saatYazi(h.tarih)}</div>
          {h.durum === 'reddedildi' && h.not && <p className="mt-1 text-sm text-danger">Neden: {h.not}</p>}
          {h.durum === 'bekliyor' && (
            <div className="mt-3 flex gap-2">
              <button className="btn btn-sm" onClick={() => onayla(h.id)}>Onayla</button>
              <button className="btn-ghost btn-sm" onClick={() => reddet(h.id)}>Reddet</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}