import { Field } from '../ui/Field.jsx';

// Çuvalın renk ve seri satırları. Son satırda Enter yeni renk satırı açar.
export function ParcaEditor({ r, i, setParca, addParca, delParca }) {
  const sonMu = (k) => k === r.parcalar.length - 1;

  const enter = (e, k) => {
    if (e.key === 'Enter' && sonMu(k) && r.parcalar[k].renk.trim()) {
      e.preventDefault();
      addParca(i);
    }
  };

  return (
    <div className="mt-3">
      <div className="mb-1.5 text-xs font-medium text-muted">Bu çuvalın içeriği (renk ve seri)</div>

      {r.parcalar.map((p, k) => (
        <div key={k} className="mb-2 grid grid-cols-[1fr_110px_36px] items-end gap-2">
          <Field label={k === 0 ? 'Renk' : ''}>
            <input
              className="inp"
              list="renk-liste"
              placeholder="Vanilya"
              value={p.renk}
              autoFocus={k > 0 && sonMu(k)}
              onKeyDown={(e) => enter(e, k)}
              onChange={(e) => setParca(i, k, { renk: e.target.value })}
            />
          </Field>
          <Field label={k === 0 ? 'Seri' : ''}>
            <input
              className="inp"
              type="number"
              min="1"
              placeholder="6"
              value={p.seri}
              onKeyDown={(e) => enter(e, k)}
              onChange={(e) => setParca(i, k, { seri: e.target.value })}
            />
          </Field>
          <button className="btn-ghost btn-sm h-9" onClick={() => delParca(i, k)} title="Rengi kaldır">
            ✕
          </button>
        </div>
      ))}

      <button className="btn-ghost btn-sm" onClick={() => addParca(i)}>+ Renk ekle</button>
    </div>
  );
}