import { Empty } from '../ui/Empty.jsx';
import { GidenTablo } from './GidenTablo.jsx';
import { gunOzeti, gunPngIndir } from '../../lib/gunFis.js';
import { saatYazi, tarihYazi } from '../../lib/tarih.js';

// İki kayıt bu süreden kısa aralıklıysa aynı nakliyat sayılır
const NAKLIYAT_ARA_MS = 30 * 60 * 1000;
const zaman = (t) => new Date(String(t).replace(' ', 'T')).getTime();

// Kayıtları zamana göre sıralar, yakın olanları tek nakliyatta toplar
function nakliyatlariGrupla(rows) {
  const sirali = [...rows].sort((a, b) => zaman(a.tarih) - zaman(b.tarih));
  const liste = [];
  sirali.forEach((g) => {
    const son = liste[liste.length - 1];
    if (son && zaman(g.tarih) - zaman(son.bitis) <= NAKLIYAT_ARA_MS) {
      son.rows.push(g);
      son.bitis = g.tarih;
    } else {
      liste.push({ basla: g.tarih, bitis: g.tarih, rows: [g] });
    }
  });
  return liste.sort((a, b) => zaman(b.basla) - zaman(a.basla));
}

export function GidenListe({ rows, onDelete, onEdit }) {
  if (!rows.length) return <Empty text={'Henüz giden mal yok. "+ Giden mal" ile kayıt girin.'} />;

  const nakliyatlar = nakliyatlariGrupla(rows);

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
      <div className="card p-3 sm:p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Nakliyat fişleri</div>
        <div className="divide-y divide-line">
          {nakliyatlar.map((n) => {
            const o = gunOzeti(n.rows);
            const saat = n.basla === n.bitis
              ? saatYazi(n.basla)
              : `${saatYazi(n.basla)}–${saatYazi(n.bitis)}`;
            return (
              <div key={n.basla} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-semibold tabular-nums">
                    {tarihYazi(n.basla)} <span className="font-normal text-muted">· {saat}</span>
                  </div>
                  <div className="truncate text-xs text-muted">
                    {o.modeller.map((m) => m.kod).join(' · ')} · {o.toplamSeri} seri
                  </div>
                </div>
                <button className="btn-sm shrink-0" onClick={() => gunPngIndir(n.rows, n.basla, saat)}>
                  PNG
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