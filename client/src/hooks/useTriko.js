import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export const enc = encodeURIComponent;

const BOS_VERI = {
  stok: null, cuvallar: [], giden: [], biten: [], hareket: [],
  yedekler: [], geriAl: null, uyari: null, kullanicilar: [],
};

const ARALIK = 5000; // veriler bu aralıkla (ms) yenilenir

// Sunucudan tüm verileri çeker. Her 5 saniyede bir yeniler, filtre değişince de yeniler.
// run(fn): bir yazma işlemi yapar, bittiğinde veriyi yeniler.
export function useTriko({ yonetici, q, cuvalDurum, esik, gun }) {
  const [data, setData] = useState(BOS_VERI);
  const [canli, setCanli] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [stok, cuvallar, giden, biten, hareket, yedekler, geriAl, uyari, kullanicilar] = await Promise.all([
        api.get(`/api/stok?q=${enc(q)}`),
        api.get(`/api/cuvallar?q=${enc(q)}&durum=${cuvalDurum}`),
        api.get(`/api/giden?q=${enc(q)}`),
        api.get(`/api/biten?q=${enc(q)}`),
        api.get('/api/hareketler'),
        yonetici ? api.get('/api/yedek') : Promise.resolve([]),
        api.get('/api/geri-al'),
        api.get(`/api/uyari?esik=${esik}&gun=${gun}`),
        yonetici ? api.get('/api/kullanicilar') : Promise.resolve([]),
      ]);
      setData({ stok, cuvallar, giden, biten, hareket, yedekler, geriAl, uyari, kullanicilar });
      setCanli(true);
    } catch {
      // Oturum dolduysa api.js zaten giriş ekranına yönlendirir. Diğer hatalarda bağlantı "Kesik" görünür.
      setCanli(false);
    }
  }, [q, cuvalDurum, esik, gun, yonetici]);

  // İlk yükleme, periyodik yenileme ve sekme tekrar görünür olunca yenileme
  useEffect(() => {
    refresh();
    const t = setInterval(() => { if (!document.hidden) refresh(); }, ARALIK);
    const gorunur = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', gorunur);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', gorunur);
    };
  }, [refresh]);

  const run = async (fn) => {
    try {
      await fn();
      await refresh();
    } catch (e) {
      if (e.status !== 401) alert(e.message);
    }
  };

  return { data, canli, refresh, run };
}