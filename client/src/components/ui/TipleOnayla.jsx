import { useState } from 'react';

// Geri alınamayan toplu işlemler için: kullanıcı, beklenen metni kendi eliyle yazmadan işlem açılmaz
export function TipleOnayla({ baslik, metin, beklenen, onOnay, onIptal }) {
  const [deger, setDeger] = useState('');
  const hazir = deger.trim().toLowerCase() === beklenen.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onIptal}>
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 font-semibold">{baslik}</h3>
        <div className="mb-3 whitespace-pre-line text-sm text-muted">{metin}</div>
        <p className="mb-2 text-sm">Onaylamak için <b>{beklenen}</b> yazın:</p>
        <input className="inp" value={deger} onChange={(e) => setDeger(e.target.value)} autoFocus />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onIptal}>Vazgeç</button>
          <button
            className="rounded-xl bg-danger px-4 py-2 text-white disabled:opacity-40"
            disabled={!hazir}
            onClick={onOnay}
          >
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}