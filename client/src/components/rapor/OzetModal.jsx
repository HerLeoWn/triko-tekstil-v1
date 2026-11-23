import { useEffect, useState } from 'react';
import { api } from '../../api.js';

// Depo özeti: depo depo çuval ve seri, ürün kartları, yazdırılabilir
export function OzetModal({ onClose }) {
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    api.get('/api/ozet').then(setVeri).catch((e) => setHata(e.message));
  }, []);

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  const toplamCuval = veri?.depolar.reduce((s, d) => s + d.cuval, 0) ?? 0;
  const toplamSeri = veri?.depolar.reduce((s, d) => s + d.seri, 0) ?? 0;

  return (
    <div
      className="print-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/35 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="print-area flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-lift sm:max-w-3xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3 print:hidden">
          <span className="font-semibold">Depo özeti</span>
          <span className="text-xs text-muted">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>

        <div className="overflow-auto p-5 print:overflow-visible print:p-0">
          <div className="mb-5 hidden print:block">
            <h1 className="text-xl font-semibold">Depo özeti</h1>
            <p className="text-sm">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          {hata && <p className="text-sm text-warn">⚠ {hata}</p>}
          {!veri && !hata && <p className="text-sm text-muted">Yükleniyor…</p>}

          {veri && (
            <>
              <div className="mb-5 grid grid-cols-2 gap-3 print:grid-cols-2">
                <div className="rounded-xl bg-bg p-3 print:border print:border-black/20">
                  <div className="text-[11px] uppercase tracking-wide text-muted">Toplam çuval</div>
                  <div className="text-2xl font-semibold tabular-nums">{toplamCuval}</div>
                </div>
                <div className="rounded-xl bg-bg p-3 print:border print:border-black/20">
                  <div className="text-[11px] uppercase tracking-wide text-muted">Toplam seri</div>
                  <div className="text-2xl font-semibold tabular-nums">{toplamSeri}</div>
                </div>
              </div>

              {veri.depolar.map((d) => (
                <section key={d.depo} className="mb-6 break-inside-avoid">
                  <div className="mb-3 flex items-baseline justify-between border-b-2 border-ink pb-1.5">
                    <h2 className="text-base font-semibold uppercase tracking-wide">{d.depo}</h2>
                    <span className="text-sm text-muted">{d.cuval} çuval · {d.seri} seri</span>
                  </div>

                  {d.urunler.length === 0 ? (
                    <p className="text-sm text-muted">Bu depoda çuval yok.</p>
                  ) : (
                    <div className="space-y-3">
                      {d.urunler.map((u) => (
                        <div key={`${u.kod}-${u.cuvalIci}`} className="rounded-xl border border-line p-3 break-inside-avoid print:border-black/20">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div>
                              <span className="font-semibold">{u.kod}</span>
                              {u.ad && <span className="ml-2 text-sm text-muted">{u.ad}</span>}
                            </div>
                            <span className="text-xs text-muted">{u.cuvalIci}'li çuval</span>
                          </div>

                          <div className="mt-2 divide-y divide-line">
                            {u.renks.map((r) => (
                              <div key={r.renk} className="flex items-center justify-between py-1.5 text-sm">
                                <span>{r.renk}</span>
                                <span className="tabular-nums font-medium">{r.seri} seri</span>
                              </div>
                            ))}
                          </div>

                          <div className="mt-2 flex justify-end gap-3 border-t border-line pt-2 text-xs text-muted">
                            <span>{u.cuval} çuval</span>
                            <span className="font-semibold text-ink">{u.seri} seri</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-3 print:hidden">
          <button className="btn-ghost" onClick={() => window.print()} disabled={!veri}>Yazdır</button>
          <button className="btn" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}