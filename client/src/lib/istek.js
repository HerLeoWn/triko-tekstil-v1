// Tüm fasoncu ve gelen mal ekranlarının kullandığı küçük istek yardımcısı.
// Sunucu hata dönerse, mesajı (error alanını) Error olarak fırlatır.
import { get, post, del } from '../../lib/istek.js';
export async function istek(method, url, body) {
  const r = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch { /* boş yanıt */ }
  if (!r.ok) throw new Error(j?.error || `İstek başarısız (${r.status})`);
  return j;
}

export const get = (url) => istek('GET', url);
export const post = (url, body) => istek('POST', url, body ?? {});
export const put = (url, body) => istek('PUT', url, body ?? {});