import { DURUM } from '../../lib/gorev.js';
import { tarihYazi } from '../../lib/tarih.js';
import { Empty } from '../ui/Empty.jsx';

// Görevlerin canlı ilerlemesi: her malın istenen ve gönderilen seri sayıları
export function GorevCanli({ liste }) {
  if (!liste.length) return <Empty text={'Henüz görev yok. "+ Görev ata" ile başlayın.'} />;

  return (
    <div className="space-y-2.5">
      {liste.map((g) => {
        const oran = g.toplamIstenen ? Math.min(100, Math.round((g.toplamGonderilen / g.toplamIstenen) * 100)) : 0;
        const d = DURUM[g.durum] ?? DURUM.bekliyor;
        return (
          <details key={g.id} open={g.durum !== 'tamamlandi'} className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer select-none">
              <span className="font-semibold">{tarihYazi(g.tarih)} · {g.hedefAd}</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${d.renk}`}>{d.yazi}</span>
              <span className="ml-2 text-xs tabular-nums text-muted">
                {g.toplamGonderilen}/{g.toplamIstenen} seri
              </span>
            </summary>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-track">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${oran}%` }} />
            </div>

            <div className="mt-3 space-y-1.5">
              {g.kalemler.map((k) => {
                const kOran = k.istenen ? Math.min(100, Math.round((k.gonderilen / k.istenen) * 100)) : 0;
                return (
                  <div key={k.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>
                        <b>{k.kod}</b> {k.renk}
                        <span className="ml-1 text-xs text-muted">
                          ({k.kaynakDepo}{k.tur === 'manuel' ? ', elle girildi' : ''})
                        </span>
                      </span>
                      <span className="tabular-nums text-xs text-muted">{k.gonderilen}/{k.istenen} seri</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
                      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${kOran}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {g.durum === 'reddedildi' && (
              <p className="mt-2 text-sm text-warn">Red nedeni: {g.redNedeni}</p>
            )}
            {g.not && <p className="mt-2 text-xs text-muted">Not: {g.not}</p>}
          </details>
        );
      })}
    </div>
  );
}