import { StokOzeti, CuvalListe, GidenListe, BitenListe } from '../Pages.jsx';
import { UyariListe } from '../Faz3.jsx';
import { KullaniciPanel } from '../Faz4.jsx';
import { DepoPanel } from '../Faz5.jsx';

// Seçili sekmenin içeriğini gösterir
export default function SekmeIcerik({
  tab, data, yonetici, kullanici, esik, gun, setEsik, setGun,
  grupSil, setUrunDuz, setForm, islem, refresh,
}) {
  switch (tab) {
    case 'stok':
      return data.stok ? (
        <StokOzeti stok={data.stok} onDeleteGroup={grupSil} onEditUrun={(g) => setUrunDuz(g)} />
      ) : null;

    case 'cuval':
      return (
        <CuvalListe
          rows={data.cuvallar}
          depolar={data.stok?.depolar ?? []}
          onEdit={(c) => setForm({ type: 'cuval', item: c })}
          onToggle={islem.onToggle}
          onDelete={islem.onDeleteCuval}
          onTopluDuzelt={islem.onTopluDuzelt}
        />
      );

    case 'giden':
      return (
        <GidenListe
          rows={data.giden}
          onDelete={islem.onDeleteGiden}
          onEdit={(g) => setForm({ type: 'gidenDuz', item: g })}
        />
      );

    case 'biten':
      return <BitenListe groups={data.biten} onDeleteGroup={grupSil} />;

    case 'uyari':
      return <UyariListe data={data.uyari} esik={esik} gun={gun} setEsik={setEsik} setGun={setGun} />;

    case 'kullanicilar':
      if (!yonetici) return null;
      return (
        <>
          <KullaniciPanel liste={data.kullanicilar} benimId={kullanici.id} yenile={refresh} />
          <div className="mt-6 border-t border-line pt-6">
            <DepoPanel depolar={data.stok?.depolar ?? []} yenile={refresh} />
          </div>
        </>
      );

    default:
      return null;
  }
}
