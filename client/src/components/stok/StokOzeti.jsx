import { swatch } from '../../renk.js';
import { Donut, Legend } from '../../Charts.jsx';
import { Empty } from '../ui/Empty.jsx';
import { Cards } from '../ui/Cards.jsx';
import { Bar } from '../ui/Bar.jsx';
import { DepoChips } from './DepoChips.jsx';
import { DepoKutulari } from './DepoKutulari.jsx';
import { UrunDetayi } from './UrunDetayi.jsx';

// Stok özeti sekmesi: toplamlar, renk dağılımı, ürün grupları, depo kutuları ve ürün detayı
export function StokOzeti({ stok, onDeleteGroup }) {
  const { totals: t, groups, depolar = [] } = stok;
  if (!groups.length) return <Empty text="Stokta ürün yok. Bitenler için Bitenler sekmesine bakın." />;

  const max = Math.max(...groups.map((g) => g.seri));

  const renkMap = {};
  groups.forEach((g) => g.renks.forEach((r) => {
    const k = r.renk.toLowerCase();
    (renkMap[k] ??= { renk: r.renk, seri: 0 }).seri += r.seri;
  }));
  const segments = Object.values(renkMap)
    .sort((a, b) => b.seri - a.seri)
    .map((r) => ({ label: r.renk, value: r.seri, color: swatch(r.renk).bg }));

  return (
    <>
      <Cards items={[
        ['Tam çuval', t.cuval],
        ['Kısmi çuval', t.kismi],
        ['Toplam seri', t.seri],
        ['Eksik seri', t.eksik, t.eksik > 0],
      ]} />

      <div className="mb-6 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="card flex flex-col items-center gap-4 p-5">
          <div className="self-start text-[11px] font-medium uppercase tracking-wide text-muted">Renk dağılımı</div>
          <Donut segments={segments} center={t.seri} sub="seri" />
          <Legend segments={segments.slice(0, 6)} total={t.seri} />
        </div>

        <div className="card p-5">
          <div className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Ürün grupları</div>
          <div className="space-y-3">
            {groups.map((g, i) => (
              <a key={g.kod} href={`#g${i}`} className="group block text-ink no-underline">
                <div className="grid grid-cols-[64px_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[72px_1fr_170px]">
                  <span className="font-semibold transition group-hover:text-accent">{g.kod}</span>
                  <Bar tam={g.seri - g.eksik} eksik={g.eksik} max={max} delay={i * 70} />
                  <span className="col-span-2 text-xs text-muted sm:col-span-1 sm:text-right">
                    {g.seri} seri · {g.cuval} çuval{g.kismi ? ` + ${g.kismi} kısmi` : ''}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <DepoChips obj={g.depoSeri} depolar={depolar} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>

      <DepoKutulari depolar={depolar} groups={groups} />
      <UrunDetayi groups={groups} depolar={depolar} onDeleteGroup={onDeleteGroup} />
    </>
  );
}