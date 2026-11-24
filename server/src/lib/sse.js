// Canlı güncelleme (SSE): bağlı tarayıcılara "veri değişti" bildirir

const baglantilar = new Set();

// GET /api/olaylar: tarayıcı buraya bağlanır ve bildirimleri dinler
export function olaylarRoute(req, res) {
  // HTTP/2 üzerinde "Connection" başlığı yasak. Railway bu başlık yüzünden bağlantıyı keser.
  // X-Accel-Buffering: ara katmanın yanıtı tamponlamasını engeller.
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  baglantilar.add(res);

  // Boşta kalan bağlantıyı canlı tutmak için kısa aralıklı sinyal
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => {
    clearInterval(ping);
    baglantilar.delete(res);
  });
}

// Başarılı her yazma isteğinden sonra bağlı tüm istemcilere bildirim gönderir
export function degisiklikBildirimi(req, res, next) {
  const yazma = ['POST', 'PUT', 'DELETE'].includes(req.method) && req.path.startsWith('/api/');
  if (yazma) {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        for (const c of baglantilar) c.write(`data: ${JSON.stringify({ tur: 'degisti' })}\n\n`);
      }
    });
  }
  next();
}