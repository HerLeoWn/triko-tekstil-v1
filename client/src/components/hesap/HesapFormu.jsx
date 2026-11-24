import { useState } from 'react';
import { api } from '../../api.js';
import { Field } from '../ui/Field.jsx';
import { ROL_ADI } from '../../lib/roller.js';

// Hesabım formu. zorunlu=true iken (ilk giriş) kapatılamaz, yeni şifre belirlenmeden uygulamaya girilmez.
export function HesapFormu({ kullanici, onTamam, onKapat, zorunlu = false }) {
  const [ad, setAd] = useState(kullanici.ad);
  const [kadi, setKadi] = useState(kullanici.kullanici);
  const [mevcut, setMevcut] = useState('');
  const [yeni, setYeni] = useState('');
  const [tekrar, setTekrar] = useState('');
  const [denendi, setDenendi] = useState(false);
  const [hata, setHata] = useState('');
  const [yuk, setYuk] = useState(false);

  const hatalar = [];
  if (!mevcut) hatalar.push('Mevcut şifrenizi girin.');
  if (zorunlu && !yeni) hatalar.push('Yeni şifre belirlemelisiniz.');
  if (yeni && yeni.length < 4) hatalar.push('Yeni şifre en az 4 karakter olmalı.');
  if (yeni && yeni !== tekrar) hatalar.push('Yeni şifreler aynı değil.');

  const kaydet = async () => {
    setDenendi(true);
    if (hatalar.length) return;
    setYuk(true);
    setHata('');
    try {
      const r = await api.post('/api/hesap', {
        mevcutSifre: mevcut,
        yeniSifre: yeni,
        ad,
        kullanici: kadi,
      });
      onTamam(r.kullanici);
    } catch (e) {
      setHata(e.message);
    } finally {
      setYuk(false);
    }
  };

  const kart = (
    <div className="card w-full max-w-md p-5">
      <h2 className="text-lg font-semibold">{zorunlu ? 'Şifrenizi belirleyin' : 'Hesabım'}</h2>
      <p className="mt-1 text-sm text-muted">
        {zorunlu
          ? 'İlk girişinizde kendi şifrenizi belirlemeniz gerekiyor. Bu şifreyi siz seçeceksiniz.'
          : `${ROL_ADI[kullanici.rol]} · ${kullanici.kullanici}`}
      </p>

      <div className="mt-4 space-y-3">
        <Field label="Ad soyad">
          <input className="inp" value={ad} onChange={(e) => setAd(e.target.value)} />
        </Field>
        <Field label="Kullanıcı adı">
          <input className="inp" value={kadi} onChange={(e) => setKadi(e.target.value)} />
        </Field>
        <Field label="Mevcut şifre">
          <input className="inp" type="password" value={mevcut} onChange={(e) => setMevcut(e.target.value)} />
        </Field>
        <Field label={zorunlu ? 'Yeni şifre' : 'Yeni şifre (değiştirmeyecekseniz boş bırakın)'}>
          <input className="inp" type="password" value={yeni} onChange={(e) => setYeni(e.target.value)} />
        </Field>
        <Field label="Yeni şifre tekrar">
          <input className="inp" type="password" value={tekrar} onChange={(e) => setTekrar(e.target.value)} />
        </Field>
      </div>

      {denendi && hatalar.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-warn">
          {hatalar.map((h) => <li key={h}>⚠ {h}</li>)}
        </ul>
      )}
      {hata && <p className="mt-3 text-sm text-warn">⚠ {hata}</p>}

      <div className="mt-5 flex justify-end gap-2">
        {!zorunlu && <button className="btn-ghost" onClick={onKapat}>Vazgeç</button>}
        <button className="btn" disabled={yuk} onClick={kaydet}>
          {yuk ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  );

  if (zorunlu) {
    return <div className="flex min-h-screen items-center justify-center bg-bg p-4">{kart}</div>;
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onKapat}>
      <div onClick={(e) => e.stopPropagation()}>{kart}</div>
    </div>
  );
}