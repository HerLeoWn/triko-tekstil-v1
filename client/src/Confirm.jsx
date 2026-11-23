import { createContext, useContext, useEffect, useState } from 'react';

export const YetkiContext = createContext({ rol: 'yonetici', okumaModu: false });

export function ConfirmButton({
  label = 'Sil',
  question = 'Emin misiniz?',
  onConfirm,
  className = 'btn-danger',
}) {
  const { okumaModu } = useContext(YetkiContext);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 4000);
    return () => clearTimeout(t);
  }, [asking]);

  if (okumaModu) return null;

  if (!asking) {
    return (
      <button className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex animate-fadeUp items-center gap-1.5 rounded-lg bg-danger-soft px-2 py-1">
      <span className="text-xs font-medium text-danger">{question}</span>
      <button
        className="btn-danger"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        Evet
      </button>
      <button className="btn-ghost btn-sm" onClick={() => setAsking(false)}>
        Vazgeç
      </button>
    </span>
  );
}