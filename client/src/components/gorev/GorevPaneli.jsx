import { useState } from 'react';
import { api } from '../../api.js';
import { DURUM, kodGruplari } from '../../lib/gorev.js';
import { tarihYazi } from '../../lib/tarih.js';
import { Empty } from '../ui/Empty.jsx';

// Depo sorumlusunun görev paneli: kabul, red ve (kısmi) gönderim. Kodlar gruplu gösterilir.
export function GorevPaneli({ liste, yenile }) {
  const [neden, setNeden] = useState({});
  const [sevk, setSevk] = useState({});
  const [hata, setHata] = useState('');

  const istek = async (yol, body) => {
    setHata('');
    try {
      await api.post(yol, body);
      yenile();
      return true;
    } catch (e) {
      setHata(e.message);
      return false;
    }
  };

  const gonder = async (g) => {
    const satirlar = g.kalemler
      .map((k) => ({ kalemId: k.id, seri: parseInt(sevk[k.id], 10) || 0 }))
      .filter((s) => s.seri > 0);
    if (!satirlar.length) return setHata('Gönderilecek seri girin.');
    if (await istek(`/api/gorevler/${g.id}/gonder`, { satirlar })) {
      setSevk((s) => {
        const yeni = { ...s };
        g.kalemler.forEach((k) => delete yeni[k.id]);
        return yeni;
      });
    }
  };

  if (!liste.length) return <Empty text="Muhasebeden gelen görev yok." />;

  return (
    <div className="space-y-3">
      {hata && <p className="rounded-lg bg-warn-soft p-2.5 text-sm text-warn">⚠ {hata}</p>}

      {liste.map((g) => {
        const d = DURUM[g.durum] ?? DURUM.bekliyor;
        const gonderilebilir = g.durum === 'kabul' || g.durum === 'kismi';
        return (
          <div key={g.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{tarihYazi(g.tarih)} · {g.hedefAd}{g.dis ? ' (dış yer)' : ''}</div>
                <div className="text-xs text-muted">
                  {g.olusturanAd} tarafından atandı · {g.toplamGonderilen}/{g.toplamIstenen} seri
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs ${d.renk}`}>{d.yazi}</span>
            </div>

            <div className="mt-3 space-y-3">
              {kodGruplari(g.kalemler).map((kg) => (
                <div key={kg.kod}>
                  <div className="font-bold">{kg.kod}</div>
                  <div className="mt-1 divide-y divide-line pl-3">
                    {kg.kalemler.map((k) => {
                      const kalan = k.istenen - k.gonderilen;
                      return (
                        <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                          <div>
                            {k.renk}
                            <span className="ml-1 text-xs text-muted">
                              ({k.kaynakDepo}{k.tur === 'manuel' ? ', elle girildi' : ''})
                            </span>
                            <div className="text-xs tabular-nums text-muted">
                              İstenen {k.istenen} · Gönderilen {k.gonderilen} · Kalan {kalan}
                            </div>
                          </div>
                          {gonderilebilir && kalan > 0 && (
                            <input
                              className="inp w-28"
                              type="number"
                              min="1"
                              max={kalan}
                              placeholder={`En fazla ${kalan}`}
                              value={sevk[k.id] ?? ''}
                              onChange={(e) => setSevk((s) => ({ ...s, [k.id]: e.target.value }))}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {g.not && <p className="mt-2 text-xs text-muted">Not: {g.not}</p>}
            {(g.durum === 'reddedildi' || g.durum === 'iptal') && (
              <p className="mt-2 text-sm text-warn">
                {g.durum === 'iptal' ? 'İptal nedeni' : 'Neden'}: {g.redNedeni}
              </p>
            )}

            {g.durum === 'bekliyor' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn btn-sm" onClick={() => istek(`/api/gorevler/${g.id}/kabul`)}>
                  Görevi kabul et
                </button>
                <input
                  className="inp flex-1"
                  placeholder="Reddetme nedeni"
                  value={neden[g.id] ?? ''}
                  onChange={(e) => setNeden((n) => ({ ...n, [g.id]: e.target.value }))}
                />
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => istek(`/api/gorevler/${g.id}/reddet`, { neden: neden[g.id] ?? '' })}
                >
                  Reddet
                </button>
              </div>
            )}

            {gonderilebilir && (
              <div className="mt-3 text-right">
                <button className="btn btn-sm" onClick={() => gonder(g)}>Depoya gönder</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}