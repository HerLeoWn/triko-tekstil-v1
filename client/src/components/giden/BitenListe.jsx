import { useState } from 'react';
import { swatch } from '../../renk.js';
import { fmt } from '../../lib/format.js';
import { api } from '../../api.js';
import { Cards } from '../ui/Cards.jsx';
import { Empty } from '../ui/Empty.jsx';
import { TipleOnayla } from '../ui/TipleOnayla.jsx';

// Bitenler: stoğu sıfırlanan renkler, ürün grubuna göre. Her rengin sevk kayıtları düzenlenebilir.
export function BitenListe({ groups, onDeleteGroup, onEdit }) {
  const [acikAnahtar, setAcikAnahtar] = useState(null); // "kod|renk"
  const [sevkler, setSevkler] = useState({});           // { "kod|renk": [sevk kayıtları] }
  const [hata, setHata] = useState('');
  const [silinecek, setSilinecek] = useState(null);

  if (!groups.length) return <Empty text="Bitmiş ürün yok. Stoğu sıfırlanan renkler burada görünür." />;
  const items = groups.flatMap((g) => g.items);
  const totalSeri = items.reduce((s, p) => s + p.seri, 0);

  const sevkAc = (g, p) => {
    const anahtar = `${g.kod}|${p.renk}`;
    if (acikAnahtar === anahtar) {
      setAcikAnahtar(null);
      return;
    }
    setAcikAnahtar(anahtar);
    setHata('');
    api.get(`/api/giden?q=${encodeURIComponent(g.kod)}`)
      .then((rows) => {
        const eslesen = rows.filter((r) =>
          r.kod.toLowerCase() === g.kod.toLowerCase() &&
          r.renk.toLowerCase() === p.renk.toLowerCase());
        setSevkler((s) => ({ ...s, [anahtar]: eslesen }));
      })
      .catch((e) => setHata(e.message));
  };

  return (
    <>
      <Cards items={[
        ['Biten renk', items.length],
        ['Ürün grubu', groups.length],
        ['Toplam giden seri', totalSeri],
      ]} />
      {groups.map((g) => (
        <details key={g.kod} open className="card mb-3 p-4">
          <summary className="cursor-pointer select-none py-1 text-[15px]">
            <b>{g.kod}</b> <span className="text-sm text-muted">{g.items.length} renk bitti</span>
          </summary>
          <div className="mt-3 space-y-2">
            {g.items.map((p) => {
              const sw = swatch(p.renk);
              const anahtar = `${g.kod}|${p.renk}`;
              const acik = acikAnahtar === anahtar;
              return (
                <div key={p.renk} className="rounded-xl p-3 text-sm" style={{ background: sw.bg, color: sw.fg }}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                    <span className="col-span-2 font-semibold sm:col-span-1">{p.renk}</span>
                    <span className="opacity-90">{p.cuval} çuval</span>
                    <span className="tabular-nums opacity-90">{p.seri} seri</span>
                    <span className="text-xs opacity-80">{fmt(p.son)}</span>
                  </div>

                  <div className="mt-2 text-right">
                    <button className="btn-ghost btn-sm" onClick={() => sevkAc(g, p)}>
                      {acik ? 'Sevkleri gizle' : 'Sevkleri düzenle'}
                    </button>
                  </div>

                  {acik && (
                    <div className="mt-2 rounded-lg bg-white p-2 text-ink">
                      {!sevkler[anahtar] ? (
                        <p className="p-2 text-sm text-muted">Yükleniyor…</p>
                      ) : sevkler[anahtar].length === 0 ? (
                        <p className="p-2 text-sm text-muted">Bu renge ait sevk kaydı yok.</p>
                      ) : (
                        sevkler[anahtar].map((r) => (
                          <div key={r.id} className="flex items-center justify-between gap-2 border-b border-line py-2 last:border-0">
                            <div>
                              <div className="font-medium tabular-nums">{r.seri} seri · {r.cuvalAdedi} çuval</div>
                              <div className="text-xs text-muted">{fmt(r.tarih)}</div>
                            </div>
                            {onEdit && (
                              <button className="btn-ghost btn-sm" onClick={() => onEdit(r)}>Düzenle</button>
                            )}
                          </div>
                        ))
                      )}
                      {hata && <p className="mt-2 text-sm text-warn">⚠ {hata}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-right">
            <button className="btn-ghost btn-sm text-danger" onClick={() => setSilinecek(g)}>
              Bu ürün grubunu komple sil
            </button>
          </div>
        </details>
      ))}

      {silinecek && (
        <TipleOnayla
          baslik="Ürün grubu silinsin mi?"
          metin={`${silinecek.kod} ürün grubunun ${silinecek.items.length} biten renk kaydı ve çuval kayıtları silinecek.\nSevk geçmişi (giden mallar) korunur.`}
          beklenen={silinecek.kod}
          onOnay={() => { onDeleteGroup(silinecek.kod); setSilinecek(null); }}
          onIptal={() => setSilinecek(null)}
        />
      )}
    </>
  );
}