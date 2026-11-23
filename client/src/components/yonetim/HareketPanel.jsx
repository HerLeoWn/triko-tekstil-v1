import { ConfirmButton } from '../../Confirm.jsx';
import { fmt } from '../../lib/format.js';

// Son işlemler listesi (kenar çubuğu). Tümünü temizle butonu yönetici için.
export function HareketPanel({ rows, onClear }) {
  return (
    <>
      <div className="mb-3 flex justify-end">
        {rows.length > 0 && (
          <ConfirmButton label="Tümünü temizle" question="Tüm hareketler silinsin mi?" onConfirm={onClear} />
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Henüz hareket yok.</p>
      ) : (
        <ul className="max-h-[60vh] overflow-y-auto pr-1 text-[13px]">
          {rows.map((h) => (
            <li key={h.id} className="border-b border-line py-2.5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">{h.tur}</span>
                <b className="truncate">{h.kod} {h.renk}</b>
              </div>
              <div className="mt-1 text-muted">{h.aciklama}</div>
              <div className="mt-0.5 text-xs text-muted">
                {fmt(h.tarih)}
                {h.kullanici && <span className="ml-2 font-medium text-accent">{h.kullanici}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}