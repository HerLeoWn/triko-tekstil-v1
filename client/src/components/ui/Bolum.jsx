// Rapor bölümü: küçük başlık + içerik
export function Bolum({ baslik, children }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">{baslik}</h3>
      {children}
    </section>
  );
}