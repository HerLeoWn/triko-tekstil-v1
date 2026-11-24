import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Empty } from '../ui/Empty.jsx';

const RENKLER = ['#3d7a4f', '#2563eb', '#d97706', '#9333ea', '#dc2626', '#0891b2'];
const DIGER_RENK = '#94a3b8';
const ILK_N = 6; // grafikte ayrı gösterilecek model sayısı, geri kalanı "Diğer"

const etiket = (g) => (g.ad ? `${g.kod} · ${g.ad}` : g.kod);

// Muhasebe ana ekranında canlı stok. Model dağılımı grafikleri ve detay tablosu. Her 5 saniyede bir yenilenir.
export function StokCanli() {
  const [stok, setStok] = useState(null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    const yukle = () => api.get('/api/stok')
      .then((d) => { setStok(d); setHata(''); })
      .catch((e) => setHata(e.message));
    yukle();
    const t = setInterval(yukle, 5000);
    return () => clearInterval(t);
  }, []);

  if (!stok) return <p className="text-sm text-muted">{hata ? `⚠ ${hata}` : 'Stok yükleniyor…'}</p>;

  const depolar = [...(stok.depolar ?? [])].sort((a, b) => a.sira - b.sira);
  const gruplar = stok.groups ?? [];
  if (!gruplar.length) return <Empty text="Stokta çuval yok." />;

  const toplamSeri = stok.totals?.seri ?? gruplar.reduce((s, g) => s + g.seri, 0);
  const toplamCuval = stok.totals?.cuval ?? gruplar.reduce((s, g) => s + g.cuval, 0);
  const modeller = [...gruplar].sort((a, b) => b.seri - a.seri);
  const enCok = modeller[0];
  const maxSeri = Math.max(enCok.seri, 1);
  const payda = Math.max(toplamSeri, 1);

  const renkOf = (i) => (i < ILK_N ? RENKLER[i] : DIGER_RENK);

  // Halka grafik dilimleri
  const ust = modeller.slice(0, ILK_N);
  const diger = modeller.slice(ILK_N);
  const dilimler = [
    ...ust.map((g, i) => ({ ad: etiket(g), seri: g.seri, renk: renkOf(i) })),
    ...(diger.length ? [{ ad: `Diğer (${diger.length} model)`, seri: diger.reduce((s, g) => s + g.seri, 0), renk: DIGER_RENK }] : []),
  ];

  const R = 60;
  const C = 2 * Math.PI * R;
  let birikim = 0;

  return (
    <div className="space-y-4">
      {/* Özet kartlar */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-xl border border-line p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted">Toplam seri</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{toplamSeri}</div>
        </div>
        <div className="rounded-xl border border-line p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted">Toplam çuval</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{toplamCuval}</div>
        </div>
        <div className="rounded-xl border border-line p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted">Model sayısı</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{modeller.length}</div>
        </div>
        <div className="rounded-xl border border-line p-3">
          <div className="text-[11px] uppercase tracking-wide text-muted">En çok stok</div>
          <div className="mt-1 truncate text-sm font-semibold">{etiket(enCok)}</div>
          <div className="text-xs tabular-nums text-muted">{enCok.seri} seri</div>
        </div>
      </div>

      {/* Model dağılımı: halka grafik + açıklama */}
      <div className="rounded-xl border border-line p-4">
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Model dağılımı (seri)</h3>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0">
            <circle cx="80" cy="80" r={R} fill="none" stroke="#eef0ee" strokeWidth="22" />
            {dilimler.map((d, i) => {
              const f = d.seri / payda;
              const el = (
                <circle
                  key={i}
                  cx="80"
                  cy="80"
                  r={R}
                  fill="none"
                  stroke={d.renk}
                  strokeWidth="22"
                  strokeDasharray={`${f * C} ${C}`}
                  strokeDashoffset={-birikim * C}
                  transform="rotate(-90 80 80)"
                />
              );
              birikim += f;
              return el;
            })}
            <text x="80" y="78" textAnchor="middle" fill="currentColor" fontSize="16" fontWeight="600">{toplamSeri}</text>
            <text x="80" y="95" textAnchor="middle" fill="currentColor" fontSize="10">seri</text>
          </svg>

          <ul className="grid w-full flex-1 gap-1.5 text-sm">
            {dilimler.map((d, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.renk }} />
                  <span className="truncate">{d.ad}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {d.seri} · %{Math.round((d.seri / payda) * 100)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Model başına çubuklar */}
      <div className="rounded-xl border border-line p-4">
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Model başına stok</h3>
        <div className="space-y-3">
          {modeller.map((g, i) => (
            <div key={g.kod}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <b>{g.kod}</b>
                  {g.ad && <span className="ml-2 text-xs text-muted">{g.ad}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-xs text-muted">
                  {g.cuval} çuval · {g.seri} seri
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-track">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(g.seri / maxSeri) * 100}%`, background: renkOf(i) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Renk ve depo detayı */}
      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-medium">Renk ve depo detayı</summary>
        <div className="mt-3 space-y-3">
          {modeller.map((g) => {
            const grupToplam = g.renks.reduce((s, r) =>
              s + depolar.reduce((x, d) => x + (r.depoSeri?.[d.id] ?? 0), 0), 0);
            return (
              <div key={g.kod} className="rounded-xl border border-line p-3">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div>
                    <b>{g.kod}</b>
                    {g.ad && <span className="ml-2 text-xs text-muted">{g.ad}</span>}
                  </div>
                  <span className="text-xs tabular-nums text-muted">{grupToplam} seri</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                        <th className="py-1.5 pr-3 font-semibold">Renk</th>
                        {depolar.map((d) => (
                          <th key={d.id} className="py-1.5 pr-3 text-right font-semibold">{d.ad}</th>
                        ))}
                        <th className="py-1.5 text-right font-semibold">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.renks.map((r) => {
                        const top = depolar.reduce((s, d) => s + (r.depoSeri?.[d.id] ?? 0), 0);
                        return (
                          <tr key={r.renk} className="border-t border-line">
                            <td className="py-1.5 pr-3">{r.renk}</td>
                            {depolar.map((d) => (
                              <td key={d.id} className="py-1.5 pr-3 text-right tabular-nums">
                                {r.depoSeri?.[d.id] ?? 0}
                              </td>
                            ))}
                            <td className="py-1.5 text-right font-semibold tabular-nums">{top}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}