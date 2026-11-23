import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Modal } from '../ui/Modal.jsx';
import { Field } from '../ui/Field.jsx';

// Giden kaydını düzenleme: kod, renk, seri ve çıkış deposu
export function GidenEditForm({ item, onSave, onClose }) {
  const [kod, setKod] = useState(item.kod);
  const [renk, setRenk] = useState(item.renk);
  const [seri, setSeri] = useState(String(item.seri));
  const [depoSecim, setDepoSecim] = useState(String(item.depo_id ?? ''));
  const [stok, setStok] = useState(null);

  useEffect(() => {
    api.get('/api/stok').then(setStok).catch(() => setStok({ groups: [], depolar: [] }));
  }, []);

  const depoListe = [...(stok?.depolar ?? [])].sort((a, b) => a.sira - b.sira);
  const depoId = depoSecim || String(depoListe[0]?.id ?? '');
  const depoAdi = depoListe.find((d) => String(d.id) === depoId)?.ad ?? '';

  const grup = stok?.groups.find((g) => g.kod.toLowerCase() === kod.trim().toLowerCase());
  const renkler = grup?.renks ?? [];
  const eslesen = renkler.find((r) => r.renk.toLowerCase() === renk.trim().toLowerCase());
  const m = eslesen?.depoSeri?.[depoId] ?? 0;

  // Bu kayıt zaten stoktan düşmüş durumda; aynı kod/renk/depo seçiliyse onun seri sayısı da kullanılabilir
  const ayniYer = item.kod.toLowerCase() === kod.trim().toLowerCase()
    && item.renk.toLowerCase() === renk.trim().toLowerCase()
    && String(item.depo_id ?? 1) === depoId;
  const kullanilabilir = m + (ayniYer && item.stok ? item.seri : 0);

  const hatalar = [];
  if (!kod.trim()) hatalar.push('Kod girin.');
  if (!renk.trim()) hatalar.push('Renk girin.');
  if (!(+seri > 0)) hatalar.push('Seri girin.');
  if (!stok) hatalar.push('Stok bilgisi yükleniyor…');
  if (!(+depoId > 0)) hatalar.push('Çıkış deposu seçin.');
  if (+seri > kullanilabilir) {
    hatalar.push(`${renk.trim()} renginde ${depoAdi} deposunda yalnızca ${kullanilabilir} seri var, ${seri} girdiniz.`);
  }

  const save = () => {
    if (hatalar.length) return;
    onSave({ kod: kod.trim(), renk: renk.trim(), seri: +seri, depoId: +depoId });
  };

  return (
    <Modal title="Giden kaydını düzenle" onClose={onClose} onSave={save}>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[1fr_1fr_120px_180px]">
        <Field label="Kod">
          <input className="inp" value={kod} onChange={(e) => setKod(e.target.value)} />
        </Field>
        <Field label="Renk">
          <input className="inp" list="giden-duz-renkler" value={renk} onChange={(e) => setRenk(e.target.value)} />
          <datalist id="giden-duz-renkler">
            {renkler.map((r) => <option key={r.renk} value={r.renk} />)}
          </datalist>
        </Field>
        <Field label="Seri">
          <input className="inp" type="number" min="1" value={seri} onChange={(e) => setSeri(e.target.value)} />
        </Field>
        <Field label="Çıkış deposu">
          <select className="inp" value={depoId} onChange={(e) => setDepoSecim(e.target.value)}>
            {depoListe.map((d) => <option key={d.id} value={String(d.id)}>{d.ad}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-3 text-sm text-muted">
        {kod.trim() && renk.trim()
          ? `${depoAdi} deposunda ${eslesen?.renk ?? renk.trim()}: ${m} seri`
          : 'Kod ve renk girin, stok burada görünür.'}
      </div>
      <p className="mt-2 text-xs text-muted">Giden kayıtları her zaman stoktan düşer. Kayıt değişince stok yeniden hesaplanır.</p>

      {hatalar.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-warn-soft p-2.5 text-sm text-warn">
          {hatalar.map((h, i) => <li key={i}>⚠ {h}</li>)}
        </ul>
      )}
    </Modal>
  );
}