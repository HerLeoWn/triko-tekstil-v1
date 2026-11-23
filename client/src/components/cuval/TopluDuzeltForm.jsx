import { useState } from 'react';
// Modal ve Field, Forms.jsx içinde tanımlı (eksik import bu dosyada düzeltildi)
import { Modal, Field } from '../../Forms.jsx';

// Toplu düzeltme: kaç çuvalın değişeceğini ve yeni içeriği girersiniz
export function TopluDuzeltForm({ grup, depolar, onClose, onSave }) {
  const [adet, setAdet] = useState(grup.adet);
  const [cuvalIci, setCuvalIci] = useState(grup.cuvalIci);
  const [parcalar, setParcalar] = useState([{ renk: '', seri: '' }]);
  const [eksik, setEksik] = useState('');
  const [depoId, setDepoId] = useState('');

  const adetSayi = Math.min(Math.max(+adet || 0, 0), grup.adet);
  const dolu = parcalar.reduce((s, p) => s + (+p.seri || 0), 0);

  const kaydet = () => {
    const temiz = parcalar
      .map((p) => ({ renk: p.renk.trim(), seri: +p.seri || 0 }))
      .filter((p) => p.renk && p.seri > 0);
    onSave({
      ids: grup.cuvallar.slice(0, adetSayi).map((c) => c.id),
      cuvalIci: +cuvalIci,
      parcalar: temiz,
      eksik,
      depoId,
    });
  };

  return (
    <Modal title={`${grup.kod} · toplu düzelt`} onClose={onClose} onSave={kaydet}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Kaç çuval düzeltilecek (en fazla ${grup.adet})`}>
          <input className="inp" type="number" min="1" max={grup.adet} value={adet}
            onChange={(e) => setAdet(e.target.value)} />
        </Field>
        <Field label="Çuval içi seri">
          <input className="inp" type="number" min="1" value={cuvalIci}
            onChange={(e) => setCuvalIci(e.target.value)} />
        </Field>
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-xs font-medium text-muted">Yeni içerik (renk ve seri)</div>
        {parcalar.map((p, k) => (
          <div key={k} className="mb-2 grid grid-cols-[1fr_110px_36px] items-end gap-2">
            <input className="inp" placeholder="Renk" value={p.renk}
              onChange={(e) => setParcalar((ps) => ps.map((x, m) => (m === k ? { ...x, renk: e.target.value } : x)))} />
            <input className="inp" type="number" min="1" placeholder="Seri" value={p.seri}
              onChange={(e) => setParcalar((ps) => ps.map((x, m) => (m === k ? { ...x, seri: e.target.value } : x)))} />
            <button className="btn-ghost btn-sm h-9"
              onClick={() => setParcalar((ps) => (ps.length > 1 ? ps.filter((_, m) => m !== k) : ps))}>✕</button>
          </div>
        ))}
        <button className="btn-ghost btn-sm"
          onClick={() => setParcalar((ps) => [...ps, { renk: '', seri: '' }])}>+ Renk ekle</button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Eksik seriler">
          <input className="inp" placeholder="örn: S M L; XL" value={eksik} onChange={(e) => setEksik(e.target.value)} />
        </Field>
        <Field label="Depo (boş bırakılırsa değişmez)">
          <select className="inp" value={depoId} onChange={(e) => setDepoId(e.target.value)}>
            <option value="">Değiştirme</option>
            {depolar.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
          </select>
        </Field>
      </div>

      <div className="mt-3 rounded-lg bg-accent-soft p-3 text-sm text-accent">
        {adetSayi} çuval × {cuvalIci} seri · içerik: {dolu} seri
        {dolu > +cuvalIci && <span className="text-warn"> · ⚠ çuval içi seriyi aşıyor</span>}
        <div className="mt-1 text-xs">
          {adetSayi < grup.adet
            ? `Geriye kalan ${grup.adet - adetSayi} çuval olduğu gibi kalacak.`
            : 'Bu grubun bütün çuvalları değişecek.'}
        </div>
      </div>
    </Modal>
  );
}