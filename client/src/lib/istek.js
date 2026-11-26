// Sunucuya istek atar. Hata olursa sunucunun gönderdiği mesajla birlikte hata fırlatır.
async function istek(method, url, body) {
  const secenek = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    secenek.headers['Content-Type'] = 'application/json';
    secenek.body = JSON.stringify(body);
  }
  const res = await fetch(url, secenek);
  let veri = null;
  try {
    veri = await res.json();
  } catch {
    // gövde yoksa veri null kalır
  }
  if (!res.ok) {
    const e = new Error(veri?.error || `İstek başarısız (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return veri;
}

export const get = (url) => istek('GET', url);
export const post = (url, body) => istek('POST', url, body ?? {});
export const put = (url, body) => istek('PUT', url, body ?? {});
export const del = (url) => istek('DELETE', url);