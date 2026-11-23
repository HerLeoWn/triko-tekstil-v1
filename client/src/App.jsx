import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { KurulumEkrani, GirisEkrani } from './Auth1.jsx';
import Uygulama from './pages/Uygulama.jsx';

// Giriş kapısı: kurulum, giriş ve oturum durumlarını yönetir.
// Oturum açıksa asıl uygulama (Uygulama) gösterilir.
export default function App() {
  const [durum, setDurum] = useState('yukleniyor'); // yukleniyor | kurulum | giris | oturum
  const [kullanici, setKullanici] = useState(null);

  const kontrol = useCallback(async () => {
    try {
      const b = await api.get('/api/ben');
      if (b.durum === 'kurulum') return setDurum('kurulum');
      setKullanici(b.kullanici);
      setDurum('oturum');
    } catch {
      setDurum('giris');
    }
  }, []);

  useEffect(() => { kontrol(); }, [kontrol]);

  // Oturum süresi dolunca (API 401 dönerse) giriş ekranına dön
  useEffect(() => {
    const k = () => setDurum('giris');
    window.addEventListener('oturum-kapandi', k);
    return () => window.removeEventListener('oturum-kapandi', k);
  }, []);

  const girdi = (k) => {
    setKullanici(k);
    setDurum('oturum');
  };

  if (durum === 'yukleniyor') return <div className="p-10 text-center text-sm text-muted">Yükleniyor…</div>;
  if (durum === 'kurulum') return <KurulumEkrani onTamam={girdi} />;
  if (durum === 'giris') return <GirisEkrani onTamam={girdi} />;

  return (
    <Uygulama
      kullanici={kullanici}
      onCikis={async () => {
        await api.post('/api/cikis').catch(() => {});
        setKullanici(null);
        setDurum('giris');
      }}
    />
  );
}
