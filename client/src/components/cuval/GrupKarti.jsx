import { useState } from 'react';
import { ConfirmButton } from '../../Confirm.jsx';
import { fmt } from '../../lib/format.js';
import { TopluDuzeltForm } from './TopluDuzeltForm.jsx';

// Aynı içerikli çuvalların açılır kartı: çuval listesi, düzenle, aç/kapat, sil, toplu düzelt
export function GrupKarti({ grup, depolar, onEdit, onToggle, onDelete, onTopluDuzelt }) {
  const [acik, setAcik] = useState(false);
  const [topluAcik, setTopluAcik] = useState(false);

  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setAcik((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left transition hover:bg-bg"
      >
        <div className="min-w-0">
          <div className="font-semibold">
            {grup.kod}
            {grup.ad && <span className="ml-2 font-normal text-muted">{grup.ad}</span>}
          </div>
          <div className="truncate text-sm">{grup.etiket}</div>
        </div>
        <div className="shrink-0 text-right text-sm">
          <div className="font-semibold tabular-nums">{grup.adet} çuval · {grup.seri} seri</div>
          <div className="text-xs text-muted">{acik ? 'Kapat ▴' : 'Aç ▾'}</div>
        </div>
      </button>

      {acik && (
        <div className="animate-fadeUp border-t border-line p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted">{grup.cuvalIci}'li çuvallar</span>
            <button className="btn-ghost btn-sm" onClick={() => setTopluAcik(true)}>
              Toplu düzelt
            </button>
          </div>

          <div className="divide-y divide-line">
            {grup.cuvallar.map((c, i) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div className="min-w-0">
                  <div className="text-xs text-muted">
                    {i + 1}. çuval · {c.seri} seri
                    {c.eksik > 0 && <span className="text-warn"> · ⚠ {c.eksik} eksik</span>}
                  </div>
                  <div className="text-xs text-muted">{fmt(c.guncelleme)}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${c.durum === 'acik' ? 'bg-accent-soft text-accent' : 'bg-track text-muted'}`}>
                    {c.durum === 'acik' ? 'Açık' : 'Kapalı'}
                  </span>
                  <button className="btn-ghost btn-sm" onClick={() => onEdit(c)}>Düzenle</button>
                  <button className="btn-ghost btn-sm" onClick={() => onToggle(c)}>
                    {c.durum === 'acik' ? 'Kapat' : 'Aç'}
                  </button>
                  <ConfirmButton question="Silinsin mi?" onConfirm={() => onDelete(c)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topluAcik && (
        <TopluDuzeltForm
          grup={grup}
          depolar={depolar}
          onClose={() => setTopluAcik(false)}
          onSave={(payload) => {
            onTopluDuzelt(payload);
            setTopluAcik(false);
          }}
        />
      )}
    </div>
  );
}