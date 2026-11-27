// Tarayıcı bildirim izni ve cihaz aboneliği
import { get, post } from './istek.js';

export const pushDestekli = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const base64ToBytes = (b64) => {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

// İzin ister, cihazı kaydeder ve aboneliği sunucuya bildirir
export async function bildirimleriAc() {
  if (!pushDestekli()) {
    throw new Error('Bu tarayıcı bildirimleri desteklemiyor. iPhone ise siteyi Ana ekrana ekleyip oradan açın.');
  }
  const izin = await Notification.requestPermission();
  if (izin !== 'granted') throw new Error('Bildirim izni verilmedi.');

  const { anahtar } = await get('/api/push/anahtar');
  if (!anahtar) throw new Error('Sunucuda bildirim anahtarları tanımlı değil.');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToBytes(anahtar),
    });
  }
  await post('/api/push/abone', sub.toJSON());
  return true;
}