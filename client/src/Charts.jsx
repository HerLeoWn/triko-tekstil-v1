import { useEffect, useState } from 'react';

// Bileşen ekrana gelince değerler 0'dan animasyonla yükselir
function useGo() {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return go;
}

// Halka grafik. segments: [{ label, value, color }]
export function Donut({ segments, size = 168, stroke = 20, center, sub }) {
  const go = useGo();
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eeece4" strokeWidth={stroke} />
        {total > 0 && segments.map((s, i) => {
          const len = (s.value / total) * c;
          const off = acc;
          acc += len;
          if (s.value <= 0) return null;
          return (
            <circle
              key={`${s.label}-${i}`}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={go ? `${Math.max(len - 2, 0)} ${c}` : `0 ${c}`}
              strokeDashoffset={-off}
              style={{ transition: `stroke-dasharray .9s cubic-bezier(.2,.8,.2,1) ${i * 80}ms` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{center ?? total}</span>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </div>
    </div>
  );
}

// Renk listesi, her rengin yüzdesi
export function Legend({ segments, total }) {
  return (
    <ul className="w-full space-y-1.5 text-xs">
      {segments.map((s) => (
        <li key={s.label} className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: s.color }} />
            <span className="truncate">{s.label}</span>
          </span>
          <span className="shrink-0 tabular-nums text-muted">
            {total ? Math.round((s.value / total) * 100) : 0}%
          </span>
        </li>
      ))}
    </ul>
  );
}

// Dikey sütun grafik. data: [{ label, value }]
export function Columns({ data, height = 140 }) {
  const go = useGo();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="group flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-accent to-accent-hover transition-[height] duration-700 ease-out group-hover:brightness-110"
              style={{
                height: go && d.value ? `${(d.value / max) * 100}%` : '0%',
                transitionDelay: `${i * 40}ms`,
              }}
            />
            {d.value > 0 && (
              <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-1.5 py-0.5 text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                {d.value}
              </span>
            )}
          </div>
          <span className="w-full truncate text-center text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}