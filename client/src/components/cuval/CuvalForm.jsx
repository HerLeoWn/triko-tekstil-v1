import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { sonKaydet, sonOku } from '../../lib/son.js';
import { Modal } from '../ui/Modal.jsx';
import { Field } from '../ui/Field.jsx';
import { UrunArama } from '../ui/UrunArama.jsx';
import { ExtraPanel } from './ExtraPanel.jsx';
import { ParcaEditor } from './ParcaEditor.jsx';

const eksikText = (item) =>
  item.seriler
    .filter((s) => s.length < 4)
    .map((s) => s.join(' '))
    .join('; ');

// Yeni çuval(lar) ve çuval düzenleme formu
export function CuvalForm({ item, onSave, onClose }) {
  const blank = {
    kod: '', ad: '', depoId: '', cuvalIci: 9, cuvalAdet: '',
    parcalar: [{ renk: '', seri: '' }], asortidisi: false, extras: [], eksik: '',
  };
  const start = item
    ? [{
        kod: item.kod,
        ad: item.ad ?? '',
        depoId: item.depoId,
        cuvalIci: item.cuvalIci,
        cuvalAdet: 1,
        parcalar: (item.parcalar || [{ renk: item.renk, seri: item.seri }])
          .map((p) => ({ renk: p.renk, seri: String(p.seri) })),
        asortidisi: false,
        extras: [],
        eksik: eksikText(item),
      }]
    : [blank];

  const [rows, setRows] = useState(start);
  const [depolar, setDepolar] = useState([]);
  const [urunler, setUrunler] = useState([]);
  const [gruplar, setGruplar] = useState([]);
  const [renkler, setRenkler] = useState([]);
  const son = item ? null : sonOku();

  const depoHatasi = depolar.length === 0
    ? 'Depolar yüklenemedi ya da henüz gelmedi. Sayfayı yenileyin.'
    : rows.some((r) => !(+r.depoId > 0))
      ? 'Her satır için bir depo seçin.'
      : '';

  useEffect(() => {
    api.get('/api/depolar').then((d) => {
      const sirali = [...d].sort((a, b) => a.sira - b.sira);
      setDepolar(sirali);
      setRows((rs) => rs.map((r) => (r.depoId === '' ? { ...r, depoId: sirali[0]?.id ?? '' } : r)));
    }).catch(() => {});
    api.get('/api/urunler').then(setUrunler).catch(() => {});
    api.get('/api/stok').then((s) => {
      setGruplar(s.groups);
      setRenkler([...new Set(s.groups.flatMap((g) => g.renks.map((r) => r.renk)))]);
    }).catch(() => {});
  }, []);

  const depoAd = (id) => depolar.find((d) => d.id === +id)?.ad ?? '-';

  const mevcutSatir = (kod) => {
    const g = gruplar.find((x) => x.kod.toLowerCase() === kod.trim().toLowerCase());
    if (!g) return null;
    return Object.entries(g.depoSeri || {})
      .filter(([, v]) => v > 0)
      .map(([id, v]) => `${depoAd(id)} ${v}`)
      .join(' · ');
  };

  const bilgi = (r) => {
    const kod = r.kod.trim();
    if (!kod) return null;
    const m = mevcutSatir(kod);
    return m
      ? <div className="mt-2 text-xs text-muted">Bu ürün şu an: <span className="text-ink">{m}</span></div>
      : <div className="mt-2 text-xs text-muted">Bu kodda stok yok, yeni ürün olarak eklenecek.</div>;
  };

  const set = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setParca = (i, k, patch) => setRows((rs) => rs.map((r, j) => (j === i
    ? { ...r, parcalar: r.parcalar.map((p, m) => (m === k ? { ...p, ...patch } : p)) }
    : r)));
  const addParca = (i) => setRows((rs) => rs.map((r, j) => (j === i
    ? { ...r, parcalar: [...r.parcalar, { renk: '', seri: '' }] }
    : r)));
  const delParca = (i, k) => setRows((rs) => rs.map((r, j) => (j === i && r.parcalar.length > 1
    ? { ...r, parcalar: r.parcalar.filter((_, m) => m !== k) }
    : r)));
  const removeRow = (i) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));
  const urunSec = (i, u) => set(i, { kod: u.kod, ad: u.ad || '' });

  // Yeni satır, bir önceki satırın deposunu alır (boş kalırsa uyarı çıkar)
  const satirEkle = () => setRows((rs) => [
    ...rs,
    {
      ...blank,
      depoId: rs[rs.length - 1]?.depoId ?? depolar[0]?.id ?? '',
      parcalar: [{ renk: '', seri: '' }],
    },
  ]);

  const sonuKullan = () => {
    if (!son) return;
    setRows((rs) => rs.map((r, j) => (j === 0
      ? {
          ...r,
          cuvalIci: son.cuvalIci,
          parcalar: son.parcalar.map((p) => ({ renk: p.renk, seri: String(p.seri) })),
        }
      : r)));
  };

  const dolu = (r) => r.parcalar.reduce((s, p) => s + (+p.seri || 0), 0);
  const icerik = (r) => r.parcalar
    .filter((p) => p.renk.trim() && +p.seri > 0)
    .map((p) => `${p.renk.trim()} ${+p.seri}`)
    .join(' + ');

  const preview = (r) => {
    const per = +r.cuvalIci;
    const n = +r.cuvalAdet || 0;
    const d = dolu(r);
    if (!(per > 0) || (!n && !r.extras.length)) return { text: '', warn: false };
    if (d > per) return { text: `⚠ Bir çuvalda en fazla ${per} seri olabilir, ${d} girdiniz`, warn: true };
    const parts = [];
    if (n) parts.push(`${n} çuval × (${icerik(r) || 'renk ve seri girin'}) = ${n * d} seri`);
    if (r.asortidisi && r.extras.length) parts.push(`+ asortiye girmeyen ${r.extras.length} seri`);
    return { text: `→ ${parts.join(' ')}`, warn: false };
  };

  const temizParcalar = (parcalar) => parcalar
    .map((p) => ({ renk: p.renk.trim(), seri: +p.seri || 0 }))
    .filter((p) => p.renk && p.seri > 0);

  const save = () => {
    if (depoHatasi) return;
    if (item) {
      const r = rows[0];
      return onSave([{
        kod: r.kod.trim(),
        ad: r.ad.trim(),
        depoId: +r.depoId,
        cuvalIci: +r.cuvalIci,
        parcalar: temizParcalar(r.parcalar),
        eksik: r.eksik,
      }], item.id);
    }
    const ilk = rows[0];
    sonKaydet({
      kod: ilk.kod.trim(),
      cuvalIci: +ilk.cuvalIci,
      parcalar: temizParcalar(ilk.parcalar),
    });
    onSave(rows.map((r) => ({
      kod: r.kod.trim(),
      ad: r.ad.trim(),
      depoId: +r.depoId,
      cuvalIci: +r.cuvalIci,
      cuvalAdet: +r.cuvalAdet || 0,
      parcalar: temizParcalar(r.parcalar),
      extra: r.asortidisi ? r.extras : [],
    })));
  };

  const ustAlan = (r, i, duzenle) => (
    <div className={`grid grid-cols-2 items-start gap-2.5 ${duzenle
      ? 'md:grid-cols-[1fr_1.3fr_150px_110px]'
      : 'md:grid-cols-[1fr_1.3fr_150px_110px_110px_36px]'}`}>
      <UrunArama
        label="Kod" placeholder="2606" value={r.kod} urunler={urunler}
        onChange={(v) => set(i, { kod: v })} onPick={(u) => urunSec(i, u)}
      />
      <UrunArama
        label="Ürün adı" placeholder="Hırka, açık yaka..." value={r.ad} urunler={urunler}
        onChange={(v) => set(i, { ad: v })} onPick={(u) => urunSec(i, u)}
      />
      <Field label="Depo">
        <select className="inp" value={r.depoId} onChange={(e) => set(i, { depoId: e.target.value })}>
          {depolar.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
        </select>
      </Field>
      <Field label="Çuval içi seri">
        <input className="inp" type="number" min="1" value={r.cuvalIci}
          onChange={(e) => set(i, { cuvalIci: e.target.value })} />
      </Field>
      {!duzenle && (
        <Field label="Çuval adedi">
          <input className="inp" type="number" min="0" value={r.cuvalAdet}
            onChange={(e) => set(i, { cuvalAdet: e.target.value })} />
        </Field>
      )}
      {!duzenle && (
        <button className="btn-ghost btn-sm h-9" onClick={() => removeRow(i)} title="Satırı kaldır">✕</button>
      )}
    </div>
  );

  return (
    <Modal title={item ? 'Çuvalı düzenle' : 'Yeni çuval(lar)'} onClose={onClose} onSave={save}>
      <datalist id="renk-liste">
        {renkler.map((k) => <option key={k} value={k} />)}
      </datalist>

      {!item && son && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-accent-soft px-3 py-2 text-sm">
          <span className="text-accent">
            Son giriş: {son.parcalar.map((p) => `${p.renk} ${p.seri}`).join(' + ')} ({son.cuvalIci}'li)
          </span>
          <button className="btn-ghost btn-sm" onClick={sonuKullan}>Bunu kullan</button>
        </div>
      )}

      {item ? (
        <div className="rounded-xl border border-line p-3">
          {ustAlan(rows[0], 0, true)}
          {bilgi(rows[0])}

          <ParcaEditor r={rows[0]} i={0} setParca={setParca} addParca={addParca} delParca={delParca} />

          <div className="mt-3">
            <Field label="Eksik seriler">
              <input className="inp" placeholder="örn: S M L; XL" value={rows[0].eksik}
                onChange={(e) => set(0, { eksik: e.target.value })} />
            </Field>
          </div>

          <div className={`mt-2 text-sm ${dolu(rows[0]) > +rows[0].cuvalIci ? 'text-warn' : 'text-accent'}`}>
            {dolu(rows[0]) > +rows[0].cuvalIci
              ? `⚠ Bir çuvalda en fazla ${rows[0].cuvalIci} seri olabilir, ${dolu(rows[0])} girdiniz`
              : `Toplam ${dolu(rows[0])} seri${icerik(rows[0]) ? ` (${icerik(rows[0])})` : ''}`}
          </div>
        </div>
      ) : (
        rows.map((r, i) => {
          const pv = preview(r);
          return (
            <div key={i} className="mb-4 rounded-xl border border-line p-3">
              {ustAlan(r, i, false)}
              {bilgi(r)}

              <ParcaEditor r={r} i={i} setParca={setParca} addParca={addParca} delParca={delParca} />

              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span>Asortiye girmeyen mal var mı?</span>
                <button type="button" className={r.asortidisi ? 'pill-on' : 'pill-off'}
                  onClick={() => set(i, { asortidisi: true })}>Evet</button>
                <button type="button" className={!r.asortidisi ? 'pill-on' : 'pill-off'}
                  onClick={() => set(i, { asortidisi: false, extras: [] })}>Hayır</button>
              </div>

              {r.asortidisi && (
                <ExtraPanel extras={r.extras} onChange={(extras) => set(i, { extras })} />
              )}

              {pv.text && (
                <div className={`mt-2 text-sm ${pv.warn ? 'text-warn' : 'text-accent'}`}>{pv.text}</div>
              )}
            </div>
          );
        })
      )}

      {!item && (
        <button className="btn-ghost btn-sm" onClick={satirEkle}>
          + Satır ekle
        </button>
      )}

      {depoHatasi && (
        <p className="mt-3 rounded-lg bg-warn-soft p-2.5 text-sm text-warn">⚠ {depoHatasi}</p>
      )}

      <p className="mt-3 text-xs text-muted">
        Ürün adını ya da kodu yazın, önerilerden seçin. Depo seçimi çuvalın hangi depoda duracağını belirler.
        Düzenlemede depoyu değiştirmek, çuvalı başka depoya taşımak anlamına gelir.
      </p>
    </Modal>
  );
}