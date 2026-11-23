import { ConfirmButton } from '../../Confirm.jsx';
import { Columns } from '../../Charts.jsx';
import { fmt, son14Gun } from '../../lib/format.js';
import { Cards } from '../ui/Cards.jsx';
import { Empty } from '../ui/Empty.jsx';

// Bir depoya ait giden kayıtların tablosu (mobilde kart, masaüstünde tablo)
export function GidenTablo({ rows, onDelete, onEdit }) {
  if (!rows.length) return <Empty text={'Henüz giden mal yok. "+ Giden mal" ile kayıt girin.'} />;
  const toplamCuval = rows.reduce((s, g) => s + g.cuvalAdedi, 0);
  const toplamSeri = rows.reduce((s, g) => s + g.seri, 0);
  return (
    <>
      <Cards items={[['Giden çuval', toplamCuval], ['Giden seri', toplamSeri], ['Kayıt', rows.length]]} />

      <div className="card mb-5 p-5">
        <div className="mb-4 text-[11px] font-medium uppercase tracking-wide text-muted">Son 14 gün giden seri</div>
        <Columns data={son14Gun(rows)} />
      </div>

      {/* Mobil: kart görünümü */}
      <div className="space-y-2.5 md:hidden">
        {rows.map((g) => (
          <div key={g.id} className="rounded-xl border border-line bg-white p-3.5 shadow-soft">
            <div className="flex justify-between gap-2">
              <div className="font-semibold">{g.kod} <span className="font-normal">{g.renk}</span></div>
              <div className="text-sm font-semibold tabular-nums">{g.seri} seri</div>
            </div>
            <div className="mt-1 text-sm">{g.ozet}</div>
            <div className="mt-1 text-xs text-muted">{fmt(g.tarih)}</div>
            <div className="mt-3 flex gap-2">
              {onEdit && <button className="btn-ghost btn-sm" onClick={() => onEdit(g)}>Düzenle</button>}
              <ConfirmButton question="Silinsin mi?" onConfirm={() => onDelete(g)} />
            </div>
          </div>
        ))}
      </div>

      {/* Masaüstü: tablo */}
      <div className="card hidden overflow-x-auto p-0 md:block">
        <table className="w-full text-sm">
          <thead className="bg-bg/60">
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              {['Tarih', 'Kod', 'Renk', 'Çuval', 'Seri', ''].map((h) => (
                <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} className="border-t border-line align-middle transition hover:bg-bg/60">
                <td className="px-3 py-3 text-xs text-muted">{fmt(g.tarih)}</td>
                <td className="px-3 py-3 font-semibold">{g.kod}</td>
                <td className="px-3 py-3">{g.renk}</td>
                <td className="px-3 py-3">{g.ozet}</td>
                <td className="px-3 py-3 tabular-nums">{g.seri}</td>
                <td className="whitespace-nowrap px-3 py-3">
                  {onEdit && <button className="btn-ghost btn-sm mr-2" onClick={() => onEdit(g)}>Düzenle</button>}
                  <ConfirmButton question="Silinsin mi?" onConfirm={() => onDelete(g)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Silinen giden kaydın stoktan düşen çuvalları geri eklenir. Manuel satırlar geri eklenmez.
      </p>
    </>
  );
}