import { swatch } from '../../renk.js';
import { fmt } from '../../lib/format.js';
import { Cards } from '../ui/Cards.jsx';

const ESIKLER = [5, 10, 15, 20];
const GUNLER = [7, 14, 30, 60];

function Satir({ renk, sol, alt, sag }) {
  const sw = swatch(renk);
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl p-3 shadow-soft transition hover:-translate-y-px"
      style={{ background: sw.bg, color: sw.fg }}
    >
      <div className="min-w-0">
        <div className="font-semibold">{sol}</div>
        {alt && <div className="text-xs opacity-80">{alt}</div>}
      </div>
      <div className="shrink-0 text-right text-sm font-semibold tabular-nums">{sag}</div>
    </div>
  );
}

// Uyarılar sekmesi: düşük stoklu ve hareketsiz renkler, eşik ve gün seçimleri
export function UyariListe({ data, esik, gun, setEsik, setGun }) {
  if (!data) return null;

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-muted">Düşük stok:</span>
          <select className="inp w-auto" value={esik} onChange={(e) => setEsik(+e.target.value)}>
            {ESIKLER.map((v) => <option key={v} value={v}>{v} seri ve altı</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted">Hareketsiz:</span>
          <select className="inp w-auto" value={gun} onChange={(e) => setGun(+e.target.value)}>
            {GUNLER.map((v) => <option key={v} value={v}>{v} gündür çıkmadı</option>)}
          </select>
        </label>
      </div>

      <Cards items={[
        ['Düşük stoklu renk', data.dusuk.length, data.dusuk.length > 0],
        ['Hareketsiz renk', data.hareketsiz.length, data.hareketsiz.length > 0],
      ]} />

      <h4 className="mb-2 mt-2 text-sm font-semibold">Düşük stok</h4>
      {data.dusuk.length === 0 ? (
        <p className="mb-6 text-sm text-muted">Eşiğin altında renk yok.</p>
      ) : (
        <div className="mb-6 space-y-2">
          {data.dusuk.map((s) => (
            <Satir
              key={`${s.kod}|${s.renk}`}
              renk={s.renk}
              sol={`${s.kod} · ${s.renk}`}
              alt="Stok azalıyor, üretim planlayın"
              sag={`${s.seri} seri`}
            />
          ))}
        </div>
      )}

      <h4 className="mb-2 text-sm font-semibold">Hareketsiz renkler</h4>
      {data.hareketsiz.length === 0 ? (
        <p className="text-sm text-muted">Hareketsiz renk yok.</p>
      ) : (
        <div className="space-y-2">
          {data.hareketsiz.map((s) => (
            <Satir
              key={`${s.kod}|${s.renk}`}
              renk={s.renk}
              sol={`${s.kod} · ${s.renk}`}
              alt={s.sonCikis ? `Son çıkış: ${fmt(s.sonCikis)}` : 'Hiç çıkış yapılmadı'}
              sag={`${s.seri} seri`}
            />
          ))}
        </div>
      )}
    </>
  );
}