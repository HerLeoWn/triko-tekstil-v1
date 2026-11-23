import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

// Görevleri 5 saniyede bir çeker. Canlı takip için.
export function useGorevler() {
  const [liste, setListe] = useState([]);

  const yenile = useCallback(() => {
    api.get('/api/gorevler').then(setListe).catch(() => {});
  }, []);

  useEffect(() => {
    yenile();
    const t = setInterval(yenile, 5000);
    return () => clearInterval(t);
  }, [yenile]);

  return { liste, yenile };
}