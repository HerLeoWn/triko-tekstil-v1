import { Empty } from '../ui/Empty.jsx';
import { GidenTablo } from './GidenTablo.jsx';
import { gunOzeti, gunPngIndir } from '../../lib/gunFis.js';
import { gunAnahtari, tarihYazi } from '../../lib/tarih.js';

// Giden mallar: önce günlük PNG çıktıları, sonra çıkış deposuna göre tablolar
export function GidenListe({ rows, onDelete, onEdit }) {
  if (!rows.length) return <Empty text={'Henüz giden mal yok. "+ Giden mal" ile kayıt girin.'} />;

  // Günlere göre (tüm depolar birlikte): PNG o günün tamamını içerir
  const gunMap = new Map();
  rows.forEach((g) => {
    const key = gunAnahtari(g.tarih);
    if (!gunMap.has(key)) gunMap.set(key, { key, tarih: g.tarih, rows: [] });
    gunMap.get(key).rows.push(g);
  });
  const gunler = [...gunMap.values()].sort((a, b) => (a.key < b.key ? 1 : -1));

  // Çıkış deposuna göre gruplar
  const depoGruplari = [];
  rows.forEach((g) => {
    const ad = g.depo || '-';
    let k = depoGruplari.find((x) => x.ad === ad);
    if (!k) {
      k = { ad, rows: [] };
      depoGruplari.push(k);
    }
    k.rows.push(g);
  });

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Günlük çıktılar (PNG)</div>
        <div className="space-y-2">
          {gunler.map((g) => {
            const o = gunOzeti(g.rows);
            return (
              <div key={g.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3">
                <div>
                  <div className="font-semibold">{tarihYazi(g.tarih)}</div>
                  <div className="text-xs text-muted">
                    {o.modeller.map((m) => m.kod).join(', ')} · {o.toplamSeri} seri
                  </div>
                </div>
                <button className="btn-ghost btn-sm" onClick={() => gunPngIndir(g.rows, g.tarih)}>PNG indir</button>
              </div>
            );
          })}
        </div>
      </div>

      {depoGruplari.map((k) => {
        const seri = k.rows.reduce((s, g) => s + g.seri, 0);
        const cuval = k.rows.reduce((s, g) => s + g.cuvalAdedi, 0);
        return (
          <details key={k.ad} open className="card p-4">
            <summary className="cursor-pointer select-none py-1 text-[15px]">
              <b>{k.ad}</b>
              <span className="ml-2 text-sm text-muted">{k.rows.length} kayıt · {cuval} çuval · {seri} seri</span>
            </summary>
            <div className="mt-3">
              <GidenTablo rows={k.rows} onDelete={onDelete} onEdit={onEdit} />
            </div>
          </details>
        );
      })}
    </div>
  );
}