// Canlı güncelleme (SSE): bağlı tarayıcılara "veri değişti" bildirir

const baglantilar = new Set();

// GET /api/olaylar: tarayıcı buraya bağlanır ve bildirimleri dinler
export function olaylarRoute(req, res) {
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  baglantilar.add(res);

  // Bağlantıyı canlı tutmak için periyodik sinyal
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
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
