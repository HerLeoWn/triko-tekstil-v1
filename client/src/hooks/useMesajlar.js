import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

// Mesajları ve okunmamış sayısını 20 saniyede bir çeker
export function useMesajlar() {
  const [veri, setVeri] = useState({ liste: [], okunmamis: 0 });

  const yenile = useCallback(() => {
    api.get('/api/mesajlar').then(setVeri).catch(() => {});
  }, []);

  useEffect(() => {
    yenile();
    const t = setInterval(yenile, 20000);
    return () => clearInterval(t);
  }, [yenile]);

  return { ...veri, yenile };
}