import { useState } from 'react';
import { api } from '../../api.js';

// Şifremi unuttum: kullanıcı adı ve yeni şifre gönderilir, depo sorumlusu onaylayınca geçerli olur
export function SifreUnuttum({ onGeri }) {
  const [kullanici, setKullanici] = useState('');
  const [yeni, setYeni] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [yuk, setYuk] = useState(false);

  const gonder = async (e) => {
    e.preventDefault();
    setHata('');
    setMesaj('');
    if (!kullanici.trim()) return setHata('Kullanıcı adınızı girin.');
    if (yeni.length < 4) return setHata('Yeni şifre en az 4 karakter olmalı.');
    if (yeni !== tekrar) return setHata('Şifreler aynı değil.');
    setYuk(true);
    try {
      const r = await api.post('/api/sifre-talebi', { kullanici, yeniSifre: yeni });
      setMesaj(r.mesaj);
      setYeni('');
      setTekrar('');
    } catch (err) {
      setHata(err.message);
    } finally {
      setYuk(false);
    }
  };

  return (
    <form onSubmit={gonder} className="card w-full max-w-sm space-y-3 p-5">
      <h2 className="text-lg font-semibold">Şifremi unuttum</h2>
      <p className="text-sm text-muted">
        Yeni şifrenizi belirleyin. Depo sorumlusu onayladığında bu şifreyle giriş yapabilirsiniz.
      </p>
      <input className="inp" placeholder="Kullanıcı adı" value={kullanici}
        autoComplete="username" onChange={(e) => setKullanici(e.target.value)} />
      <input className="inp" type="password" placeholder="Yeni şifre (en az 4)" value={yeni}
        autoComplete="new-password" onChange={(e) => setYeni(e.target.value)} />
      <input className="inp" type="password" placeholder="Yeni şifre tekrar" value={tekrar}
        autoComplete="new-password" onChange={(e) => setTekrar(e.target.value)} />
      {hata && <p className="text-sm text-warn">⚠ {hata}</p>}
      {mesaj && <p className="rounded-lg bg-accent-soft p-2.5 text-sm text-accent">{mesaj}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-ghost" onClick={onGeri}>Girişe dön</button>
        <button className="btn flex-1" disabled={yuk}>{yuk ? 'Gönderiliyor…' : 'Talep gönder'}</button>
      </div>
    </form>
  );
}