import { useState } from 'react';

const SIZES = ['S', 'M', 'L', 'XL'];

// Asortiye girmeyen seriler: beden seçip "Seri ekle" ile listeye alınır
export function ExtraPanel({ extras, onChange }) {
  const [pick, setPick] = useState([]);

  const toggle = (b) =>
    setPick((p) => (p.includes(b) ? p.filter((x) => x !== b) : [...p, b]));

  const add = () => {
    if (!pick.length) return;
    onChange([
      ...extras,
      [...pick].sort((a, b) => SIZES.indexOf(a) - SIZES.indexOf(b)),
    ]);
    setPick([]);
  };

  return (
    <div className="mt-3 animate-fadeUp rounded-xl border border-line bg-bg p-3">
      <div className="mb-2 text-xs font-medium text-muted">
        Hangi beden(ler)? Seçip "Seri ekle" deyin
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {SIZES.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => toggle(b)}
            className={`h-9 w-12 rounded-lg text-sm font-semibold transition ${
              pick.includes(b)
                ? 'bg-warn text-white shadow-soft'
                : 'border border-line bg-white text-ink hover:border-warn'
            }`}
          >
            {b}
          </button>
        ))}

        <button type="button" className="btn-sm btn ml-auto" onClick={add} disabled={!pick.length}>
          + Seri ekle
        </button>
      </div>

      {extras.length > 0 && (
        <ul className="mt-3 space-y-1">
          {extras.map((s, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-sm">
              <span>
                {s.join(' ')} <span className="text-muted">(eksik seri)</span>
              </span>
              <button
                type="button"
                className="text-xs font-medium text-danger"
                onClick={() => onChange(extras.filter((_, j) => j !== i))}
              >
                Kaldır
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}