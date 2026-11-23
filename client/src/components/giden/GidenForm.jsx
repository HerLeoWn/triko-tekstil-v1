import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Modal } from '../ui/Modal.jsx';
import { Field } from '../ui/Field.jsx';
import { StoktakiUrunler } from './StoktakiUrunler.jsx';

// Giden mal ekleme: kod (stoktaki ürünlerden seçilir), çıkış deposu ve renk/seri satırları
export function GidenForm({ onSave, onClose }) {
  const [kod, setKod] = useState('');
  const [rows, setRows] = useState([{ renk: '', seri: '', stok: true }]);
  const [stok, setStok] = useState(null);
  const [depoSecim, setDepoSecim] = useState('');
  const [listeAcik, setListeAcik] = useState(false);

  useEffect(() => {
    api.get('/api/stok').then(setStok).catch(() => setStok({ groups: [], depolar: [] }));
  }, []);

  // Çıkış deposu: seçilmediyse listedeki ilk depo
  const depoListe = [...(stok?.depolar ?? [])].sort((a, b) => a.sira - b.sira);
  const depoId = depoSecim || String(depoListe[0]?.id ?? '');
  const depoAdi = depoListe.find((d) => String(d.id) === depoId)?.ad ?? '';

  // Yalnızca stokta bir miktar olan ürünler
  const stokluGruplar = (stok?.groups ?? [])
    .filter((g) => Object.values(g.depoSeri || {}).some((v) => v > 0));

  const grup = stok?.groups.find((g) => g.kod.toLowerCase() === kod.trim().toLowerCase());
  const renkler = grup?.renks ?? [];
  // Seçili depodaki seri: renk.depoSeri = { depoId: seri }
  const depoSeriOf = (r) => r.depoSeri?.[depoId] ?? 0;
  const mevcutK = (k) => {
    const r = renkler.find((x) => x.renk.toLowerCase() === k);
    return r ? depoSeriOf(r) : 0;
  };
  const renkAdi = (k) => renkler.find((r) => r.renk.toLowerCase() === k)?.renk ?? k;
  const mevcut = (renk) => mevcutK(renk.trim().toLowerCase());

  // Ürün seçilince: mevcut depoda stok varsa onu bırak, yoksa stokta olan ilk depoyu seç
  const urunSec = (g) => {
    setKod(g.kod);
    setListeAcik(false);
    const stoklu = depoListe.filter((d) => (g.depoSeri?.[d.id] ?? 0) > 0);
    if (stoklu.length && !stoklu.some((d) => String(d.id) === depoId)) {
      setDepoSecim(String(stoklu[0].id));
    }
  };

  const set = (i, patch) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const remove = (i) =>
    setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs));

  const addRenk = (renk) => setRows((rs) => {
    const son = rs[rs.length - 1];
    if (!son.renk.trim()) return rs.map((r, j) => (j === rs.length - 1 ? { ...r, renk } : r));
    return [...rs, { renk, seri: '', stok: true }];
  });

  const istek = {};
  rows.filter((r) => r.stok && r.renk.trim() && +r.seri > 0).forEach((r) => {
    const k = r.renk.trim().toLowerCase();
    istek[k] = (istek[k] || 0) + +r.seri;
  });

  const toplam = rows
    .filter((r) => r.renk.trim() && +r.seri > 0)
    .reduce((s, r) => s + +r.seri, 0);

  const hatalar = [];
  if (!kod.trim()) hatalar.push('Kod girin.');
  if (!stok) hatalar.push('Stok bilgisi yükleniyor…');
  if (!depoId) hatalar.push('Çıkış deposu seçin.');
  Object.entries(istek).forEach(([k, v]) => {
    const m = mevcutK(k);
    if (v > m) hatalar.push(`${renkAdi(k)} renginde ${depoAdi} deposunda yalnızca ${m} seri var, ${v} girdiniz.`);
  });
  if (rows.length > 1 && rows.some((r) => !r.renk.trim() || !(+r.seri > 0))) {
    hatalar.push('Boş satırları ✕ ile kaldırın ya da renk ve seri girin.');
  }

  const save = () => {
    if (hatalar.length) return;
    onSave({
      kod: kod.trim(),
      depoId: +depoId,
      satirlar: rows.map((r) => ({ renk: r.renk.trim(), seri: +r.seri, stok: r.stok })),
    });
  };

  return (
    <Modal title="Giden mal" onClose={onClose} onSave={save}>
      <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Field label="Kod">
            <input
              className="inp"
              placeholder="Kodu yazın ya da listeden seçin"
              value={kod}
              onChange={(e) => { setKod(e.target.value); setListeAcik(true); }}
              onFocus={() => setListeAcik(true)}
              onBlur={() => setTimeout(() => setListeAcik(false), 150)}
            />
          </Field>
          {listeAcik && (
            <StoktakiUrunler groups={stokluGruplar} depolar={depoListe} arama={kod} onPick={urunSec} />
          )}
        </div>
        <Field label="Çıkış deposu">
          <select className="inp" value={depoId} onChange={(e) => setDepoSecim(e.target.value)}>
            {depoListe.map((d) => <option key={d.id} value={String(d.id)}>{d.ad}</option>)}
          </select>
        </Field>
        <Field label="Toplam seri (otomatik)">
          <input className="inp bg-track" readOnly value={toplam || ''} />
        </Field>
      </div>

      <div className="mb-4 rounded-xl border border-line bg-bg p-3">
        {grup && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {depoListe
              .filter((d) => (grup.depoSeri?.[d.id] ?? 0) > 0)
              .map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDepoSecim(String(d.id))}
                  className={`rounded-full px-2.5 py-1 text-xs transition ${
                    String(d.id) === depoId
                      ? 'bg-accent text-white'
                      : 'border border-line bg-white hover:border-accent'
                  }`}
                >
                  {d.ad} <b className="tabular-nums">{grup.depoSeri[d.id]}</b>
                </button>
              ))}
          </div>
        )}
        <div className="mb-2 text-xs font-medium text-muted">
          {!kod.trim()
            ? 'Kod seçin, stoktaki renkler burada görünür.'
            : grup
              ? `${grup.kod} · ${depoAdi} deposunda: ${renkler.reduce((s, r) => s + depoSeriOf(r), 0)} seri. Renge tıklayarak satıra ekleyebilirsiniz.`
              : 'Bu kodda stok yok.'}
        </div>
        {renkler.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {renkler.map((r) => (
              <button
                key={r.renk}
                type="button"
                onClick={() => addRenk(r.renk)}
                className="rounded-full border border-line bg-white px-2.5 py-1 text-xs transition hover:border-accent"
              >
                {r.renk} <b className="tabular-nums">{depoSeriOf(r)}</b>
              </button>
            ))}
          </div>
        )}
      </div>

      <datalist id="giden-renkler">
        {renkler.map((r) => <option key={r.renk} value={r.renk} />)}
      </datalist>

      {rows.map((r, i) => {
        const m = r.renk.trim() ? mevcut(r.renk) : null;
        const asildi = m !== null && r.stok && istek[r.renk.trim().toLowerCase()] > m;
        return (
          <div key={i} className="mb-2.5 grid grid-cols-[1fr_110px_auto_36px] items-start gap-2.5">
            <Field label="Renk">
              <input
                className="inp"
                list="giden-renkler"
                placeholder="Vanilya"
                value={r.renk}
                onChange={(e) => set(i, { renk: e.target.value })}
              />
              {m !== null && (
                <div className={`mt-1 text-xs ${asildi ? 'font-semibold text-warn' : 'text-muted'}`}>
                  {depoAdi}: {m} seri
                </div>
              )}
            </Field>

            <Field label="Seri">
              <input
                className={`inp ${asildi ? 'border-warn' : ''}`}
                type="number"
                min="1"
                max={m ?? undefined}
                placeholder="6"
                value={r.seri}
                onChange={(e) => set(i, { seri: e.target.value })}
              />
            </Field>

            <label className="mt-[22px] flex items-center gap-1.5 whitespace-nowrap text-[13px]">
              <input type="checkbox" checked={r.stok} onChange={(e) => set(i, { stok: e.target.checked })} />
              Stoktan düş
            </label>

            <button className="btn-ghost btn-sm mt-[22px] h-9" onClick={() => remove(i)} title="Satırı kaldır">
              ✕
            </button>
          </div>
        );
      })}

      <button
        className="btn-ghost btn-sm"
        onClick={() => setRows((rs) => [...rs, { renk: '', seri: '', stok: true }])}
      >
        + Renk ekle
      </button>

      {hatalar.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-warn-soft p-2.5 text-sm text-warn">
          {hatalar.map((h, i) => <li key={i}>⚠ {h}</li>)}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted">
        Her satıra rengi ve seri sayısını yazın. Stokta olmayan ya da yetmeyen seri girilemez. "Stoktan düş"
        işaretsizse kayıt yalnızca giden listesine yazılır ve stok değişmez.
      </p>
    </Modal>
  );
}