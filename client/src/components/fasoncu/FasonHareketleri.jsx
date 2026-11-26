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
const BOS_KALEM = { kod: '', renk: '', cuval: '', seri: '' };
const BOS = { tip: 'alim', depoId: '', not: '', kalemler: [{ ...BOS_KALEM }] };
const kalemGecerli = (k) => k.kod.trim() && k.renk.trim() && +k.cuval > 0 && +k.seri > 0;

function Rozet({ durum }) {
  const [yazi, cls] = DURUM[durum] ?? [durum, 'bg-track text-muted'];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${cls}`}>{yazi}</span>;
}

function KalemListesi({ kalemler }) {
  return (
    <ul className="space-y-1 text-sm">
      {kalemler.map((k) => (
        <li key={k.id}>
          <span className="font-medium">{k.kod}</span>
          {k.urunAd && <span className="text-muted"> ({k.urunAd})</span>}
          <span className="text-muted"> · {k.renk} · {k.cuval} çuval · {k.seri} seri</span>
        </li>
      ))}
    </ul>
  );
}

// Fasoncu: tek depodan birden fazla kalemli alım ya da teslim bildirimi ve kendi bildirimlerinin durumu
export function FasonHareketPaneli() {
  const [depolar, setDepolar] = useState([]);
  const [form, setForm] = useState(BOS);
  const [liste, setListe] = useState([]);
  const [bildirim, setBildirim] = useState({ tur: '', yazi: '' });

  const yukle = () => get('/api/fasoncu/islemler').then(setListe).catch(() => {});

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

  const kalemGuncelle = (i, alan, deger) =>
    setForm((f) => ({ ...f, kalemler: f.kalemler.map((k, j) => (j === i ? { ...k, [alan]: deger } : k)) }));

  const kalemEkle = () => setForm((f) => ({ ...f, kalemler: [...f.kalemler, { ...BOS_KALEM }] }));

  const kalemSil = (i) => setForm((f) => (
    f.kalemler.length > 1 ? { ...f, kalemler: f.kalemler.filter((_, j) => j !== i) } : f
  ));

  const toplamSeri = form.kalemler.reduce((s, k) => s + (+k.seri || 0), 0);
  const hazir = form.depoId && form.kalemler.every(kalemGecerli);

  const gonder = async () => {
    setBildirim({ tur: '', yazi: '' });
    try {
      await post('/api/fasoncu/islemler', {
        tip: form.tip,
        depoId: Number(form.depoId),
        not: form.not,
        kalemler: form.kalemler.map((k) => ({
          kod: k.kod.trim(), renk: k.renk.trim(), cuval: +k.cuval, seri: +k.seri,
        })),
      });
      setBildirim({ tur: 'ok', yazi: `${TIP[form.tip]} olarak bildirildi. Depo sorumlusu onaylayınca stok güncellenecek.` });
      setForm((f) => ({ ...BOS, tip: f.tip, depoId: f.depoId }));
      yukle();
    } catch (e) {
      setBildirim({ tur: 'hata', yazi: e.message });
    }
  };

  return (
    <section className="card p-4">
      <h2 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Depo hareketi bildir</h2>
      <p className="mb-3 text-xs text-muted">
        Tek depodan birden fazla model ve renk girebilirsiniz. Depo sorumlusu onaylayınca stok güncellenir.
      </p>

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

      <select className="inp mb-3" value={form.depoId} onChange={(e) => alanGuncelle('depoId', e.target.value)}>
        {depolar.map((d) => <option key={d.id} value={String(d.id)}>{d.ad}</option>)}
      </select>

      <div className="space-y-2.5">
        {form.kalemler.map((k, i) => (
          <div key={i} className="rounded-xl border border-line p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Kalem {i + 1}</span>
              {form.kalemler.length > 1 && (
                <button className="btn-ghost btn-sm" onClick={() => kalemSil(i)}>Kaldır</button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="inp" placeholder="Ürün kodu (ör. 2606)" value={k.kod}
                onChange={(e) => kalemGuncelle(i, 'kod', e.target.value)} />
              <input className="inp" placeholder="Renk (ör. Vanilya)" value={k.renk}
                onChange={(e) => kalemGuncelle(i, 'renk', e.target.value)} />
              <input className="inp" type="number" min="1" placeholder="Çuval sayısı" value={k.cuval}
                onChange={(e) => kalemGuncelle(i, 'cuval', e.target.value)} />
              <input className="inp" type="number" min="1" placeholder="Toplam seri" value={k.seri}
                onChange={(e) => kalemGuncelle(i, 'seri', e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button className="btn-ghost btn-sm" onClick={kalemEkle}>+ Kalem ekle</button>
        <span className="text-sm text-muted">Toplam: <b className="tabular-nums text-ink">{toplamSeri}</b> seri</span>
      </div>

      <input className="inp mt-3" placeholder="Not (isteğe bağlı)" value={form.not}
        onChange={(e) => alanGuncelle('not', e.target.value)} />

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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{TIP[h.tip]} · {h.depo}</span>
                  <Rozet durum={h.durum} />
                </div>
                <KalemListesi kalemler={h.kalemler} />
                <div className="mt-1 text-xs text-muted">{saatYazi(h.tarih)}</div>
                {h.durum === 'reddedildi' && h.not && <p className="mt-1 text-sm text-danger">Neden: {h.not}</p>}
                {h.durum === 'bekliyor' && (
                  <div className="mt-2">
                    <ConfirmButton
                      question="Bildirim silinsin mi?"
                      onConfirm={() => del(`/api/fasoncu/islemler/${h.id}`).then(yukle)}
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

// Depo sorumlusu: gelen fason hareketleri (kalemleriyle), onay ya da red
export function FasonHareketleriYonetici() {
  const [liste, setListe] = useState([]);
  const [hata, setHata] = useState('');

  const yukle = () => get('/api/fason-islemler').then(setListe).catch((e) => setHata(e.message));

  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onayla = (id) => {
    setHata('');
    post(`/api/fason-islemler/${id}/onay`).then(yukle).catch((e) => setHata(e.message));
  };

  const reddet = (id) => {
    const not = window.prompt('Red sebebi (isteğe bağlı)', '');
    if (not === null) return;
    setHata('');
    post(`/api/fason-islemler/${id}/reddet`, { not }).then(yukle).catch((e) => setHata(e.message));
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
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">
              {h.fasoncuAd || 'Fasoncu'} · {TIP[h.tip]} · {h.depo}
            </span>
            <Rozet durum={h.durum} />
          </div>
          <KalemListesi kalemler={h.kalemler} />
          <div className="mt-1 text-xs text-muted">{saatYazi(h.tarih)}</div>
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