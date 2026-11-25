import { Empty } from '../ui/Empty.jsx';
import { GidenTablo } from './GidenTablo.jsx';
import { gunOzeti, gunPngIndir } from '../../lib/gunFis.js';
import { saatYazi, tarihYazi } from '../../lib/tarih.js';

// Giden mallar: her nakliyat (kaydetme) ayrı fiş, sonra çıkış deposuna göre tablolar
export function GidenListe({ rows, onDelete, onEdit }) {
  if (!rows.length) return <Empty text={'Henüz giden mal yok. "+ Giden mal" ile kayıt girin.'} />;

  // Nakliyat: aynı kaydetmede girilen satırlar aynı zamanı taşır
  const nakMap = new Map();
  rows.forEach((g) => {
    if (!nakMap.has(g.tarih)) nakMap.set(g.tarih, { tarih: g.tarih, rows: [] });
    nakMap.get(g.tarih).rows.push(g);
  });
  const nakliyatlar = [...nakMap.values()].sort((a, b) => (a.tarih < b.tarih ? 1 : -1));

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
      <div className="card p-4 sm:p-5">
        <div className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Nakliyat fişleri (PNG)</div>
        <div className="space-y-3">
          {nakliyatlar.map((n) => {
            const o = gunOzeti(n.rows);
            const saat = saatYazi(n.tarih);
            return (
              <div key={n.tarih} className="rounded-2xl border-2 border-line bg-white p-4 sm:p-5">
                <div className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {tarihYazi(n.tarih)} <span className="text-muted">· {saat}</span>
                </div>
                <div className="mt-2 text-lg font-semibold leading-relaxed sm:text-xl">
                  {o.modeller.map((m) => m.kod).join(' · ')}
                </div>
                <div className="mt-1 text-lg tabular-nums text-muted sm:text-xl">
                  Toplam {o.toplamSeri} seri
                </div>
                <button
                  className="btn mt-4 w-full text-lg sm:w-auto sm:px-8"
                  onClick={() => gunPngIndir(n.rows, n.tarih, saat)}
                >
                  PNG olarak indir
                </button>
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