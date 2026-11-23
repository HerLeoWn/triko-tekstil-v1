import { useState } from 'react';
import { api } from '../../api.js';
import { Kart } from './Kart.jsx';
import { Alan } from './Alan.jsx';

// Kullanıcı adı ve şifre ile giriş
export function GirisEkrani({ onTamam }) {
  const [f, setF] = useState({ kullanici: '', sifre: '' });
  const [hata, setHata] = useState('');
  const [yuk, setYuk] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const gonder = async (e) => {
    e.preventDefault();
    setHata('');
    setYuk(true);
    try {
      const r = await api.post('/api/giris', f);
      onTamam(r.kullanici);
    } catch (err) {
      setHata(err.message);
    } finally {
      setYuk(false);
    }
  };

  return (
    <Kart baslik="Giriş" aciklama="Triko Çuval Takibi">
      <form onSubmit={gonder} className="space-y-3">
        <Alan label="Kullanıcı adı" value={f.kullanici} onChange={set('kullanici')} autoFocus required />
        <Alan label="Şifre" type="password" value={f.sifre} onChange={set('sifre')} required />
        {hata && <p className="text-sm text-warn">⚠ {hata}</p>}
        <button className="btn w-full" disabled={yuk}>
          {yuk ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
    </Kart>
  );
}