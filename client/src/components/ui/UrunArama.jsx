import { useState } from 'react';
import { Field } from './Field.jsx';

const norm = (s) => String(s ?? '').toLocaleLowerCase('tr-TR').trim();

// Kod ya da ürün adı yazılınca önerileri açar, seçilince kod ve ad birlikte dolar
export function UrunArama({ label, placeholder, value, urunler, onChange, onPick }) {
  const [acik, setAcik] = useState(false);
  const q = norm(value);
  const oneriler = q
    ? urunler.filter((u) => norm(u.kod).includes(q) || norm(u.ad).includes(q)).slice(0, 6)
    : [];

  return (
    <div className="relative">
      <Field label={label}>
        <input
          className="inp"
          placeholder={placeholder}
          value={value}
          onChange={(e) => { onChange(e.target.value); setAcik(true); }}
          onFocus={() => setAcik(true)}
          onBlur={() => setTimeout(() => setAcik(false), 150)}
        />
      </Field>
      {acik && oneriler.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-lift">
          {oneriler.map((u) => (
            <li key={u.kod}>
              <button
                type="button"
                className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-bg"
                onMouseDown={(e) => { e.preventDefault(); onPick(u); setAcik(false); }}
              >
                <b>{u.kod}</b>
                <span className="truncate text-xs text-muted">{u.ad}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}