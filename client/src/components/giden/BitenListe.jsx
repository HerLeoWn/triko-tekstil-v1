import { ConfirmButton } from '../../Confirm.jsx';
import { swatch } from '../../renk.js';
import { fmt } from '../../lib/format.js';
import { Cards } from '../ui/Cards.jsx';
import { Empty } from '../ui/Empty.jsx';

// Bitenler: stoğu sıfırlanan renkler, ürün grubuna göre
export function BitenListe({ groups, onDeleteGroup }) {
  if (!groups.length) return <Empty text="Bitmiş ürün yok. Stoğu sıfırlanan renkler burada görünür." />;
  const items = groups.flatMap((g) => g.items);
  const totalSeri = items.reduce((s, p) => s + p.seri, 0);
  return (
    <>
      <Cards items={[
        ['Biten renk', items.length],
        ['Ürün grubu', groups.length],
        ['Toplam giden seri', totalSeri],
      ]} />
      {groups.map((g) => (
        <details key={g.kod} open className="card mb-3 p-4">
          <summary className="cursor-pointer select-none py-1 text-[15px]">
            <b>{g.kod}</b> <span className="text-sm text-muted">{g.items.length} renk bitti</span>
          </summary>
          <div className="mt-3 space-y-2">
            {g.items.map((p) => {
              const sw = swatch(p.renk);
              return (
                <div
                  key={p.renk}
                  className="grid grid-cols-2 gap-2 rounded-xl p-3 text-sm sm:grid-cols-[1fr_auto_auto_auto]"
                  style={{ background: sw.bg, color: sw.fg }}
                >
                  <span className="col-span-2 font-semibold sm:col-span-1">{p.renk}</span>
                  <span className="opacity-90">{p.cuval} çuval</span>
                  <span className="tabular-nums opacity-90">{p.seri} seri</span>
                  <span className="text-xs opacity-80">{fmt(p.son)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-right">
            <ConfirmButton
              label="Bu ürün grubunu komple sil"
              question="Grup ve tüm kayıtları silinsin mi?"
              onConfirm={() => onDeleteGroup(g.kod)}
            />
          </div>
        </details>
      ))}
    </>
  );
}