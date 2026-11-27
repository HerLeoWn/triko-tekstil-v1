import { useEffect, useRef, useState } from 'react';
import { CuvalForm, GidenForm, GidenEditForm } from '../Forms.jsx';
import { RaporModal, OzetModal } from '../Faz3.jsx';
import { MobilAlt } from '../Faz4.jsx';
import { UrunDuzenleForm } from '../Faz5.jsx';
import { YetkiContext } from '../Confirm.jsx';
import { useTriko } from '../hooks/useTriko.js';
import { useIslemler } from '../hooks/useIslemler.js';
import { useMesajlar } from '../hooks/useMesajlar.js';
import { useGorevler } from '../hooks/useGorevler.js';
import { get } from '../lib/istek.js';
import { bildirimleriAc, pushDestekli } from '../lib/bildirim.js';
import { useToastlar, ToastKapsul } from '../components/ui/Toast.jsx';
import Baslik from '../components/layout/Baslik.jsx';
import { SekmeMenu } from '../components/layout/SekmeMenu.jsx';
import YanPanel from '../components/layout/YanPanel.jsx';
import { MesajPaneli } from '../components/mesaj/MesajPaneli.jsx';
import { MuhasebeSayfa } from '../components/muhasebe/MuhasebeSayfa.jsx';
import { GorevPaneli } from '../components/gorev/GorevPaneli.jsx';
import { FasonculSayfa } from '../components/fasoncu/FasonculSayfa.jsx';
import { GelenMallarPaneli } from '../components/gelen/GelenMallarPaneli.jsx';
import { FasonHareketleriYonetici } from '../components/fasoncu/FasonHareketleri.jsx';
import SekmeIcerik from './SekmeIcerik.jsx';

const ayarOku = (key, varsayilan) => {
  const v = Number(localStorage.getItem(key));
  return v > 0 ? v : varsayilan;
};

// Rol bazlı giriş: fasoncu ve muhasebe kendi ekranını kullanır, depo sorumlusu ana ekranı görür
export default function Uygulama({ kullanici, onCikis }) {
  if (kullanici.rol === 'fasoncu') {
    return <FasonculSayfa kullanici={kullanici} onCikis={onCikis} />;
  }
  if (kullanici.rol === 'muhasebe') {
    return <MuhasebeKapi kullanici={kullanici} onCikis={onCikis} />;
  }
  return <YoneticiEkrani kullanici={kullanici} onCikis={onCikis} />;
}

// Muhasebe ekranına mesaj verisini bağlar
function MuhasebeKapi({ kullanici, onCikis }) {
  const { liste, okunmamis, yenile } = useMesajlar();
  return (
    <MuhasebeSayfa
      kullanici={kullanici}
      onCikis={onCikis}
      liste={liste}
      okunmamis={okunmamis}
      yenile={yenile}
    />
  );
}

// Bekleyen fason hareketlerini 10 saniyede bir sayar, yeni gelince titretir
function useBekleyenHareket() {
  const [sayi, setSayi] = useState(0);
  const sonSayi = useRef(0);

  useEffect(() => {
    let iptal = false;
    const cek = async () => {
      try {
        const satirlar = await get('/api/fason-islemler');
        if (iptal || !Array.isArray(satirlar)) return;
        const n = satirlar.filter((s) => s.durum === 'bekliyor').length;
        if (n > sonSayi.current) {
          try { navigator.vibrate?.(300); } catch { /* desteklenmiyor */ }
        }
        sonSayi.current = n;
        setSayi(n);
      } catch {
        // ağ hatasında sayı olduğu gibi kalır
      }
    };
    cek();
    const t = setInterval(cek, 10000);
    return () => {
      iptal = true;
      clearInterval(t);
    };
  }, []);

  return sayi;
}

// Depo sorumlusunun ana ekranı
function YoneticiEkrani({ kullanici, onCikis }) {
  const [tab, setTab] = useState('stok');
  const [q, setQ] = useState('');
  const [cuvalDurum] = useState('');
  const [esik, setEsik] = useState(() => ayarOku('triko-esik', 10));
  const [gun, setGun] = useState(() => ayarOku('triko-gun', 14));
  const [raporAcik, setRaporAcik] = useState(false);
  const [ozetAcik, setOzetAcik] = useState(false);
  const [mesajAcik, setMesajAcik] = useState(false);
  const [form, setForm] = useState(null);
  const [urunDuz, setUrunDuz] = useState(null);
  const [bildirimDurum, setBildirimDurum] = useState(() =>
    (pushDestekli() ? Notification.permission : 'yok'));
  const [bildirimHata, setBildirimHata] = useState('');

  const bekleyenHareket = useBekleyenHareket();
  const toast = useToastlar();

  // İzin daha önce verildiyse cihaz aboneliğini sessizce yeniler
  useEffect(() => {
    if (pushDestekli() && Notification.permission === 'granted') {
      bildirimleriAc().catch(() => {});
    }
  }, []);

  const bildirimAc = async () => {
    setBildirimHata('');
    try {
      await bildirimleriAc();
      setBildirimDurum('granted');
    } catch (e) {
      setBildirimHata(e.message);
      setBildirimDurum(pushDestekli() ? Notification.permission : 'yok');
    }
  };

  const TABS = [
    ['stok', 'Stok özeti'],
    ['cuval', 'Çuvallar'],
    ['giden', 'Giden mallar'],
    ['biten', 'Bitenler'],
    ['uyari', 'Uyarılar'],
    ['gelen', 'Gelen mallar'],
    ['hareketler', bekleyenHareket > 0 ? `Fason hareketleri (${bekleyenHareket})` : 'Fason hareketleri'],
    ['gorevler', 'Görevler'],
    ['kullanicilar', 'Kullanıcılar'],
  ];

  useEffect(() => { localStorage.setItem('triko-esik', esik); }, [esik]);
  useEffect(() => { localStorage.setItem('triko-gun', gun); }, [gun]);

  const { data, canli, refresh, run } = useTriko({ yonetici: true, q, cuvalDurum, esik, gun });
  const islem = useIslemler({ run, form, setForm });
  const { liste, okunmamis, yenile } = useMesajlar();
  const gorev = useGorevler();

  const uyariSayisi = (data.uyari?.dusuk.length ?? 0) + (data.uyari?.hareketsiz.length ?? 0);

  return (
    <YetkiContext.Provider value={{ rol: kullanici.rol, okumaModu: false }}>
      <div className="min-h-screen pb-24 sm:pb-10">
        <Baslik
          kullanici={kullanici}
          canli={canli}
          okuma={false}
          onRapor={() => setRaporAcik(true)}
          onOzet={() => setOzetAcik(true)}
          onMesaj={() => setMesajAcik(true)}
          mesajSayi={okunmamis}
          onYeniCuval={() => setForm({ type: 'cuval' })}
          onYeniGiden={() => setForm({ type: 'giden' })}
          onCikis={onCikis}
        />

        {bildirimDurum === 'default' && (
          <div className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-6xl flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3 sm:w-[calc(100%-3rem)]">
            <span className="text-sm">Sekme kapalıyken de bildirim ve ses gelsin diye izin verin.</span>
            <button type="button" className="btn btn-sm" onClick={bildirimAc}>Bildirimleri aç</button>
          </div>
        )}
        {bildirimDurum === 'denied' && (
          <p className="mx-auto mt-2 max-w-6xl px-4 text-xs text-warn">
            Bildirimler tarayıcıda kapalı. Site ayarlarından izin verin.
          </p>
        )}
        {bildirimHata && (
          <p className="mx-auto mt-2 max-w-6xl px-4 text-xs text-warn">{bildirimHata}</p>
        )}

        {bekleyenHareket > 0 && tab !== 'hareketler' && (
          <button
            type="button"
            onClick={() => setTab('hareketler')}
            className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-xl bg-warn-soft px-4 py-3 text-left text-warn sm:w-[calc(100%-3rem)]"
          >
            <span className="font-medium">{bekleyenHareket} fason hareketi onay bekliyor</span>
            <span className="text-sm underline">Aç</span>
          </button>
        )}

        <main className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_300px]">
          <section className="card relative z-10 min-w-0">
            <SekmeMenu
              tabs={TABS}
              tab={tab}
              setTab={setTab}
              uyariSayisi={uyariSayisi}
              q={q}
              setQ={setQ}
            />
            {tab === 'gelen' ? (
              <GelenMallarPaneli yonetici />
            ) : tab === 'hareketler' ? (
              <FasonHareketleriYonetici />
            ) : tab === 'gorevler' ? (
              <GorevPaneli liste={gorev.liste} yenile={gorev.yenile} />
            ) : (
              <SekmeIcerik
                tab={tab}
                data={data}
                yonetici
                kullanici={kullanici}
                esik={esik}
                gun={gun}
                setEsik={setEsik}
                setGun={setGun}
                grupSil={islem.onDeleteGroup}
                setUrunDuz={setUrunDuz}
                setForm={setForm}
                islem={islem}
                refresh={refresh}
              />
            )}
          </section>

          <YanPanel
            data={data}
            yonetici
            logTemizle={islem.onClearLog}
            onYedekAl={islem.onYedekAl}
            onGeriYukle={islem.onGeriYukle}
            onGeriAl={islem.onGeriAl}
          />
        </main>

        <MobilAlt
          rol={kullanici.rol}
          onCuval={() => setForm({ type: 'cuval' })}
          onGiden={() => setForm({ type: 'giden' })}
          onRapor={() => setRaporAcik(true)}
        />

        {form?.type === 'cuval' && (
          <CuvalForm item={form.item} onSave={islem.onSaveCuval} onClose={() => setForm(null)} />
        )}
        {form?.type === 'giden' && (
          <GidenForm onSave={islem.onSaveGiden} onClose={() => setForm(null)} />
        )}
        {form?.type === 'gidenDuz' && (
          <GidenEditForm item={form.item} onSave={islem.onSaveGidenDuz} onClose={() => setForm(null)} />
        )}
        {raporAcik && <RaporModal onClose={() => setRaporAcik(false)} />}
        {ozetAcik && <OzetModal onClose={() => setOzetAcik(false)} />}
        {mesajAcik && (
          <MesajPaneli
            kullanici={kullanici}
            liste={liste}
            yenile={yenile}
            onKapat={() => setMesajAcik(false)}
          />
        )}
        {urunDuz && (
          <UrunDuzenleForm
            urun={urunDuz}
            onSave={() => { setUrunDuz(null); refresh(); }}
            onClose={() => setUrunDuz(null)}
          />
        )}

        <ToastKapsul liste={toast.liste} kapat={toast.kapat} />
      </div>
    </YetkiContext.Provider>
  );
}