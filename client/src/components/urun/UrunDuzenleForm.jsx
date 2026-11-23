import { useEffect, useRef, useState } from 'react';
import { api } from '../../api.js';

// Ürün kodu ve adını düzenleme. Kod değişirse bağlı çuval ve giden kayıtlar taşınır.
export function UrunDuzenleForm({ urun, onSave, onClose }) {
  const [kod, setKod] = useState(urun.kod);
  const [ad, setAd] = useState(urun.ad ?? '');
  const [hata, setHata] = useState('');
  const [yuk, setYuk] = useState(false);
  const kilit = useRef(false);

  const kodTemiz = kod.trim();
  const adTemiz = ad.trim();
  const kodDegisti = kodTemiz && kodTemiz.toLowerCase() !== urun.kod.toLowerCase();
  const degisiklikVar = kodTemiz !== urun.kod || adTemiz !== (urun.ad ?? '');

  const kaydet = async () => {
    if (kilit.current) return;
    setHata('');
    if (!kodTemiz) return setHata('Ürün kodu boş olamaz.');
    if (!degisiklikVar) return onClose();

    kilit.current = true;
    setYuk(true);
    try {
      await api.put(`/api/urun/${encodeURIComponent(urun.kod)}`, { kod: kodTemiz, ad: adTemiz });
      onSave();
    } catch (e) {
      setHata(e.message);
    } finally {
      kilit.current = false;
      setYuk(false);
    }
  };

  // Esc kapatır, Ctrl+Enter kaydeder. Ref sayesinde dinleyici yalnızca bir kez kurulur.
  const latest = useRef({ kaydet, onClose });
  latest.current = { kaydet, onClose };

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') latest.current.onClose();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) latest.current.kaydet();
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
        className="w-full rounded-t-2xl bg-white p-5 shadow-lift sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-semibold">Ürünü düzenle</span>
          <span className="hidden text-[11px] text-muted sm:block">Ctrl+Enter kaydet · Esc kapat</span>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted">Ürün kodu</span>
            <input
              className="inp"
              value={kod}
              onChange={(e) => setKod(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] text-muted">Ürün adı</span>
            <input
              className="inp"
              placeholder="Örn: 3 Düğmeli Açık Yaka Hırka"
              value={ad}
              onChange={(e) => setAd(e.target.value)}
            />
          </label>
        </div>

        {kodDegisti && (
          <p className="mt-3 rounded-lg bg-warn-soft p-2.5 text-xs text-warn">
            Kod değişirse bu koddaki bütün çuvallar ve giden kayıtlar yeni koda taşınır.
          </p>
        )}
        {hata && <p className="mt-3 text-sm text-warn">⚠ {hata}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn" onClick={kaydet} disabled={yuk || !kodTemiz}>
            {yuk ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}