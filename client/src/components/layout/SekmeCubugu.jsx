// Sekme düğmeleri ve (uygun sekmelerde) arama ve durum filtresi
export default function SekmeCubugu({
  tabs, tab, setTab, uyariSayisi, q, setQ, cuvalDurum, setCuvalDurum,
}) {
  const aramaVar = ['stok', 'cuval', 'giden', 'biten'].includes(tab);

  return (
    <>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-1 overflow-x-auto rounded-xl bg-track p-1">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`shrink-0 ${tab === key ? 'pill-on' : 'pill-off'}`}>
            {label}
            {key === 'uyari' && uyariSayisi > 0 && (
              <span className="ml-1.5 rounded-full bg-warn px-1.5 text-[11px] text-white">{uyariSayisi}</span>
            )}
          </button>
        ))}
      </div>

      {aramaVar && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input
            className="inp sm:flex-1"
            placeholder="Kod veya renk ara"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {tab === 'cuval' && (
            <select className="inp sm:w-44" value={cuvalDurum} onChange={(e) => setCuvalDurum(e.target.value)}>
              <option value="">Tüm durumlar</option>
              <option value="acik">Açık</option>
              <option value="kapali">Kapalı</option>
            </select>
          )}
        </div>
      )}
    </>
  );
}