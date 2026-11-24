import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { KurulumEkrani, GirisEkrani } from './Auth1.jsx';
import Uygulama from './pages/Uygulama.jsx';
import { HesapFormu } from './components/hesap/HesapFormu.jsx';

// Giriş kapısı: kurulum, giriş ve oturum durumlarını yönetir.
// İlk girişte şifre belirlenmeden uygulamaya geçilmez. Hesabım her ekrandan açılabilir.
export default function App() {
  const [durum, setDurum] = useState('yukleniyor'); // yukleniyor | kurulum | giris | oturum
  const [kullanici, setKullanici] = useState(null);
  const [hesapAcik, setHesapAcik] = useState(false);

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

  // Yönetici tarafından şifresi sıfırlanmış ya da yeni eklenmiş kullanıcı önce kendi şifresini belirler
  if (kullanici.sifreDegistir) {
    return <HesapFormu zorunlu kullanici={kullanici} onTamam={setKullanici} />;
  }

  return (
    <>
      <Uygulama
        kullanici={kullanici}
        onCikis={async () => {
          await api.post('/api/cikis').catch(() => {});
          setKullanici(null);
          setDurum('giris');
        }}
      />

      <button
        onClick={() => setHesapAcik(true)}
        className="fixed bottom-24 right-4 z-40 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-ink shadow-soft sm:bottom-4"
      >
        Hesabım
      </button>

      {hesapAcik && (
        <HesapFormu
          kullanici={kullanici}
          onTamam={(k) => { setKullanici(k); setHesapAcik(false); }}
          onKapat={() => setHesapAcik(false)}
        />
      )}
    </>
  );
}