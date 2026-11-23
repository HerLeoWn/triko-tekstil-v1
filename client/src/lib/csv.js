import { fmt } from './format.js';

// Gün sonu raporunu noktalı virgüllü CSV olarak indirir (Excel için BOM'lu)
export function csvIndir(r) {
  const satirlar = [];
  const ekle = (...a) => satirlar.push(a.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';'));

  ekle('GÜN SONU RAPORU', r.tarih);
  ekle();
  ekle('GİRİLEN ÇUVALLAR');
  ekle('Saat', 'Kod', 'Renk / içerik', 'Çuval içi', 'Seri');
  r.girilen.forEach((c) => ekle(fmt(c.saat), c.kod, c.etiket, c.cuvalIci, c.seri));
  ekle();
  ekle('GİDEN MALLAR');
  ekle('Saat', 'Kod', 'Renk', 'Çuval', 'Seri', 'Özet');
  r.giden.forEach((g) => ekle(fmt(g.saat), g.kod, g.renk, g.cuval, g.seri, g.ozet));
  ekle();
  ekle('ANLIK STOK');
  ekle('Kod', 'Renk', 'Seri');
  r.kalan.forEach((k) => ekle(k.kod, k.renk, k.seri));

  const blob = new Blob(['\uFEFF' + satirlar.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gun-sonu-${r.tarih}.csv`;
  a.click();
}