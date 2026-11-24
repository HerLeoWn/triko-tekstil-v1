import { useEffect, useRef, useState } from 'react';

// Sekmeler tek bir açılır menüde. Arama kutusu yanında durur.
export function SekmeMenu({ tabs, tab, setTab, uyariSayisi = 0, q, setQ }) {
  const [acik, setAcik] = useState(false);
  const kapRef = useRef(null);
  const aktif = tabs.find(([k]) => k === tab);

  useEffect(() => {
    const disTikla = (e) => {
      if (kapRef.current && !kapRef.current.contains(e.target)) setAcik(false);
    };
    document.addEventListener('mousedown', disTikla);
    return () => document.removeEventListener('mousedown', disTikla);
  }, []);

  return (
    <div ref={kapRef} className="flex flex-wrap items-center gap-2 border-b border-line p-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setAcik((o) => !o)}
          className="btn-ghost flex min-w-[200px] items-center justify-between gap-3"
        >
          <span>{aktif?.[1] ?? 'Seç'}</span>
          <span className="text-muted">{acik ? '▴' : '▾'}</span>
        </button>

        {acik && (
          <div className="absolute left-0 z-30 mt-1 w-64 overflow-hidden rounded-xl border border-line bg-card shadow-soft">
            {tabs.map(([k, ad]) => (
              <button
                key={k}
                type="button"
                onClick={() => { setTab(k); setAcik(false); }}
                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-track ${
                  k === tab ? 'font-semibold text-accent' : ''
                }`}
              >
                <span>{ad}</span>
                {k === 'uyari' && uyariSayisi > 0 && (
                  <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs text-warn">{uyariSayisi}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        className="inp min-w-0 flex-1 sm:max-w-xs"
        placeholder="Ara…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  );
}