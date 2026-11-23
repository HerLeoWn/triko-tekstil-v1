// Telefonda ekranın altında sabit kısayol çubuğu
export function MobilAlt({ rol, onCuval, onGiden, onRapor }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-line bg-white/95 p-2 backdrop-blur sm:hidden">
      {rol !== 'izleyici' ? (
        <>
          <button className="btn-ghost" onClick={onCuval}>+ Çuval</button>
          <button className="btn" onClick={onGiden}>+ Giden</button>
        </>
      ) : (
        <span className="col-span-2" />
      )}
      <button className="btn-ghost" onClick={onRapor}>Rapor</button>
    </nav>
  );
}