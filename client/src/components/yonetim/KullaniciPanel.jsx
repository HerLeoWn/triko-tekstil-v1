import { useState } from 'react';
import { api } from '../../api.js';
import { ConfirmButton } from '../../Confirm.jsx';
import { ROL_ADI, ROL_ACIKLAMA } from '../../lib/roller.js';

// Kullanıcı listesi, rol/aktif/şifre değişikliği, yeni kullanıcı ekleme (yalnızca yönetici)
export function KullaniciPanel({ liste, benimId, yenile }) {
  const [f, setF] = useState({ ad: '', kullanici: '', sifre: '', rol: 'calisan' });
  const [hata, setHata] = useState('');
  const [sifreAcik, setSifreAcik] = useState(null);
  const [yeniSifre, setYeniSifre] = useState('');

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
                    onClick={() => setSifreAcik(sifreAcik === u.id ? null : u.id)}
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