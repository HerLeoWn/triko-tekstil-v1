import { useEffect, useRef } from 'react';

// Sekmeler yatay, kaydırılabilir bir çubukta durur. Açılır katman yoktur, üst üste binme olmaz.
export function SekmeMenu({ tabs, tab, setTab, uyariSayisi = 0, q, setQ }) {
  const aktifRef = useRef(null);

  // Seçili sekme her zaman görünür alana kaydırılır
  useEffect(() => {
    aktifRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [tab]);

  return (
    <div className="flex flex-col gap-3 border-b border-line p-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(([k, ad]) => {
          const aktif = k === tab;
          return (
            <button
              key={k}
              ref={aktif ? aktifRef : null}
              type="button"
              onClick={() => setTab(k)}
              aria-pressed={aktif}
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${
                aktif ? 'bg-accent text-white shadow-soft' : 'bg-track text-muted hover:text-ink'
              }`}
            >
              <span>{ad}</span>
              {k === 'uyari' && uyariSayisi > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] font-semibold ${
                  aktif ? 'bg-white/25 text-white' : 'bg-warn-soft text-warn'
                }`}>
                  {uyariSayisi}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <input
        className="inp w-full"
        placeholder="Ara…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  );
}