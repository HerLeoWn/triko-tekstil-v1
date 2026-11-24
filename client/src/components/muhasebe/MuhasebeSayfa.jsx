import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { gunOzeti, gunPngIndir } from '../../lib/gunFis.js';
import { gunAnahtari, tarihYazi, saatYazi } from '../../lib/tarih.js';
import { ROL_ADI } from '../../lib/roller.js';
import { useGorevler } from '../../hooks/useGorevler.js';
import { GidenEditForm } from '../giden/GidenEditForm.jsx';
import { MesajPaneli } from '../mesaj/MesajPaneli.jsx';
import { GorevCanli } from '../gorev/GorevCanli.jsx';
import { GorevFormu } from '../gorev/GorevFormu.jsx';
import { Empty } from '../ui/Empty.jsx';
import { StokCanli } from './StokCanli.jsx';
import { GelenMallarPaneli } from '../gelen/GelenMallarPaneli.jsx';

const kodSirala = (a, b) => a.localeCompare(b, 'tr', { numeric: true });

// Muhasebe ekranı: görev atama ve canlı takip, giden günleri, günlük PNG, giden düzenleme, mesajlar
export function MuhasebeSayfa({ kullanici, onCikis, liste, okunmamis, yenile }) {
  const [rows, setRows] = useState([]);
  const [secilenGun, setSecilenGun] = useState(null);
  const [mesajAcik, setMesajAcik] = useState(false);
  const [gorevAcik, setGorevAcik] = useState(false);
  const [duzenle, setDuzenle] = useState(null);
  const [hata, setHata] = useState('');
  const gorev = useGorevler();

  // Giden kayıtları 5 saniyede bir yenilenir (canlı seri takibi)
  const yukle = useCallback(() => {
    api.get('/api/giden').then(setRows).catch((e) => setHata(e.message));
  }, []);

  useEffect(() => {
    yukle();
    const t = setInterval(yukle, 5000);
    return () => clearInterval(t);
  }, [yukle]);

  // Günlere göre gruplu giden kayıtları, en yeni gün başta
  const gunler = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const key = gunAnahtari(r.tarih);
      if (!map.has(key)) map.set(key, { key, tarih: r.tarih, rows: [] });
      map.get(key).rows.push(r);
    });
    return [...map.values()]
      .map((g) => ({
        ...g,
        kodlar: [...new Set(g.rows.map((r) => r.kod))].sort(kodSirala),
        seri: g.rows.reduce((s, r) => s + r.seri, 0),
        cuval: g.rows.reduce((s, r) => s + r.cuvalAdedi, 0),
      }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [rows]);

  const aktif = gunler.find((g) => g.key === secilenGun) ?? gunler[0] ?? null;
  const aktifOzet = aktif ? gunOzeti(aktif.rows) : null;

  const duzenleKaydet = async (v) => {
    try {
      await api.put(`/api/giden/${duzenle.id}`, v);
      setHata('');
      yukle();
    } catch (e) {
      setHata(e.message);
    } finally {
      setDuzenle(null);
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-40 bg-gradient-to-r from-accent to-accent-hover text-white shadow-soft">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Muhasebe</h1>
            <p className="text-xs text-white/70">Görevler, giden mallar ve bildirimler</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn bg-white/15 shadow-none hover:bg-white/25" onClick={() => setMesajAcik(true)}>
              Mesajlar
              {okunmamis > 0 && (
                <span className="ml-1.5 rounded-full bg-warn px-1.5 text-[11px] text-white">{okunmamis}</span>
              )}
            </button>
            <div className="ml-1 flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs">
              <span className="font-medium">{kullanici.ad}</span>
              <span className="text-white/70">{ROL_ADI[kullanici.rol]}</span>
              <button className="underline underline-offset-2 hover:text-white/80" onClick={onCikis}>Çıkış</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6">
        <section className="card p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Stok · canlı</h2>
          <StokCanli />
        </section>
        <section className="card p-4">
          <GelenMallarPaneli />
        </section>

        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted">Görevler · canlı takip</h2>
            <button className="btn btn-sm" onClick={() => setGorevAcik(true)}>+ Görev ata</button>
          </div>
          <GorevCanli liste={gorev.liste} />
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Giden günleri</h2>
          {gunler.length === 0 ? (
            <Empty text="Henüz giden mal yok." />
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {gunler.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setSecilenGun(g.key)}
                  className={`rounded-xl border p-3.5 text-left transition hover:-translate-y-px ${
                    aktif?.key === g.key ? 'border-accent bg-accent-soft' : 'border-line bg-white hover:border-accent'
                  }`}
                >
                  <div className="text-xs text-muted">{tarihYazi(g.tarih)}</div>
                  <div className="mt-1 font-semibold">
                    {g.kodlar.join(', ')} <span className="font-normal">gitti</span>
                  </div>
                  <div className="mt-1 text-xs tabular-nums text-muted">{g.cuval} çuval · {g.seri} seri</div>
                </button>
              ))}
            </div>
          )}
        </section>

        {aktif && aktifOzet && (
          <section className="card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">
                {tarihYazi(aktif.tarih)} · {aktifOzet.toplamSeri} seri gitti
              </h2>
              <button className="btn btn-sm" onClick={() => gunPngIndir(aktif.rows, aktif.tarih)}>
                Günü PNG indir
              </button>
            </div>

            <div className="space-y-3">
              {aktifOzet.modeller.map((m) => (
                <div key={m.kod} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex items-baseline justify-between">
                    <b>{m.kod}</b>
                    <span className="text-xs tabular-nums text-muted">{m.toplam} seri</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {m.satirlar.map((s) => (
                      <span key={s.renk} className="rounded-full px-2.5 py-1 text-xs" style={{ background: s.bg, color: s.fg }}>
                        {s.renk} <b className="tabular-nums">{s.seri}</b>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-[11px] font-medium uppercase tracking-wide text-muted">Giden kayıtları</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                    {['Saat', 'Kod', 'Renk', 'Çuval', 'Seri', 'Depo', ''].map((h) => (
                      <th key={h} className="border-b border-line px-2 py-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aktif.rows.map((r) => (
                    <tr key={r.id} className="border-b border-line">
                      <td className="px-2 py-2 text-xs text-muted">{saatYazi(r.tarih)}</td>
                      <td className="px-2 py-2 font-semibold">{r.kod}</td>
                      <td className="px-2 py-2">{r.renk}</td>
                      <td className="px-2 py-2 tabular-nums">{r.cuvalAdedi}</td>
                      <td className="px-2 py-2 tabular-nums">{r.seri}</td>
                      <td className="px-2 py-2 text-muted">{r.depo}</td>
                      <td className="px-2 py-2 text-right">
                        <button className="btn-ghost btn-sm" onClick={() => setDuzenle(r)}>Düzenle</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {duzenle && (
        <GidenEditForm item={duzenle} onSave={duzenleKaydet} onClose={() => setDuzenle(null)} />
      )}

      {gorevAcik && (
        <GorevFormu
          onKapat={() => setGorevAcik(false)}
          onKaydet={() => { setGorevAcik(false); gorev.yenile(); }}
        />
      )}

      {mesajAcik && (
        <MesajPaneli
          kullanici={kullanici}
          liste={liste}
          yenile={yenile}
          onKapat={() => setMesajAcik(false)}
          onGunSec={(gun) => { setSecilenGun(gun); setMesajAcik(false); }}
        />
      )}
    </div>
  );
}