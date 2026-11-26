import { useEffect, useState } from 'react';
import { get, post, del } from '../../lib/istek.js';

const bosGrup = () => ({ kod: '', cuval: '', cuvalIci: '', parcalar: [{ renk: '', seri: '' }] });

const tipAd = (t) => (t === 'alim' ? 'Depodan mal aldı' : 'Depoya mal bıraktı');
const durumAd = { bekliyor: 'Onay bekliyor', onaylandi: 'Onaylandı', reddedildi: 'Reddedildi' };
const durumRenk = {
  bekliyor: 'bg-warn-soft text-warn',
  onaylandi: 'bg-accent-soft text-accent',
  reddedildi: 'bg-track text-muted',
};

const tarihYazi = (t) => {
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
};

const grupYazi = (g) =>
  `${g.kod}${g.urunAd ? ` ${g.urunAd}` : ''} · ${g.cuval} çuval × (${g.parcalar.map((p) => `${p.renk} ${p.seri}`).join(', ')}) = ${g.toplamSeri} seri`;

const toplamSeriHesapla = (g) =>
  (Number(g.cuval) || 0) * g.parcalar.reduce((s, p) => s + (Number(p.seri) || 0), 0);

/* ---------- Fasoncu: depo hareketi bildirim formu ---------- */

export function FasonHareketPaneli() {
  const [depolar, setDepolar] = useState([]);
  const [depoId, setDepoId] = useState('');
  const [kodlar, setKodlar] = useState([]);
  const [tip, setTip] = useState('alim');
  const [not, setNot] = useState('');
  const [gruplar, setGruplar] = useState([bosGrup()]);
  const [islemler, setIslemler] = useState([]);
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [gonderiyor, setGonderiyor] = useState(false);

  const yukleIslemler = () => get('/api/fasoncu/islemler').then(setIslemler).catch(() => {});

  useEffect(() => {
    get('/api/fasoncu/depolar')
      .then((d) => {
        setDepolar(d);
        if (d.length) setDepoId(String(d[0].id));
      })
      .catch((e) => setHata(e.message));
    yukleIslemler();
  }, []);

  useEffect(() => {
    if (!depoId) return;
    setGruplar([bosGrup()]);
    get(`/api/fasoncu/depo-stok?depoId=${depoId}`)
      .then((s) => setKodlar(s.kodlar))
      .catch((e) => setHata(e.message));
  }, [depoId]);

  const secilenKod = (kod) => kodlar.find((k) => k.kod === kod);

  // Alımda yalnızca o depoda stoğu olan kodlar listelenir
  const kodSecenek = tip === 'alim' ? kodlar.filter((k) => k.renkler.length > 0) : kodlar;

  const mevcutSeri = (kod, renk) =>
    secilenKod(kod)?.renkler.find((r) => r.renk.toLowerCase() === renk.trim().toLowerCase())?.seri ?? 0;

  const grupGuncelle = (i, patch) =>
    setGruplar((eski) => eski.map((g, j) => (j === i ? { ...g, ...(typeof patch === 'function' ? patch(g) : patch) } : g)));

  const parcaGuncelle = (i, j, patch) =>
    setGruplar((eski) => eski.map((g, gi) => (gi !== i ? g : {
      ...g,
      parcalar: g.parcalar.map((p, pi) => (pi === j ? { ...p, ...patch } : p)),
    })));

  const kodSec = (i, kod) => {
    const k = secilenKod(kod);
    const ci = k?.cuvalIci ? String(k.cuvalIci) : '';
    grupGuncelle(i, { kod, cuvalIci: ci, parcalar: [{ renk: '', seri: ci }] });
  };

  const gonder = async () => {
    setHata('');
    setMesaj('');
    if (!depoId) {
      setHata('Depo seçin.');
      return;
    }
    setGonderiyor(true);
    try {
      await post('/api/fasoncu/islemler', {
        tip,
        depoId: Number(depoId),
        not,
        gruplar: gruplar.map((g) => ({
          kod: g.kod,
          cuval: Number(g.cuval),
          parcalar: g.parcalar.map((p) => ({ renk: p.renk, seri: Number(p.seri) })),
        })),
      });
      setMesaj('Bildirim depo sorumlusuna gönderildi. Onaylanınca stok güncellenecek.');
      setGruplar([bosGrup()]);
      setNot('');
      yukleIslemler();
    } catch (e) {
      setHata(e.message);
    } finally {
      setGonderiyor(false);
    }
  };

  const sil = async (id) => {
    if (!window.confirm('Bu bildirim silinsin mi?')) return;
    try {
      await del(`/api/fasoncu/islemler/${id}`);
      yukleIslemler();
    } catch (e) {
      setHata(e.message);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-5">
      <div className="space-y-4">
        <h3 className="font-semibold">Depo hareketi bildir</h3>

        {hata && <div className="rounded-lg bg-warn-soft p-3 text-sm text-warn">{hata}</div>}
        {mesaj && <div className="rounded-lg bg-accent-soft p-3 text-sm">{mesaj}</div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted">Depo</label>
            <select className="inp w-full" value={depoId} onChange={(e) => setDepoId(e.target.value)}>
              {depolar.map((d) => (
                <option key={d.id} value={d.id}>{d.ad}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted">İşlem</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={tip === 'alim' ? 'btn flex-1' : 'btn-ghost flex-1'}
                onClick={() => { setTip('alim'); setGruplar([bosGrup()]); }}
              >
                Depodan mal aldım
              </button>
              <button
                type="button"
                className={tip === 'teslim' ? 'btn flex-1' : 'btn-ghost flex-1'}
                onClick={() => { setTip('teslim'); setGruplar([bosGrup()]); }}
              >
                Depoya mal bıraktım
              </button>
            </div>
          </div>
        </div>

        {gruplar.map((g, i) => {
          const toplam = toplamSeriHesapla(g);
          return (
            <div key={i} className="space-y-3 rounded-xl border border-line p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Çuval grubu {i + 1}</span>
                {gruplar.length > 1 && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setGruplar((eski) => eski.filter((_, j) => j !== i))}
                  >
                    Kaldır
                  </button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="text-xs text-muted">Ürün kodu</label>
                  <select className="inp w-full" value={g.kod} onChange={(e) => kodSec(i, e.target.value)}>
                    <option value="">Kod seçin</option>
                    {kodSecenek.map((k) => (
                      <option key={k.kod} value={k.kod}>{k.kod} · {k.ad}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted">Çuval sayısı</label>
                  <input
                    type="number"
                    min="1"
                    className="inp w-full"
                    value={g.cuval}
                    onChange={(e) => grupGuncelle(i, { cuval: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted">Çuval içi seri</label>
                  <input
                    type="number"
                    min="1"
                    className="inp w-full"
                    value={g.cuvalIci}
                    placeholder="Elle girin"
                    onChange={(e) => grupGuncelle(i, { cuvalIci: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-muted">Çuvalın içindeki renkler (karma çuval için birden fazla satır)</span>
                {g.parcalar.map((p, j) => {
                  const ihtiyac = (Number(g.cuval) || 0) * (Number(p.seri) || 0);
                  const mevcut = p.renk ? mevcutSeri(g.kod, p.renk) : 0;
                  const yetersiz = tip === 'alim' && p.renk && ihtiyac > mevcut;
                  const listeId = `renkler-${i}-${j}`;
                  return (
                    <div key={j} className="flex flex-wrap items-center gap-2">
                      {tip === 'alim' ? (
                        <select
                          className="inp min-w-0 flex-1"
                          value={p.renk}
                          onChange={(e) => parcaGuncelle(i, j, { renk: e.target.value, seri: p.seri || g.cuvalIci })}
                        >
                          <option value="">Renk seçin</option>
                          {secilenKod(g.kod)?.renkler.map((r) => (
                            <option key={r.renk} value={r.renk}>{r.renk} · {r.seri} seri</option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <input
                            className="inp min-w-0 flex-1"
                            list={listeId}
                            value={p.renk}
                            placeholder="Renk yazın ya da seçin"
                            onChange={(e) => parcaGuncelle(i, j, { renk: e.target.value, seri: p.seri || g.cuvalIci })}
                          />
                          <datalist id={listeId}>
                            {secilenKod(g.kod)?.renkler.map((r) => (
                              <option key={r.renk} value={r.renk} />
                            ))}
                          </datalist>
                        </>
                      )}
                      <input
                        type="number"
                        min="1"
                        className="inp w-24"
                        value={p.seri}
                        placeholder="Seri"
                        onChange={(e) => parcaGuncelle(i, j, { seri: e.target.value })}
                      />
                      {g.parcalar.length > 1 && (
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => grupGuncelle(i, (eski) => ({
                            parcalar: eski.parcalar.filter((_, pj) => pj !== j),
                          }))}
                        >
                          ✕
                        </button>
                      )}
                      {yetersiz && (
                        <span className="w-full text-xs text-warn">
                          Stokta {mevcut} seri var, bu satır {ihtiyac} seri.
                        </span>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => grupGuncelle(i, (eski) => ({
                    parcalar: [...eski.parcalar, { renk: '', seri: eski.cuvalIci }],
                  }))}
                >
                  + Renk ekle (karma çuval)
                </button>
              </div>

              <p className="text-sm">
                Toplam: <b>{toplam}</b> seri
                {g.cuval && g.parcalar.some((p) => p.seri) ? ` (${g.cuval} çuval)` : ''}
              </p>
            </div>
          );
        })}

        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => setGruplar((eski) => [...eski, bosGrup()])}
        >
          + Çuval grubu ekle
        </button>

        <div>
          <label className="text-xs text-muted">Not (isteğe bağlı)</label>
          <input className="inp w-full" value={not} onChange={(e) => setNot(e.target.value)} maxLength={200} />
        </div>

        <button type="button" className="btn w-full" disabled={gonderiyor} onClick={gonder}>
          {gonderiyor ? 'Gönderiliyor…' : 'Bildir'}
        </button>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium">Gönderdiklerim</h4>
        {islemler.length === 0 && <p className="text-sm text-muted">Henüz bildirim yok.</p>}
        {islemler.map((h) => (
          <div key={h.id} className="space-y-2 rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{tipAd(h.tip)} · {h.depo}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${durumRenk[h.durum] ?? ''}`}>
                {durumAd[h.durum] ?? h.durum}
              </span>
            </div>
            <p className="text-xs text-muted">{tarihYazi(h.tarih)}</p>
            <ul className="space-y-1 text-sm">
              {h.kalemler.map((g) => (
                <li key={g.id}>{grupYazi(g)}</li>
              ))}
            </ul>
            {h.not && <p className="text-xs text-muted">Not: {h.not}</p>}
            {h.durum === 'bekliyor' && (
              <button type="button" className="btn-ghost btn-sm" onClick={() => sil(h.id)}>
                Bildirimi sil
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Depo sorumlusu: fasoncu hareketlerini onaylar ---------- */

export function FasonHareketleriYonetici() {
  const [liste, setListe] = useState([]);
  const [hata, setHata] = useState('');

  const yukle = () => get('/api/fason-islemler').then(setListe).catch((e) => setHata(e.message));

  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 10000);
    return () => clearInterval(t);
  }, []);

  const onay = async (id) => {
    try {
      await post(`/api/fason-islemler/${id}/onay`, {});
      setHata('');
      yukle();
    } catch (e) {
      setHata(e.message);
    }
  };

  const reddet = async (id) => {
    const not = window.prompt('Red nedeni (isteğe bağlı)');
    if (not === null) return;
    try {
      await post(`/api/fason-islemler/${id}/reddet`, { not });
      setHata('');
      yukle();
    } catch (e) {
      setHata(e.message);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div>
        <h3 className="font-semibold">Fason hareketleri</h3>
        <p className="text-xs text-muted">
          Onaylayınca alım stoktan düşer, teslim stoğa eklenir. Liste 10 saniyede bir yenilenir.
        </p>
      </div>

      {hata && <div className="rounded-lg bg-warn-soft p-3 text-sm text-warn">{hata}</div>}
      {liste.length === 0 && <p className="text-sm text-muted">Hareket yok.</p>}

      {liste.map((h) => (
        <div key={h.id} className="space-y-2 rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium">
              {tipAd(h.tip)} · {h.depo} · {h.fasoncuAd}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs ${durumRenk[h.durum] ?? ''}`}>
              {durumAd[h.durum] ?? h.durum}
            </span>
          </div>
          <p className="text-xs text-muted">{tarihYazi(h.tarih)}</p>
          <ul className="space-y-1 text-sm">
            {h.kalemler.map((g) => (
              <li key={g.id}>{grupYazi(g)}</li>
            ))}
          </ul>
          {h.not && <p className="text-xs text-muted">Not: {h.not}</p>}

          {h.durum === 'bekliyor' && (
            <div className="flex gap-2 pt-1">
              <button type="button" className="btn btn-sm" onClick={() => onay(h.id)}>Onayla</button>
              <button type="button" className="btn-ghost btn-sm" onClick={() => reddet(h.id)}>Reddet</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}