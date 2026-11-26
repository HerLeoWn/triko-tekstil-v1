import { useEffect, useState } from 'react';
import { CuvalForm, GidenForm, GidenEditForm } from '../Forms.jsx';
import { RaporModal, OzetModal } from '../Faz3.jsx';
import { MobilAlt } from '../Faz4.jsx';
import { UrunDuzenleForm } from '../Faz5.jsx';
import { YetkiContext } from '../Confirm.jsx';
import { useTriko } from '../hooks/useTriko.js';
import { useIslemler } from '../hooks/useIslemler.js';
import { useMesajlar } from '../hooks/useMesajlar.js';
import { useGorevler } from '../hooks/useGorevler.js';
import Baslik from '../components/layout/Baslik.jsx';
import { SekmeMenu } from '../components/layout/SekmeMenu.jsx';
import YanPanel from '../components/layout/YanPanel.jsx';
import { MesajPaneli } from '../components/mesaj/MesajPaneli.jsx';
import { MuhasebeSayfa } from '../components/muhasebe/MuhasebeSayfa.jsx';
import { GorevPaneli } from '../components/gorev/GorevPaneli.jsx';
import { FasonculSayfa } from '../components/fasoncu/FasonculSayfa.jsx';
import { GelenMallarPaneli } from '../components/gelen/GelenMallarPaneli.jsx';
import { FasonHareketleriYonetici } from '../components/fason/FasonHareketleri.jsx';
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

// Depo sorumlusunun ana ekranı
function YoneticiEkrani({ kullanici, onCikis }) {
  const TABS = [
    ['stok', 'Stok özeti'],
    ['cuval', 'Çuvallar'],
    ['giden', 'Giden mallar'],
    ['biten', 'Bitenler'],
    ['uyari', 'Uyarılar'],
    ['gelen', 'Gelen mallar'],
    ['hareketler', 'Fason hareketleri'],
    ['gorevler', 'Görevler'],
    ['kullanicilar', 'Kullanıcılar'],
  ];

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
      </div>
    </YetkiContext.Provider>
  );
}