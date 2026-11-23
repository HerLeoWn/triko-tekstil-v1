// Stokta olan ürünlerin açılır listesi. Kod ya da ad yazıldıkça filtrelenir.
// Her üründe hangi depoda ne kadar stok olduğu görünür.
export function StoktakiUrunler({ groups, depolar, arama, onPick }) {
  const q = arama.trim().toLocaleLowerCase('tr-TR');
  const liste = groups.filter((g) =>
    !q
    || g.kod.toLocaleLowerCase('tr-TR').includes(q)
    || (g.ad ?? '').toLocaleLowerCase('tr-TR').includes(q),
  );

  if (!liste.length) {
    return (
      <div className="absolute z-20 mt-1 w-full rounded-lg border border-line bg-white p-3 text-sm text-muted shadow-lift">
        Eşleşen stoklu ürün yok.
      </div>
    );
  }

  return (
    <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-line bg-white shadow-lift">
      {liste.map((g) => (
        <li key={g.kod} className="border-b border-line last:border-0">
          <button
            type="button"
            className="flex w-full flex-col gap-1.5 px-3 py-2 text-left hover:bg-bg"
            onMouseDown={(e) => { e.preventDefault(); onPick(g); }}
          >
            <span className="flex items-baseline justify-between gap-2">
              <b>{g.kod}</b>
              {g.ad && <span className="truncate text-xs text-muted">{g.ad}</span>}
            </span>
            <span className="flex flex-wrap gap-1">
              {depolar
                .filter((d) => (g.depoSeri?.[d.id] ?? 0) > 0)
                .map((d) => (
                  <span key={d.id} className="rounded-full bg-track px-2 py-0.5 text-[11px]">
                    {d.ad} <b className="tabular-nums">{g.depoSeri[d.id]}</b>
                  </span>
                ))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}