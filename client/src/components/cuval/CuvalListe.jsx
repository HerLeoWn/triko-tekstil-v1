import { Empty } from '../ui/Empty.jsx';
import { GrupKarti } from './GrupKarti.jsx';

// Aynı kod, ürün adı, içerik ve çuval içi seri olan çuvalları tek satırda toplar
function anahtar(c) {
  return `${c.kod.toLowerCase()}|${c.etiket.toLowerCase()}|${c.cuvalIci}`;
}

function gruplaCuvallar(liste) {
  const map = {};
  liste.forEach((c) => {
    const k = anahtar(c);
    const g = (map[k] ??= { kod: c.kod, ad: c.ad, etiket: c.etiket, cuvalIci: c.cuvalIci, seri: 0, adet: 0, cuvallar: [] });
    g.seri += c.seri;
    g.adet += 1;
    g.cuvallar.push(c);
  });
  return Object.values(map).sort((a, b) => a.kod.localeCompare(b.kod, 'tr', { numeric: true }));
}

// Çuvalar sekmesi: depo kutuları içinde çuval grupları
export function CuvalListe({ rows, depolar = [], onEdit, onToggle, onDelete, onTopluDuzelt }) {
  if (!rows.length) return <Empty text={'Henüz çuval yok. "+ Yeni çuval(lar)" ile başlayın.'} />;
  const sirali = [...depolar].sort((a, b) => a.sira - b.sira);

  return (
    <div className="space-y-3">
      {sirali.map((d) => {
        const liste = rows.filter((c) => c.depoId === d.id);
        const gruplar = gruplaCuvallar(liste);
        const seri = liste.reduce((s, c) => s + c.seri, 0);
        return (
          <details key={d.id} className="card p-4">
            <summary className="cursor-pointer select-none">
              <b>{d.ad}</b>
              <span className="ml-2 text-sm text-muted">{liste.length} çuval · {seri} seri</span>
            </summary>

            {!gruplar.length ? (
              <p className="mt-3 text-sm text-muted">Bu depoda çuval yok.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {gruplar.map((g) => (
                  <GrupKarti
                    key={`${d.id}-${anahtar(g.cuvallar[0])}`}
                    grup={g}
                    depolar={sirali}
                    onEdit={onEdit}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onTopluDuzelt={onTopluDuzelt}
                  />
                ))}
              </div>
            )}
          </details>
        );
      })}
    </div>
  );
}