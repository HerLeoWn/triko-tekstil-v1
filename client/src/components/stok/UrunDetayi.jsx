import { useState } from 'react';
import { swatch } from '../../renk.js';
import { Bar } from '../ui/Bar.jsx';
import { TipleOnayla } from '../ui/TipleOnayla.jsx';
import { DepoChips } from './DepoChips.jsx';

// Ürün grubu ayrıntıları: her renk, seri ve depo dağılımı, grubu silme (kod yazılarak onaylanır)
export function UrunDetayi({ groups, depolar, onDeleteGroup }) {
  const [silinecek, setSilinecek] = useState(null);

  return (
    <>
      <h4 className="mb-2 text-sm font-semibold">Ürün detayı</h4>
      {groups.map((g, i) => {
        const rmax = Math.max(...g.renks.map((r) => r.seri));
        return (
          <details key={g.kod} id={`g${i}`} open className="card mb-3 p-4">
            <summary className="cursor-pointer select-none py-1 text-[15px]">
              <b>{g.kod}</b>
              {g.ad && <span className="ml-2 text-sm">{g.ad}</span>}
              <span className="ml-2 text-sm text-muted">{g.renks.length} renk · {g.cuval} çuval · {g.seri} seri</span>
              {g.eksik > 0 && <span className="ml-2 font-semibold text-warn">⚠ {g.eksik} eksik</span>}
            </summary>

            <div className="mt-3 space-y-2">
              {g.renks.map((r, j) => {
                const sw = swatch(r.renk);
                return (
                  <div key={r.renk} className="rounded-xl p-3 shadow-soft transition hover:-translate-y-px"
                    style={{ background: sw.bg, color: sw.fg }}>
                    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[100px_1fr_190px] sm:gap-3">
                      <span className="text-[13px] font-semibold">{r.renk}</span>
                      <Bar tam={r.seri - r.eksik} eksik={r.eksik} max={rmax} delay={j * 90} />
                      <span className="text-xs opacity-90">
                        {r.seri} seri · {r.cuval} çuval{r.kismi ? ` + ${r.kismi} kısmi` : ''}
                        {r.eksik > 0 && <span className="font-semibold"> · ⚠ {r.eksik} eksik</span>}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <DepoChips obj={r.depoSeri} depolar={depolar} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 text-right">
              <button className="btn-ghost btn-sm text-danger" onClick={() => setSilinecek(g)}>
                Bu ürün grubunu komple sil
              </button>
            </div>
          </details>
        );
      })}

      {silinecek && (
        <TipleOnayla
          baslik="Ürün grubu silinsin mi?"
          metin={`${silinecek.kod} ürününün ${silinecek.cuval} çuvalı ve ${silinecek.seri} seri stoku silinecek.\nSevk geçmişi (giden mallar) korunur.`}
          beklenen={silinecek.kod}
          onOnay={() => { onDeleteGroup(silinecek.kod); setSilinecek(null); }}
          onIptal={() => setSilinecek(null)}
        />
      )}
    </>
  );
}