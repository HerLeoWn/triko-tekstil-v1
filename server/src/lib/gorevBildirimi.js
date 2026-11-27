// Muhasebe görev atadığında depo sorumlusunun ekranında toast çıkarır
import { toastEkle } from './toast.js';

export function gorevBildirimi(req, res, next) {
  if (req.method === 'POST' && req.path === '/api/gorevler') {
    res.on('finish', () => {
      // Yetki reddi ya da hata durumunda toast çıkmaz
      if (res.statusCode >= 300) return;
      try {
        const ad = String(req.body?.baslik ?? req.body?.ad ?? req.body?.gorev ?? '').trim();
        toastEkle(
          'yonetici',
          'Muhasebe size görev atadı',
          ad ? ad.slice(0, 120) : 'Yeni bir görev var. Görevler sekmesine bakın.',
        );
      } catch (e) {
        console.error('Görev toast kaydı yazılamadı:', e.message);
      }
    });
  }
  next();
}