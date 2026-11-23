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
import SekmeCubugu from '../components/layout/SekmeCubugu.jsx';
import YanPanel from '../components/layout/YanPanel.jsx';
import { MesajPaneli } from '../components/mesaj/MesajPaneli.jsx';
import { MuhasebeSayfa } from '../components/muhasebe/MuhasebeSayfa.jsx';
import { GorevPaneli } from '../components/gorev/GorevPaneli.jsx';
import SekmeIcerik from './SekmeIcerik.jsx';

const ayarOku = (key, varsayilan) => {
  const v = Number(localStorage.getItem(key));
  return v > 0 ? v : varsayilan;
};

// Giriş yapılmış kullanıcının ana ekranı. Muhasebe rolü kendi ekranını kullanır.
export default function Uygulama({ kullanici, onCikis }) {
  const yonetici = kullanici.rol === 'yonetici';
  const okuma = kullanici.rol === 'izleyici';

  const TABS = [
    ['stok', 'Stok özeti'],
    ['cuval', 'Çuvallar'],
    ['giden', 'Giden mallar'],
    ['biten', 'Bitenler'],
    ['uyari', 'Uyarılar'],
    ...(yonetici ? [['gorevler', 'Görevler']] : []),
    ...(yonetici ? [['kullanicilar', 'Kullanıcılar']] : []),
  ];

  const [tab, setTab] = useState('stok');
  const [q, setQ] = useState('');
  const [cuvalDurum, setCuvalDurum] = useState('');
  const [esik, setEsik] = useState(() => ayarOku('triko-esik', 10));
  const [gun, setGun] = useState(() => ayarOku('triko-gun', 14));
  const [raporAcik, setRaporAcik] = useState(false);
  const [ozetAcik, setOzetAcik] = useState(false);
  const [mesajAcik, setMesajAcik] = useState(false);
  const [form, setForm] = useState(null);
  const [urunDuz, setUrunDuz] = useState(null);

  useEffect(() => { localStorage.setItem('triko-esik', esik); }, [esik]);
  useEffect(() => { localStorage.setItem('triko-gun', gun); }, [gun]);

  const { data, canli, refresh, run } = useTriko({ yonetici, q, cuvalDurum, esik, gun });
  const islem = useIslemler({ run, form, setForm });
  const { liste, okunmamis, yenile } = useMesajlar();
  const gorev = useGorevler();

  const yetkisiz = () => alert('Bu işlem için depo sorumlusu yetkisi gerekir.');
  const grupSil = yonetici ? islem.onDeleteGroup : yetkisiz;
  const logTemizle = yonetici ? islem.onClearLog : yetkisiz;
  const uyariSayisi = (data.uyari?.dusuk.length ?? 0) + (data.uyari?.hareketsiz.length ?? 0);

  if (kullanici.rol === 'muhasebe') {
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

  return (
    <YetkiContext.Provider value={{ rol: kullanici.rol, okumaModu: okuma }}>
      <div className="min-h-screen pb-24 sm:pb-10">
        <Baslik
          kullanici={kullanici}
          canli={canli}
          okuma={okuma}
          onRapor={() => setRaporAcik(true)}
          onOzet={() => setOzetAcik(true)}
          onMesaj={() => setMesajAcik(true)}
          mesajSayi={okunmamis}
          onYeniCuval={() => setForm({ type: 'cuval' })}
          onYeniGiden={() => setForm({ type: 'giden' })}
          onCikis={onCikis}
        />

        <main className="mx-auto grid max-w-6xl gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_300px]">
          <section className="card min-w-0 animate-fadeUp">
            <SekmeCubugu
              tabs={TABS}
              tab={tab}
              setTab={setTab}
              uyariSayisi={uyariSayisi}
              q={q}
              setQ={setQ}
              cuvalDurum={cuvalDurum}
              setCuvalDurum={setCuvalDurum}
            />
            {tab === 'gorevler' ? (
              <GorevPaneli liste={gorev.liste} yenile={gorev.yenile} />
            ) : (
              <SekmeIcerik
                tab={tab}
                data={data}
                yonetici={yonetici}
                kullanici={kullanici}
                esik={esik}
                gun={gun}
                setEsik={setEsik}
                setGun={setGun}
                grupSil={grupSil}
                setUrunDuz={setUrunDuz}
                setForm={setForm}
                islem={islem}
                refresh={refresh}
              />
            )}
          </section>

          <YanPanel
            data={data}
            yonetici={yonetici}
            logTemizle={logTemizle}
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