import { useEffect, useRef } from 'react';

// Ortak pencere: Esc kapatır, Ctrl+Enter kaydeder, çift kaydetmeyi engeller
export function Modal({ title, onClose, onSave, children }) {
  const latest = useRef({ onClose, onSave });
  latest.current = { onClose, onSave };
  const kilit = useRef(false);

  const kaydet = () => {
    if (kilit.current) return;
    kilit.current = true;
    latest.current.onSave();
    setTimeout(() => { kilit.current = false; }, 800);
  };

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') latest.current.onClose();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) kaydet();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-lift sm:max-w-3xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="font-semibold">{title}</span>
          <span className="hidden text-[11px] text-muted sm:block">Ctrl+Enter kaydet · Esc kapat</span>
        </div>
        <div className="overflow-auto p-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button className="btn-ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn" onClick={kaydet}>Kaydet</button>
        </div>
      </div>
    </div>
  );
}