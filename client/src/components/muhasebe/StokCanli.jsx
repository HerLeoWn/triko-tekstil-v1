import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Empty } from '../ui/Empty.jsx';

// Muhasebe ana ekranında canlı stok. Her 5 saniyede bir yenilenir.
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

  return (
    <div className="space-y-3">
      {gruplar.map((g) => {
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
  );
}