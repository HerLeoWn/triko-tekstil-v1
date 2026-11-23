import { ROL_ADI } from '../../lib/roller.js';

// Üst çubuk: başlık, canlı bağlantı durumu, raporlar, mesajlar, yeni kayıt butonları ve kullanıcı
export default function Baslik({
  kullanici, canli, okuma, onRapor, onOzet, onYeniCuval, onYeniGiden, onMesaj, mesajSayi = 0, onCikis,
}) {
  const bugun = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-accent to-accent-hover text-white shadow-soft">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight">Triko Çuval Takibi</h1>
            <span
              title={canli ? 'Canlı bağlantı açık' : 'Bağlantı kesik, yeniden deneniyor'}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${canli ? 'bg-white/20' : 'bg-warn/80'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${canli ? 'bg-green-300' : 'bg-white'}`} />
              {canli ? 'Canlı' : 'Kesik'}
            </span>
          </div>
          <p className="text-xs text-white/70">{bugun}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn bg-white/15 shadow-none hover:bg-white/25" onClick={onRapor}>
            Gün sonu raporu
          </button>
          <button className="btn bg-white/15 shadow-none hover:bg-white/25" onClick={onOzet}>
            Depo özeti
          </button>
          <button className="btn bg-white/15 shadow-none hover:bg-white/25" onClick={onMesaj}>
            Mesajlar
            {mesajSayi > 0 && (
              <span className="ml-1.5 rounded-full bg-warn px-1.5 text-[11px] text-white">{mesajSayi}</span>
            )}
          </button>
          {!okuma && (
            <>
              <button className="btn bg-white/15 shadow-none hover:bg-white/25" onClick={onYeniCuval}>
                + Yeni çuval
              </button>
              <button className="btn bg-white/15 shadow-none hover:bg-white/25" onClick={onYeniGiden}>
                + Giden mal
              </button>
            </>
          )}
          <div className="ml-1 flex items-center gap-2 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs">
            <span className="font-medium">{kullanici.ad}</span>
            <span className="text-white/70">{ROL_ADI[kullanici.rol]}</span>
            <button className="underline underline-offset-2 hover:text-white/80" onClick={onCikis}>
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}