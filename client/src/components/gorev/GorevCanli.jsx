import { useState } from 'react';
import { api } from '../../api.js';
import { DURUM, kodGruplari } from '../../lib/gorev.js';
import { tarihYazi } from '../../lib/tarih.js';
import { Empty } from '../ui/Empty.jsx';

const IPTAL_EDILEBILIR = ['bekliyor', 'kabul', 'kismi'];

// Görevlerin canlı takibi. Her kod bir kez yazılır, renkleri altında alt alta gelir.
export function GorevCanli({ liste }) {
  const [iptalAcik, setIptalAcik] = useState(null);
  const [neden, setNeden] = useState({});
  const [hata, setHata] = useState('');

  const iptalEt = async (g) => {
    setHata('');
    try {
      await api.post(`/api/gorevler/${g.id}/iptal`, { neden: neden[g.id] ?? '' });
      setIptalAcik(null);
    } catch (e) {
      setHata(e.message);
    }
  };

  if (!liste.length) return <Empty text={'Henüz görev yok. "+ Görev ata" ile başlayın.'} />;

  return (
    <div className="space-y-2.5">
      {hata && <p className="rounded-lg bg-warn-soft p-2.5 text-sm text-warn">⚠ {hata}</p>}

      {liste.map((g) => {
        const oran = g.toplamIstenen ? Math.min(100, Math.round((g.toplamGonderilen / g.toplamIstenen) * 100)) : 0;
        const d = DURUM[g.durum] ?? DURUM.bekliyor;
        return (
          <details key={g.id} open={g.durum !== 'tamamlandi'} className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer select-none">
              <span className="font-semibold">{tarihYazi(g.tarih)} · {g.hedefAd}</span>
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${d.renk}`}>{d.yazi}</span>
              <span className="ml-2 text-xs tabular-nums text-muted">
                {g.toplamGonderilen}/{g.toplamIstenen} seri
              </span>
            </summary>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-track">
              <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${oran}%` }} />
            </div>

            <div className="mt-3 space-y-3">
              {kodGruplari(g.kalemler).map((kg) => (
                <div key={kg.kod}>
                  <div className="font-bold">{kg.kod}</div>
                  <div className="mt-1 space-y-1.5 pl-3">
                    {kg.kalemler.map((k) => {
                      const kOran = k.istenen ? Math.min(100, Math.round((k.gonderilen / k.istenen) * 100)) : 0;
                      return (
                        <div key={k.id} className="text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              {k.renk}
                              <span className="ml-1 text-xs text-muted">
                                ({k.kaynakDepo}{k.tur === 'manuel' ? ', elle girildi' : ''})
                              </span>
                            </span>
                            <span className="tabular-nums text-xs text-muted">{k.gonderilen}/{k.istenen} seri</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
                            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${kOran}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {(g.durum === 'reddedildi' || g.durum === 'iptal') && (
              <p className="mt-2 text-sm text-warn">
                {g.durum === 'iptal' ? 'İptal nedeni' : 'Red nedeni'}: {g.redNedeni}
              </p>
            )}
            {g.not && <p className="mt-2 text-xs text-muted">Not: {g.not}</p>}

            {IPTAL_EDILEBILIR.includes(g.durum) && (
              iptalAcik === g.id ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    className="inp flex-1"
                    placeholder="İptal nedeni"
                    value={neden[g.id] ?? ''}
                    onChange={(e) => setNeden((n) => ({ ...n, [g.id]: e.target.value }))}
                  />
                  <button className="btn btn-sm" onClick={() => iptalEt(g)}>İptali onayla</button>
                  <button className="btn-ghost btn-sm" onClick={() => setIptalAcik(null)}>Vazgeç</button>
                </div>
              ) : (
                <div className="mt-3 text-right">
                  <button className="btn-ghost btn-sm" onClick={() => setIptalAcik(g.id)}>Görevi iptal et</button>
                </div>
              )
            )}
          </details>
        );
      })}
    </div>
  );
}