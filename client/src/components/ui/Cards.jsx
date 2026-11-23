// Üstteki özet kartları: [etiket, değer, uyarı mı?]
export function Cards({ items }) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(([label, value, warn], i) => (
        <div
          key={label}
          className="card animate-fadeUp p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
          <div className={`mt-1 text-2xl font-semibold tabular-nums ${warn ? 'text-warn' : 'text-ink'}`}>
            {warn ? '⚠ ' : ''}{value}
          </div>
        </div>
      ))}
    </div>
  );
}