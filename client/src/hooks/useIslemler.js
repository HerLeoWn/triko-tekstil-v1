import { api } from '../api.js';
import { enc } from './useTriko.js';

// Kayıt, düzenleme ve silme işlemleri. Her biri run() ile çalışır, bittiğinde veri yenilenir.
export function useIslemler({ run, form, setForm }) {
  // Çuval ekle (birden çok satır) ya da düzenle (tek satır)
  const onSaveCuval = (rows, id) => run(async () => {
    if (id) await api.put(`/api/cuvallar/${id}`, rows[0]);
    else for (const r of rows) await api.post('/api/cuvallar', r);
    setForm(null);
  });

  const onSaveGiden = (payload) => run(async () => {
    await api.post('/api/giden', payload);
    setForm(null);
  });

  const onSaveGidenDuz = (payload) => run(async () => {
    await api.put(`/api/giden/${form.item.id}`, payload);
    setForm(null);
  });

  const onToggle = (c) => run(() => api.post(`/api/cuvallar/${c.id}/durum`));
  const onDeleteCuval = (c) => run(() => api.del(`/api/cuvallar/${c.id}`));
  const onTopluDuzelt = (payload) => run(() => api.post('/api/cuvallar/toplu-duzelt', payload));
  const onDeleteGiden = (g) => run(() => api.del(`/api/giden/${g.id}`));
  const onDeleteGroup = (kod) => run(() => api.del(`/api/urun/${enc(kod)}`));
  const onClearLog = () => run(() => api.del('/api/hareketler'));
  const onYedekAl = () => run(() => api.post('/api/yedek'));
  const onGeriYukle = () => run(() => api.post('/api/yedek/geri-yukle'));
  const onGeriAl = () => run(() => api.post('/api/geri-al'));

  return {
    onSaveCuval, onSaveGiden, onSaveGidenDuz, onToggle, onDeleteCuval, onTopluDuzelt,
    onDeleteGiden, onDeleteGroup, onClearLog, onYedekAl, onGeriYukle, onGeriAl,
  };
}