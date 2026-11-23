import { HareketPanel, YedekPanel } from '../../Pages.jsx';

// Sağ kenar çubuğu: son hareketler ve (yönetici için) yedek paneli
export default function YanPanel({ data, yonetici, logTemizle, onYedekAl, onGeriYukle, onGeriAl }) {
  return (
    <aside className="card h-fit space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <section>
        <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Son hareketler</h3>
        <HareketPanel rows={data.hareket} onClear={logTemizle} />
      </section>
      {yonetici && (
        <section>
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted">Yedek ve geri al</h3>
          <YedekPanel
            yedekler={data.yedekler}
            geriAl={data.geriAl}
            onYedekAl={onYedekAl}
            onGeriYukle={onGeriYukle}
            onGeriAl={onGeriAl}
          />
        </section>
      )}
    </aside>
  );
}
