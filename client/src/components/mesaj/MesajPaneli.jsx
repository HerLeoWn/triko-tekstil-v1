import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { fmt } from '../../lib/format.js';
import { ROL_ADI } from '../../lib/roller.js';

const etiket = (m, kullanici) => {
  if (m.tur === 'giden') return 'Giden bildirimi · Muhasebe';
  if (m.alici_id) return m.alici_id === kullanici.id ? 'Sana özel' : 'Özel mesaj';
  return 'Herkese';
};

// Mesaj paneli: herkese ya da tek kişiye mesaj, giden bildirimleri.
// Panel açıkken görünen mesajlar okunmuş sayılır.
export function MesajPaneli({ kullanici, liste, yenile, onKapat, onGunSec }) {
  const [icerik, setIcerik] = useState('');
  const [alici, setAlici] = useState('');
  const [alicilar, setAlicilar] = useState([]);
  const [hata, setHata] = useState('');
  const [yuk, setYuk] = useState(false);

  useEffect(() => {
    api.get('/api/mesaj-alicilar').then(setAlicilar).catch(() => {});
  }, []);

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onKapat(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onKapat]);

  // Liste uzadığında (yeni mesaj geldiğinde) panel açık olduğu için hepsini okundu işaretle
  useEffect(() => {
    api.post('/api/mesajlar/hepsini-okundu').then(() => yenile()).catch(() => {});
  }, [liste.length, yenile]);

  const gonder = async () => {
    const t = icerik.trim();
    if (!t) return setHata('Mesaj yazın.');
    setYuk(true);
    setHata('');
    try {
      await api.post('/api/mesajlar', { icerik: t, aliciId: alici || null });
      setIcerik('');
      yenile();
    } catch (e) {
      setHata(e.message);
    } finally {
      setYuk(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-line bg-white shadow-lift">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-semibold">Mesajlar</span>
        <button className="btn-ghost btn-sm" onClick={onKapat}>Kapat</button>
      </div>

      <div className="border-b border-line p-4">
        <select className="inp mb-2 w-auto" value={alici} onChange={(e) => setAlici(e.target.value)}>
          <option value="">Herkese</option>
          {alicilar.map((a) => (
            <option key={a.id} value={a.id}>{a.ad} ({ROL_ADI[a.rol]})</option>
          ))}
        </select>
        <textarea
          className="inp min-h-[72px] w-full"
          maxLength={500}
          placeholder="Mesajınızı yazın… (Ctrl+Enter gönderir)"
          value={icerik}
          onChange={(e) => setIcerik(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) gonder(); }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted">{icerik.length}/500</span>
          <button className="btn btn-sm" onClick={gonder} disabled={yuk}>Gönder</button>
        </div>
        {hata && <p className="mt-2 text-sm text-warn">⚠ {hata}</p>}
      </div>

      <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {liste.length === 0 && <p className="text-sm text-muted">Henüz mesaj yok.</p>}
        {liste.map((m) => {
          const bildirim = m.tur === 'giden';
          const tiklanir = bildirim && !!onGunSec;
          return (
            <div
              key={m.id}
              onClick={tiklanir ? () => onGunSec(m.ref_gun) : undefined}
              className={`rounded-xl border p-3 text-sm ${
                m.okundu ? 'border-line' : 'border-accent/40 bg-accent-soft/50'
              } ${tiklanir ? 'cursor-pointer hover:border-accent' : ''}`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="font-medium text-ink">
                  {bildirim ? 'Giden bildirimi' : (m.benim ? 'Sen' : m.gonderen_ad)}
                </span>
                <span>{fmt(m.tarih)}</span>
              </div>
              <p className="mt-1 whitespace-pre-line">{m.icerik}</p>
              <div className="mt-1 text-[11px] text-muted">
                {etiket(m, kullanici)}{tiklanir ? ' · açmak için tıklayın' : ''}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}