import { getMessaging, isSupported, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || '';

let messaging = null;
let cleanupForeground = null;

export const isNotifSupported = async () => {
  try { return await isSupported(); } catch { return false; }
};

const getMessagingInstance = async (fbApp) => {
  if (!messaging) messaging = getMessaging(fbApp);
  return messaging;
};

const tokensDoc = (db, appId) => doc(db, 'artifacts', appId, 'public', 'data', 'app_data', 'notifTokens');

const readTokens = async (db, appId) => {
  try {
    const snap = await getDoc(tokensDoc(db, appId));
    return snap.exists() ? (snap.data().list || []) : [];
  } catch { return []; }
};

const writeTokens = async (db, appId, list) => {
  try { await setDoc(tokensDoc(db, appId), { list }); } catch { /* ignore */ }
};

export const subscribeForeground = async (fbApp, onNotify) => {
  const ok = await isNotifSupported();
  if (!ok) return () => {};
  const m = await getMessagingInstance(fbApp);
  if (cleanupForeground) cleanupForeground();
  cleanupForeground = onMessage(m, (payload) => {
    const title = payload?.notification?.title || 'Fire Tracker';
    const body = payload?.notification?.body || '';
    const data = payload?.data || {};
    onNotify({ title, body, url: data.url || '/' });
  });
  return cleanupForeground;
};

export const getExistingToken = async (fbApp) => {
  if (typeof Notification === 'undefined') return null;
  if (Notification.permission !== 'granted') return null;
  try {
    const m = await getMessagingInstance(fbApp);
    return await getToken(m, { vapidKey: VAPID_KEY });
  } catch { return null; }
};

export const requestNotifToken = async (fbApp) => {
  if (typeof Notification === 'undefined') throw new Error('unsupported');
  if (Notification.permission === 'denied') throw new Error('denied');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('denied');
  const m = await getMessagingInstance(fbApp);
  const token = await getToken(m, { vapidKey: VAPID_KEY });
  if (!token) throw new Error('no-token');
  return token;
};

export const registerToken = async (db, appId, token, user) => {
  const list = (await readTokens(db, appId)).filter((t) => t.token !== token);
  list.push({
    token,
    userId: user?.id || '',
    userName: user?.name || '',
    updatedAt: new Date().toISOString(),
  });
  await writeTokens(db, appId, list);
  return list.length;
};

export const unregisterToken = async (db, appId, token) => {
  const list = (await readTokens(db, appId)).filter((t) => t.token !== token);
  await writeTokens(db, appId, list);
  try {
    const m = await getMessagingInstance(db.app);
    await deleteToken(m);
  } catch { /* ignore */ }
  return list.length;
};

export const sendPushNotification = async (db, appId, { title, body, data }) => {
  const tokens = (await readTokens(db, appId)).map((t) => t.token).filter(Boolean);
  if (tokens.length === 0) return { skipped: true, sent: 0 };
  try {
    const res = await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, data: data || {}, tokens }),
    });
    const json = await res.json().catch(() => ({}));
    return json;
  } catch (err) {
    return { error: String(err) };
  }
};

export const playNotifSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start();
    o.stop(ctx.currentTime + 0.65);
    o.onended = () => ctx.close();
  } catch { /* ignore */ }
};
