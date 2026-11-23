import { ConfirmButton } from '../../Confirm.jsx';
import { fmt } from '../../lib/format.js';

// Yedek alma, yedekten yükleme ve son işlemi geri alma (yalnızca yönetici)
export function YedekPanel({ yedekler, geriAl, onYedekAl, onGeriYukle, onGeriAl }) {
  const son = yedekler[0];
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-xl bg-bg p-3">
        <div className="text-xs text-muted">Son yedek</div>
        <div className="font-medium">{son ? fmt(son.tarih) : 'Henüz yedek yok'}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button className="btn btn-sm" onClick={onYedekAl}>Şimdi yedek al</button>
          {son && (
            <ConfirmButton
              label="Son yedekten yükle"
              question="Mevcut veriler yedekle değişsin mi?"
              onConfirm={onGeriYukle}
              className="btn-ghost btn-sm"
            />
          )}
        </div>
      </div>

      <div className="rounded-xl bg-bg p-3">
        <div className="text-xs text-muted">Geri alınabilecek son işlem</div>
        <div className="font-medium">{geriAl ? geriAl.aciklama : 'Yok'}</div>
        {geriAl && (
          <div className="mt-2">
            <ConfirmButton
              label="Son işlemi geri al"
              question="Geri alınsın mı?"
              onConfirm={onGeriAl}
              className="btn-ghost btn-sm"
            />
          </div>
        )}
      </div>

      {yedekler.length > 0 && (
        <details>
          <summary className="cursor-pointer text-xs text-muted">Yedek listesi ({yedekler.length})</summary>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
            {yedekler.map((y) => <li key={y.ad} className="truncate">{y.ad}</li>)}
          </ul>
          <p className="mt-2 text-xs text-muted">Yedekler proje klasöründe: server/yedekler</p>
        </details>
      )}
    </div>
  );
}