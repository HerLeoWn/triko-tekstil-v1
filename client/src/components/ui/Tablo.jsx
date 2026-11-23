// Basit veri tablosu. Satır yoksa "bos" metni gösterilir.
export function Tablo({ basliklar, satirlar, bos }) {
  if (!satirlar.length) return <p className="text-sm text-muted">{bos}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
            {basliklar.map((h) => <th key={h} className="border-b border-line px-2 py-2 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {satirlar.map((s, i) => (
            <tr key={i} className="border-b border-line">
              {s.map((v, j) => <td key={j} className="px-2 py-2">{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}