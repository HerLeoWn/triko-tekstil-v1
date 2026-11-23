const HERKESE_ACIK = ['/api/giris', '/api/kurulum', '/api/ben'];

const request = async (method, url, body) => {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && !HERKESE_ACIK.some((p) => url.startsWith(p))) {
    window.dispatchEvent(new Event('oturum-kapandi'));
  }
  if (!res.ok) {
    const err = new Error(data.error || 'Bir hata oluştu.');
    err.status = res.status;
    throw err;
  }
  return data;
};

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body ?? {}),
  put: (url, body) => request('PUT', url, body),
  del: (url) => request('DELETE', url),
};