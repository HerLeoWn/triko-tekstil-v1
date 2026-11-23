import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { Modal } from '../ui/Modal.jsx';
import { Field } from '../ui/Field.jsx';

const bugun = () => new Date().toLocaleDateString('sv-SE');
const DIS = 'dis';
const yeniSatir = () => ({ mod: 'stok', secim: '', kod: '', renk: '', depoId: '', istenen: '' });

// Muhasebe görev formu: hedef seçilir, her mal stoktan seçilir ya da elle girilir
export function GorevFormu({ onKapat, onKaydet }) {
  const [tarih, setTarih] = useState(bugun());
  const [hedef, setHedef] = useState('');
  const [disAd, setDisAd] = useState('Marrakech');
  const [not, setNot] = useState('');
  const [satirlar, setSatirlar] = useState([yeniSatir()]);
  const [stok, setStok] = useState(null);
  const [sunucuHata, setSunucuHata] = useState('');
  const [yuk, setYuk] = useState(false);

  useEffect(() => {
    api.get('/api/stok').then(setStok).catch((e) => setSunucuHata(e.message));
  }, []);

  const depolar = useMemo(
    () => [...(stok?.depolar ?? [])].sort((a, b) => a.sira - b.sira),
    [stok],
  );

  // Stoktaki her (kod, renk, depo) kombinasyonu bir seçenek
  const secenekler = useMemo(() => {
    const liste = [];
    (stok?.groups ?? []).forEach((g) => g.renks.forEach((r) => depolar.forEach((d) => {
      const mevcut = r.depoSeri?.[d.id] ?? 0;
      if (mevcut > 0) {
        liste.push({
          deger: `${g.kod}|${r.renk}|${d.id}`,
          kod: g.kod,
          renk: r.renk,
          depoId: d.id,
          depoAd: d.ad,
          mevcut,
        });
      }
    })));
    return liste;
  }, [stok, depolar]);

  const guncelle = (i, patch) =>
    setSatirlar((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const stoktanSec = (i, deger) => {
    const o = secenekler.find((x) => x.deger === deger);
    guncelle(i, { secim: deger, depoId: o?.depoId ?? '' });
  };

  const hedefDepoId = hedef && hedef !== DIS ? Number(hedef) : null;
  const hedefAdi = hedef === DIS
    ? disAd.trim()
    : (depolar.find((d) => d.id === hedefDepoId)?.ad ?? '');

  // Satırları sunucunun beklediği biçime çevirir
  const kalemler = satirlar.map((s) => {
    if (s.mod === 'stok') {
      const o = secenekler.find((x) => x.deger === s.secim);
      return {
        tur: 'stok',
        kod: o?.kod ?? '',
        renk: o?.renk ?? '',
        kaynakDepoId: o?.depoId ?? null,
        istenen: parseInt(s.istenen, 10) || 0,
        mevcut: o?.mevcut ?? 0,
      };
    }
    return {
      tur: 'manuel',
      kod: s.kod.trim(),
      renk: s.renk.trim(),
      kaynakDepoId: Number(s.depoId) || null,
      istenen: parseInt(s.istenen, 10) || 0,
      mevcut: null,
    };
  });

  const hatalar = [];
  if (!hedefAdi) hatalar.push('Hedef seçin.');
  kalemler.forEach((k) => {
    const ad = k.kod ? `${k.kod} ${k.renk}` : 'Bir mal';
    if (!k.kod || !k.renk) hatalar.push(`${ad}: stoktan seçin ya da kod ve renk girin.`);
    else if (!k.kaynakDepoId) hatalar.push(`${ad}: çıkacak depoyu seçin.`);
    else if (!(k.istenen > 0)) hatalar.push(`${ad}: seri girin.`);
    else if (k.tur === 'stok' && k.istenen > k.mevcut) hatalar.push(`${ad}: stokta yalnızca ${k.mevcut} seri var.`);
    else if (hedefDepoId && k.kaynakDepoId === hedefDepoId) hatalar.push(`${ad}: kaynak ve hedef depo aynı olamaz.`);
  });

  const kaydet = async () => {
    if (hatalar.length) return;
    setYuk(true);
    setSunucuHata('');
    try {
      await api.post('/api/gorevler', {
        tarih,
        hedefDepoId,
        hedefAd: hedefAdi,
        not,
        kalemler: kalemler.map(({ tur, kod, renk, kaynakDepoId, istenen }) => ({
          tur, kod, renk, kaynakDepoId, istenen,
        })),
      });
      onKaydet();
    } catch (e) {
      setSunucuHata(e.message);
    } finally {
      setYuk(false);
    }
  };

  return (
    <Modal title="Görev ata" onClose={onKapat} onSave={kaydet}>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        <Field label="Tarih">
          <input type="date" className="inp" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </Field>
        <Field label="Hedef">
          <select className="inp" value={hedef} onChange={(e) => setHedef(e.target.value)}>
            <option value="">Seçin</option>
            {depolar.map((d) => (
              <option key={d.id} value={d.id}>{d.ad} (depo, stok taşınır)</option>
            ))}
            <option value={DIS}>Dış yer (satış, stok değişmez)</option>
          </select>
        </Field>
        {hedef === DIS && (
          <Field label="Dış yer adı">
            <input className="inp" value={disAd} onChange={(e) => setDisAd(e.target.value)} />
          </Field>
        )}
      </div>

      <div className="mt-4 space-y-2.5">
        {satirlar.map((s, i) => {
          const secilen = secenekler.find((x) => x.deger === s.secim);
          return (
            <div key={i} className="rounded-xl border border-line p-3">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <button type="button" className={s.mod === 'stok' ? 'pill-on' : 'pill-off'}
                  onClick={() => guncelle(i, { mod: 'stok' })}>Stoktan seç</button>
                <button type="button" className={s.mod === 'manuel' ? 'pill-on' : 'pill-off'}
                  onClick={() => guncelle(i, { mod: 'manuel' })}>Yeni mal (elle gir)</button>
                <button type="button" className="btn-ghost btn-sm ml-auto"
                  onClick={() => setSatirlar((x) => (x.length > 1 ? x.filter((_, j) => j !== i) : x))}>✕</button>
              </div>

              {s.mod === 'stok' ? (
                <div className="grid gap-2.5 md:grid-cols-[1fr_120px]">
                  <select className="inp" value={s.secim} onChange={(e) => stoktanSec(i, e.target.value)}>
                    <option value="">Stoktaki maldan seçin</option>
                    {secenekler.map((o) => (
                      <option key={o.deger} value={o.deger}>
                        {o.kod} · {o.renk} · {o.depoAd} ({o.mevcut} seri)
                      </option>
                    ))}
                  </select>
                  <input className="inp" type="number" min="1" placeholder="Seri" value={s.istenen}
                    onChange={(e) => guncelle(i, { istenen: e.target.value })} />
                </div>
              ) : (
                <div className="grid gap-2.5 md:grid-cols-[1fr_1fr_1fr_120px]">
                  <input className="inp" placeholder="Kod (örn 2909)" value={s.kod}
                    onChange={(e) => guncelle(i, { kod: e.target.value })} />
                  <input className="inp" placeholder="Renk" value={s.renk}
                    onChange={(e) => guncelle(i, { renk: e.target.value })} />
                  <select className="inp" value={s.depoId} onChange={(e) => guncelle(i, { depoId: e.target.value })}>
                    <option value="">Çıkacak depo</option>
                    {depolar.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
                  </select>
                  <input className="inp" type="number" min="1" placeholder="Seri" value={s.istenen}
                    onChange={(e) => guncelle(i, { istenen: e.target.value })} />
                </div>
              )}

              {s.mod === 'stok' && secilen && (
                <div className="mt-1 text-xs text-muted">Stokta: {secilen.mevcut} seri</div>
              )}
            </div>
          );
        })}
      </div>

      <button className="btn-ghost btn-sm mt-2" onClick={() => setSatirlar((x) => [...x, yeniSatir()])}>
        + Mal ekle
      </button>

      <div className="mt-3">
        <Field label="Not (isteğe bağlı)">
          <textarea className="inp min-h-[60px] w-full" maxLength={300} value={not}
            onChange={(e) => setNot(e.target.value)} />
        </Field>
      </div>

      {(hatalar.length > 0 || sunucuHata) && (
        <ul className="mt-3 space-y-1 rounded-lg bg-warn-soft p-2.5 text-sm text-warn">
          {hatalar.map((h, i) => <li key={i}>⚠ {h}</li>)}
          {sunucuHata && <li>⚠ {sunucuHata}</li>}
        </ul>
      )}
      {yuk && <p className="mt-2 text-xs text-muted">Kaydediliyor…</p>}
    </Modal>
  );
}