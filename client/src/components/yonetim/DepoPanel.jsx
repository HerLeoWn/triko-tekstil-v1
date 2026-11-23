import { useState } from 'react';
import { api } from '../../api.js';
import { ConfirmButton } from '../../Confirm.jsx';

// Depo adlarını değiştirme, depo ekleme ve silme (yönetici)
export function DepoPanel({ depolar, yenile }) {
  const [yeni, setYeni] = useState('');
  const [adlar, setAdlar] = useState({});
  const [hata, setHata] = useState('');

  const islem = async (fn) => {
    setHata('');
    try {
      await fn();
      yenile();
    } catch (e) {
      setHata(e.message);
    }
  };

  const sirali = [...depolar].sort((a, b) => a.sira - b.sira);

  const adKaydet = (d) => islem(async () => {
    const ad = (adlar[d.id] ?? d.ad).trim();
    if (!ad) throw new Error('Depo adı boş olamaz.');
    await api.put(`/api/depolar/${d.id}`, { ad });
    setAdlar((a) => {
      const rest = { ...a };
      delete rest[d.id];
      return rest;
    });
  });

  const ekle = () => islem(async () => {
    if (!yeni.trim()) throw new Error('Depo adı yazın.');
    await api.post('/api/depolar', { ad: yeni.trim() });
    setYeni('');
  });

  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-1 text-sm font-semibold">Depolar</h4>
        <p className="text-xs text-muted">
          Depo adlarını buradan değiştirebilirsiniz. Silmek için depoda çuval olmamalı.
        </p>
      </div>

      {sirali.map((d) => {
        const degisti = (adlar[d.id] ?? d.ad) !== d.ad;
        return (
          <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5">
            <input
              className="inp min-w-[160px] flex-1"
              value={adlar[d.id] ?? d.ad}
              onChange={(e) => setAdlar({ ...adlar, [d.id]: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter' && degisti) adKaydet(d); }}
            />
            {degisti && (
              <button className="btn-ghost btn-sm" onClick={() => adKaydet(d)}>
                Adını kaydet
              </button>
            )}
            <ConfirmButton
              label="Sil"
              question="Depo silinsin mi?"
              onConfirm={() => islem(() => api.del(`/api/depolar/${d.id}`))}
            />
          </div>
        );
      })}

      <div className="rounded-xl bg-bg p-3">
        <div className="mb-2 text-xs font-medium text-muted">Yeni depo</div>
        <div className="flex gap-2">
          <input
            className="inp"
            placeholder="Örn: Otopark 3"
            value={yeni}
            onChange={(e) => setYeni(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ekle(); }}
          />
          <button className="btn" onClick={ekle}>Ekle</button>
        </div>
      </div>

      {hata && <p className="text-sm text-warn">⚠ {hata}</p>}
    </div>
  );
}