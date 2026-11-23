import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

export const enc = encodeURIComponent;

const BOS_VERI = {
  stok: null, cuvallar: [], giden: [], biten: [], hareket: [],
  yedekler: [], geriAl: null, uyari: null, kullanicilar: [],
};

// Sunucudan tüm verileri çeker, filtre değişince ve canlı güncellemede yeniler.
// run(fn): bir yazma işlemi yapar, bittiğinde veriyi yeniler.
export function useTriko({ yonetici, q, cuvalDurum, esik, gun }) {
  const [data, setData] = useState(BOS_VERI);
  const [canli, setCanli] = useState(false);

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
    } catch (e) {
      if (e.status !== 401) alert(e.message);
    }
  }, [q, cuvalDurum, esik, gun, yonetici]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => { refresh(); }, [refresh]);

  // Canlı güncelleme: sunucu "değişti" dediğinde kısa gecikmeyle yenile
  useEffect(() => {
    let zaman;
    const es = new EventSource('/api/olaylar');
    es.onopen = () => setCanli(true);
    es.onerror = () => setCanli(false);
    es.onmessage = () => {
      clearTimeout(zaman);
      zaman = setTimeout(() => refreshRef.current?.(), 150);
    };
    return () => {
      clearTimeout(zaman);
      es.close();
    };
  }, []);

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