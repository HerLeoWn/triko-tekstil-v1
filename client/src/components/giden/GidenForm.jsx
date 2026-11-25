import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Modal } from '../ui/Modal.jsx';
import { Field } from '../ui/Field.jsx';
import { StoktakiUrunler } from './StoktakiUrunler.jsx';

let sayac = 0;
const yeniBlok = () => ({
  id: `b${Date.now()}${sayac++}`,
  kod: '',
  depoSecim: '',
  listeAcik: false,
  rows: [{ renk: '', seri: '', stok: true }],
});
const gecerliSatir = (r) => r.renk.trim() && +r.seri > 0;

// Giden mal: birden fazla model tek seferde girilir, hepsi tek nakliyat (tek fiş) olarak kaydedilir
export function GidenForm({ onSave, onClose }) {
  const [bloklar, setBloklar] = useState([yeniBlok()]);
  const [stok, setStok] = useState(null);

  useEffect(() => {
    api.get('/api/stok').then(setStok).catch(() => setStok({ groups: [], depolar: [] }));
  }, []);

  const depoListe = [...(stok?.depolar ?? [])].sort((a, b) => a.sira - b.sira);
  const stokluGruplar = (stok?.groups ?? []).filter((g) => Object.values(g.depoSeri || {}).some((v) => v > 0));

  const blokGuncelle = (id, patch) =>
    setBloklar((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const satirGuncelle = (id, i, patch) =>
    setBloklar((bs) => bs.map((b) => (b.id === id
      ? { ...b, rows: b.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }
      : b)));

  const satirSil = (id, i) =>
    setBloklar((bs) => bs.map((b) => (b.id === id && b.rows.length > 1
      ? { ...b, rows: b.rows.filter((_, j) => j !== i) }
      : b)));

  // Renge tıklayınca: son satır boşsa oraya yaz, değilse yeni satır aç
  const renkEkle = (id, renk) =>
    setBloklar((bs) => bs.map((b) => {
      if (b.id !== id) return b;
      const son = b.rows[b.rows.length - 1];
      if (!son.renk.trim()) {
        return { ...b, rows: b.rows.map((r, j) => (j === b.rows.length - 1 ? { ...r, renk } : r)) };
      }
      return { ...b, rows: [...b.rows, { renk, seri: '', stok: true }] };
    }));

  // Ürün seçilince: blokta seçili depoda stok yoksa stoklu ilk depoyu seç
  const urunSec = (id, g) => {
    setBloklar((bs) => bs.map((b) => {
      if (b.id !== id) return b;
      const mevcutDepo = b.depoSecim || String(depoListe[0]?.id ?? '');
      const stoklu = depoListe.filter((d) => (g.depoSeri?.[d.id] ?? 0) > 0);
      const depoSecim = stoklu.length && !stoklu.some((d) => String(d.id) === mevcutDepo)
        ? String(stoklu[0].id)
        : b.depoSecim;
      return { ...b, kod: g.kod, listeAcik: false, depoSecim };
    }));
  };

  // Bir modelin depo, stok, istek ve hata bilgisi
  const bilgi = (b) => {
    const depoId = b.depoSecim || String(depoListe[0]?.id ?? '');
    const depoAdi = depoListe.find((d) => String(d.id) === depoId)?.ad ?? '';
    const grup = stok?.groups.find((g) => g.kod.toLowerCase() === b.kod.trim().toLowerCase());
    const renkler = grup?.renks ?? [];
    const depoSeriOf = (r) => r.depoSeri?.[depoId] ?? 0;
    const mevcutK = (k) => {
      const r = renkler.find((x) => x.renk.toLowerCase() === k);
      return r ? depoSeriOf(r) : 0;
    };
    const renkAdi = (k) => renkler.find((r) => r.renk.toLowerCase() === k)?.renk ?? k;
    const ad = b.kod.trim() || 'Model';

    const istek = {};
    b.rows.filter((r) => r.stok && gecerliSatir(r)).forEach((r) => {
      const k = r.renk.trim().toLowerCase();
      istek[k] = (istek[k] || 0) + +r.seri;
    });

    const hatalar = [];
    if (!b.kod.trim()) hatalar.push('Bir modelin kodunu girin.');
    if (!depoId) hatalar.push(`${ad}: çıkış deposu seçin.`);
    Object.entries(istek).forEach(([k, v]) => {
      const m = mevcutK(k);
      if (v > m) hatalar.push(`${ad} · ${renkAdi(k)}: ${depoAdi} deposunda yalnızca ${m} seri var, ${v} girdiniz.`);
    });
    if (b.rows.some((r) => (r.renk.trim() || +r.seri > 0) && !gecerliSatir(r))) {
      hatalar.push(`${ad}: eksik satır var. Renk ve seri birlikte girilmeli.`);
    } else if (!b.rows.some(gecerliSatir)) {
      hatalar.push(`${ad}: en az bir renk ve seri girin.`);
    }

    const toplam = b.rows.filter(gecerliSatir).reduce((s, r) => s + +r.seri, 0);
    return { depoId, depoAdi, grup, renkler, depoSeriOf, mevcutK, istek, hatalar, toplam };
  };

  const bilgiler = bloklar.map(bilgi);
  const genelToplam = bilgiler.reduce((s, f) => s + f.toplam, 0);
  const hatalar = [
    ...(!stok ? ['Stok bilgisi yükleniyor…'] : []),
    ...bilgiler.flatMap((f) => f.hatalar),
  ];

  const save = () => {
    if (hatalar.length) return;
    onSave({
      gruplar: bloklar.map((b, i) => ({
        kod: b.kod.trim(),
        depoId: +bilgiler[i].depoId,
        satirlar: b.rows.filter(gecerliSatir).map((r) => ({ renk: r.renk.trim(), seri: +r.seri, stok: r.stok })),
      })),
    });
  };

  return (
    <Modal title="Giden mal" onClose={onClose} onSave={save}>
      {bloklar.map((b, bi) => {
        const f = bilgiler[bi];
        return (
          <div key={b.id} className="mb-4 rounded-2xl border border-line p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Model {bi + 1}</span>
              {bloklar.length > 1 && (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setBloklar((bs) => bs.filter((x) => x.id !== b.id))}
                >
                  Modeli kaldır
                </button>
              )}
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_180px]">
              <div className="relative">
                <Field label="Kod">
                  <input
                    className="inp"
                    placeholder="Kodu yazın ya da listeden seçin"
                    value={b.kod}
                    onChange={(e) => blokGuncelle(b.id, { kod: e.target.value, listeAcik: true })}
                    onFocus={() => blokGuncelle(b.id, { listeAcik: true })}
                    onBlur={() => setTimeout(() => blokGuncelle(b.id, { listeAcik: false }), 150)}
                  />
                </Field>
                {b.listeAcik && (
                  <StoktakiUrunler
                    groups={stokluGruplar}
                    depolar={depoListe}
                    arama={b.kod}
                    onPick={(g) => urunSec(b.id, g)}
                  />
                )}
              </div>
              <Field label="Çıkış deposu">
                <select
                  className="inp"
                  value={f.depoId}
                  onChange={(e) => blokGuncelle(b.id, { depoSecim: e.target.value })}
                >
                  {depoListe.map((d) => <option key={d.id} value={String(d.id)}>{d.ad}</option>)}
                </select>
              </Field>
            </div>

            <div className="mb-3 rounded-xl border border-line bg-bg p-3">
              {f.grup && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {depoListe
                    .filter((d) => (f.grup.depoSeri?.[d.id] ?? 0) > 0)
                    .map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => blokGuncelle(b.id, { depoSecim: String(d.id) })}
                        className={`rounded-full px-2.5 py-1 text-xs transition ${
                          String(d.id) === f.depoId
                            ? 'bg-accent text-white'
                            : 'border border-line bg-white hover:border-accent'
                        }`}
                      >
                        {d.ad} <b className="tabular-nums">{f.grup.depoSeri[d.id]}</b>
                      </button>
                    ))}
                </div>
              )}
              <div className="mb-2 text-xs font-medium text-muted">
                {!b.kod.trim()
                  ? 'Kod seçin, stoktaki renkler burada görünür.'
                  : f.grup
                    ? `${f.grup.kod} · ${f.depoAdi} deposunda: ${f.renkler.reduce((s, r) => s + f.depoSeriOf(r), 0)} seri. Renge tıklayarak satıra ekleyebilirsiniz.`
                    : 'Bu kodda stok yok.'}
              </div>
              {f.renkler.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {f.renkler.map((r) => (
                    <button
                      key={r.renk}
                      type="button"
                      onClick={() => renkEkle(b.id, r.renk)}
                      className="rounded-full border border-line bg-white px-2.5 py-1 text-xs transition hover:border-accent"
                    >
                      {r.renk} <b className="tabular-nums">{f.depoSeriOf(r)}</b>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <datalist id={`giden-renkler-${b.id}`}>
              {f.renkler.map((r) => <option key={r.renk} value={r.renk} />)}
            </datalist>

            {b.rows.map((r, i) => {
              const k = r.renk.trim().toLowerCase();
              const m = r.renk.trim() ? f.mevcutK(k) : null;
              const asildi = m !== null && r.stok && f.istek[k] > m;
              return (
                <div key={i} className="mb-2.5 grid grid-cols-[1fr_110px_auto_36px] items-start gap-2.5">
                  <Field label="Renk">
                    <input
                      className="inp"
                      list={`giden-renkler-${b.id}`}
                      placeholder="Vanilya"
                      value={r.renk}
                      onChange={(e) => satirGuncelle(b.id, i, { renk: e.target.value })}
                    />
                    {m !== null && (
                      <div className={`mt-1 text-xs ${asildi ? 'font-semibold text-warn' : 'text-muted'}`}>
                        {f.depoAdi}: {m} seri
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
                      onChange={(e) => satirGuncelle(b.id, i, { seri: e.target.value })}
                    />
                  </Field>
                  <label className="mt-[22px] flex items-center gap-1.5 whitespace-nowrap text-[13px]">
                    <input
                      type="checkbox"
                      checked={r.stok}
                      onChange={(e) => satirGuncelle(b.id, i, { stok: e.target.checked })}
                    />
                    Stoktan düş
                  </label>
                  <button className="btn-ghost btn-sm mt-[22px] h-9" onClick={() => satirSil(b.id, i)} title="Satırı kaldır">
                    ✕
                  </button>
                </div>
              );
            })}

            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                className="btn-ghost btn-sm"
                onClick={() => blokGuncelle(b.id, { rows: [...b.rows, { renk: '', seri: '', stok: true }] })}
              >
                + Renk ekle
              </button>
              <span className="text-sm text-muted">Bu model: <b className="tabular-nums text-ink">{f.toplam}</b> seri</span>
            </div>
          </div>
        );
      })}

      <button
        className="btn-ghost btn-sm mb-3"
        onClick={() => setBloklar((bs) => [...bs, yeniBlok()])}
      >
        + Model ekle
      </button>

      <div className="mb-3 rounded-lg bg-bg p-3 text-sm">
        Bu nakliyat: <b className="tabular-nums">{genelToplam}</b> seri · {bloklar.length} model
      </div>

      {hatalar.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-warn-soft p-2.5 text-sm text-warn">
          {hatalar.map((h, i) => <li key={i}>⚠ {h}</li>)}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted">
        Tüm modeller tek kaydetmede bir nakliyat olur ve tek fişe girer. Stokta olmayan ya da yetmeyen seri girilemez.
        "Stoktan düş" işaretsizse kayıt yalnızca giden listesine yazılır ve stok değişmez.
      </p>
    </Modal>
  );
}