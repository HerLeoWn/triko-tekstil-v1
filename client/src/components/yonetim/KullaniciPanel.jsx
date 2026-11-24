import { useState } from 'react';
import { api } from '../../api.js';
import { ConfirmButton } from '../../Confirm.jsx';
import { ROL_ADI, ROL_ACIKLAMA } from '../../lib/roller.js';

// Kullanıcı listesi: ad/kullanıcı adı düzenleme, rol/aktif, şifre, yeni kullanıcı ekleme (yalnızca yönetici)
export function KullaniciPanel({ liste, benimId, yenile }) {
  const [f, setF] = useState({ ad: '', kullanici: '', sifre: '', rol: 'calisan' });
  const [hata, setHata] = useState('');
  const [sifreAcik, setSifreAcik] = useState(null);
  const [yeniSifre, setYeniSifre] = useState('');
  const [duzenleAcik, setDuzenleAcik] = useState(null);
  const [duzenle, setDuzenle] = useState({ ad: '', kullanici: '' });

  const islem = async (fn) => {
    setHata('');
    try {
      await fn();
      yenile();
    } catch (e) {
      setHata(e.message);
    }
  };

  const ekle = () => islem(async () => {
    await api.post('/api/kullanicilar', f);
    setF({ ad: '', kullanici: '', sifre: '', rol: 'calisan' });
  });

  const guncelle = (id, patch) => islem(() => api.put(`/api/kullanicilar/${id}`, patch));
  const sil = (id) => islem(() => api.del(`/api/kullanicilar/${id}`));

  const duzenleAc = (u) => {
    setDuzenleAcik(u.id);
    setDuzenle({ ad: u.ad, kullanici: u.kullanici });
    setSifreAcik(null);
  };

  const duzenleKaydet = async (id) => {
    await guncelle(id, { ad: duzenle.ad, kullanici: duzenle.kullanici });
    setDuzenleAcik(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-2 text-sm font-semibold">Kullanıcılar</h4>
        <div className="space-y-2">
          {liste.map((u) => (
            <div key={u.id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    {u.ad} {u.id === benimId && <span className="text-xs font-normal text-muted">(sen)</span>}
                  </div>
                  <div className="text-xs text-muted">{u.kullanici}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    className="inp w-auto"
                    value={u.rol}
                    onChange={(e) => guncelle(u.id, { rol: e.target.value })}
                  >
                    {Object.entries(ROL_ADI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button
                    className={u.aktif ? 'pill-on' : 'pill-off'}
                    onClick={() => guncelle(u.id, { aktif: !u.aktif })}
                  >
                    {u.aktif ? 'Aktif' : 'Pasif'}
                  </button>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => (duzenleAcik === u.id ? setDuzenleAcik(null) : duzenleAc(u))}
                  >
                    Düzenle
                  </button>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => { setDuzenleAcik(null); setSifreAcik(sifreAcik === u.id ? null : u.id); }}
                  >
                    Şifre
                  </button>
                  {u.id !== benimId && (
                    <ConfirmButton
                      label="Kaldır"
                      question="Silinsin mi?"
                      onConfirm={() => sil(u.id)}
                    />
                  )}
                </div>
              </div>

              {duzenleAcik === u.id && (
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="inp"
                    placeholder="Ad soyad"
                    value={duzenle.ad}
                    onChange={(e) => setDuzenle({ ...duzenle, ad: e.target.value })}
                  />
                  <input
                    className="inp"
                    placeholder="Kullanıcı adı"
                    value={duzenle.kullanici}
                    onChange={(e) => setDuzenle({ ...duzenle, kullanici: e.target.value })}
                  />
                  <button className="btn btn-sm" onClick={() => duzenleKaydet(u.id)}>Kaydet</button>
                  <p className="text-xs text-muted sm:col-span-3">
                    Kullanıcı adı en az 3 karakter olmalı (harf, rakam, _ . -). Değişince yeni adla giriş yapması gerekir.
                  </p>
                </div>
              )}

              {sifreAcik === u.id && (
                <div className="mt-2 flex gap-2">
                  <input
                    className="inp"
                    type="password"
                    placeholder="Yeni şifre (en az 4)"
                    value={yeniSifre}
                    onChange={(e) => setYeniSifre(e.target.value)}
                  />
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      guncelle(u.id, { sifre: yeniSifre });
                      setYeniSifre('');
                      setSifreAcik(null);
                    }}
                  >
                    Kaydet
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-bg p-3">
        <div className="mb-2 text-xs font-medium text-muted">Yeni kullanıcı</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="inp" placeholder="Ad soyad" value={f.ad}
            onChange={(e) => setF({ ...f, ad: e.target.value })} />
          <input className="inp" placeholder="Kullanıcı adı" value={f.kullanici}
            onChange={(e) => setF({ ...f, kullanici: e.target.value })} />
          <input className="inp" type="password" placeholder="Şifre (en az 4)" value={f.sifre}
            onChange={(e) => setF({ ...f, sifre: e.target.value })} />
          <select className="inp" value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value })}>
            {Object.entries(ROL_ADI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <p className="mt-2 text-xs text-muted">{ROL_ACIKLAMA[f.rol]}</p>
        <button className="btn mt-3" onClick={ekle}>Kullanıcı ekle</button>
      </div>

      {hata && <p className="text-sm text-warn">⚠ {hata}</p>}
    </div>
  );
}