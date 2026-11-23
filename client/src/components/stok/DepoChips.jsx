// "Depo adı miktar" etiketleri. obj: { depoId: seri }
export function DepoChips({ obj, depolar = [] }) {
  const depoAd = (id) => depolar.find((d) => String(d.id) === String(id))?.ad ?? '-';
  return (
    <>
      {Object.entries(obj || {})
        .filter(([, v]) => v > 0)
        .map(([id, v]) => (
          <span key={id} className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-ink shadow-soft">
            {depoAd(id)} <b className="tabular-nums">{v}</b>
          </span>
        ))}
    </>
  );
}