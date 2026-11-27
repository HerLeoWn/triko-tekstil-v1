import { useCallback, useEffect, useRef, useState } from 'react';
import { get } from '../../lib/istek.js';

const GOSTERIM_MS = 7000;

// Yeni toast kayıtlarını 10 saniyede bir çeker. Sayfa açıldığı andan önceki kayıtlar gösterilmez.
export function useToastlar() {
  const [liste, setListe] = useState([]);
  const son = useRef(new Date().toISOString());

  useEffect(() => {
    let iptal = false;
    const cek = () => {
      get(`/api/toast?since=${encodeURIComponent(son.current)}`)
        .then((rows) => {
          if (iptal || !Array.isArray(rows) || rows.length === 0) return;
          son.current = rows[rows.length - 1].tarih;
          setListe((e) => [...e, ...rows]);
        })
        .catch(() => {});
    };
    cek();
    const t = setInterval(cek, 10000);
    return () => {
      iptal = true;
      clearInterval(t);
    };
  }, []);

  const kapat = useCallback((id) => setListe((e) => e.filter((x) => x.id !== id)), []);
  return { liste, kapat };
}

function ToastKarti({ t, kapat }) {
  useEffect(() => {
    const zamanlayici = setTimeout(() => kapat(t.id), GOSTERIM_MS);
    return () => clearTimeout(zamanlayici);
  }, [t.id, kapat]);

  return (
    <div className="card pointer-events-auto w-full animate-fadeUp border-l-4 border-accent p-4 shadow-lift">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          ✓
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t.baslik}</p>
          {t.metin && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{t.metin}</p>}
        </div>
        <button
          type="button"
          onClick={() => kapat(t.id)}
          className="shrink-0 px-1 text-lg leading-none text-muted hover:opacity-70"
          aria-label="Kapat"
        >
          ×
        </button>
      </div>
    </div>
  );
}

// Sağ üstte kayan toast kartları. Ekranın üstünü kapatmaz, tıklamayı engellemez.
export function ToastKapsul({ liste, kapat }) {
  if (!liste.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:w-96">
      {liste.map((t) => (
        <ToastKarti key={t.id} t={t} kapat={kapat} />
      ))}
    </div>
  );
}