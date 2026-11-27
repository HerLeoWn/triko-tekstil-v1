import { swatch } from '../../renk.js';

// "Depolara göre": her depo kendi açılır kutusunda, içinde o depodaki ürünler ve renk seriler
export function DepoKutulari({ depolar, groups }) {
  return (
    <>
      <h4 className="mb-2 text-sm font-semibold">Depolara göre</h4>
      <div className="mb-6 space-y-2">
        {depolar.map((d) => {
          const urunler = groups
            .map((g) => ({
              kod: g.kod,
              ad: g.ad,
              renks: g.renks.filter((r) => (r.depoSeri?.[d.id] ?? 0) > 0),
            }))
            .filter((g) => g.renks.length);
          const toplam = urunler.reduce(
            (s, g) => s + g.renks.reduce((x, r) => x + r.depoSeri[d.id], 0),
            0,
          );
          return (
            <details key={d.id} className="card p-4">
              <summary className="cursor-pointer select-none py-1 text-[15px]">
                <b>{d.ad}</b>
                <span className="ml-2 text-sm text-muted">{urunler.length} ürün · {toplam} seri</span>
              </summary>
              {urunler.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Bu depoda stok yok.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {urunler.map((g) => (
                    <div key={g.kod} className="rounded-xl border border-line p-3">
                      <div className="mb-2 text-sm">
                        <b>{g.kod}</b>
                        {g.ad && <span className="ml-2 text-muted">{g.ad}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.renks.map((r) => {
                          const sw = swatch(r.renk);
                          return (
                            <span key={r.renk} className="rounded-full px-2.5 py-1 text-xs"
                              style={{ background: sw.grad, color: sw.fg }}>
                              {r.renk} <b className="tabular-nums">{r.depoSeri[d.id]}</b>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </details>
          );
        })}
      </div>
    </>
  );
}