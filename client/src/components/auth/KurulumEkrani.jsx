import { useState } from 'react';
import { api } from '../../api.js';
import { Kart } from './Kart.jsx';
import { Alan } from './Alan.jsx';

// İlk kurulum: ilk yönetici hesabını oluşturur
export function KurulumEkrani({ onTamam }) {
  const [f, setF] = useState({ ad: '', kullanici: '', sifre: '', sifre2: '' });
  const [hata, setHata] = useState('');
  const [yuk, setYuk] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const gonder = async (e) => {
    e.preventDefault();
    setHata('');
    if (f.sifre !== f.sifre2) return setHata('Şifreler aynı değil.');
    setYuk(true);
    try {
      const r = await api.post('/api/kurulum', { ad: f.ad, kullanici: f.kullanici, sifre: f.sifre });
      onTamam(r.kullanici);
    } catch (err) {
      setHata(err.message);
    } finally {
      setYuk(false);
    }
  };

  return (
    <Kart baslik="Hoş geldiniz" aciklama="İlk yönetici hesabını oluşturun. Bu hesap tüm yetkilere sahip olur.">
      <form onSubmit={gonder} className="space-y-3">
        <Alan label="Ad soyad" value={f.ad} onChange={set('ad')} required />
        <Alan label="Kullanıcı adı" value={f.kullanici} onChange={set('kullanici')} required />
        <Alan label="Şifre" type="password" value={f.sifre} onChange={set('sifre')} required />
        <Alan label="Şifre tekrar" type="password" value={f.sifre2} onChange={set('sifre2')} required />
        {hata && <p className="text-sm text-warn">⚠ {hata}</p>}
        <button className="btn w-full" disabled={yuk}>
          {yuk ? 'Oluşturuluyor…' : 'Hesabı oluştur'}
        </button>
      </form>
    </Kart>
  );
}