import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { fmt } from '../../lib/format.js';
import { csvIndir } from '../../lib/csv.js';
import { Cards } from '../ui/Cards.jsx';
import { Bolum } from '../ui/Bolum.jsx';
import { Tablo } from '../ui/Tablo.jsx';

const bugunYerel = () => new Date().toLocaleDateString('sv-SE');

// Gün sonu raporu: seçilen günün girilen çuvalları, giden malları ve anlık stoku
export function RaporModal({ onClose }) {
  const [tarih, setTarih] = useState(bugunYerel());
  const [r, setR] = useState(null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  useEffect(() => {
    setR(null);
    setHata('');
    api.get(`/api/rapor?tarih=${tarih}`).then(setR).catch((e) => setHata(e.message));
  }, [tarih]);

  return (
    <div
      className="print-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/35 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="print-area flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-lift sm:max-w-3xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 print:hidden">
          <span className="font-semibold">Gün sonu raporu</span>
          <input
            type="date"
            className="inp w-auto"
            value={tarih}
            onChange={(e) => e.target.value && setTarih(e.target.value)}
          />
        </div>

        <div className="overflow-auto p-4">
          <h2 className="mb-4 text-lg font-semibold">Gün sonu raporu · {tarih}</h2>

          {hata && <p className="text-sm text-warn">⚠ {hata}</p>}
          {!r && !hata && <p className="text-sm text-muted">Yükleniyor…</p>}

          {r && (
            <>
              <Cards items={[
                ['Girilen seri', r.toplam.girilenSeri],
                ['Giden seri', r.toplam.gidenSeri],
                ['Anlık stok', r.toplam.kalanSeri],
              ]} />

              <Bolum baslik="Girilen çuvallar">
                <Tablo
                  basliklar={['Saat', 'Kod', 'İçerik', 'Çuval içi', 'Seri']}
                  satirlar={r.girilen.map((c) => [fmt(c.saat), c.kod, c.etiket, c.cuvalIci, c.seri])}
                  bos="Bu gün çuval girilmedi."
                />
              </Bolum>

              <Bolum baslik="Giden mallar">
                <Tablo
                  basliklar={['Saat', 'Kod', 'Renk', 'Çuval', 'Seri']}
                  satirlar={r.giden.map((g) => [fmt(g.saat), g.kod, g.renk, g.ozet, g.seri])}
                  bos="Bu gün giden mal yok."
                />
              </Bolum>

              <Bolum baslik="Anlık stok">
                <Tablo
                  basliklar={['Kod', 'Renk', 'Seri']}
                  satirlar={r.kalan.map((k) => [k.kod, k.renk, k.seri])}
                  bos="Stokta ürün yok."
                />
              </Bolum>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-4 py-3 print:hidden">
          <button className="btn-ghost" onClick={() => csvIndir(r)} disabled={!r}>CSV indir</button>
          <button className="btn-ghost" onClick={() => window.print()} disabled={!r}>Yazdır</button>
          <button className="btn" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}