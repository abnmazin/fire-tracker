import { getMessaging, isSupported, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';

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
const notifDoc = (db, appId, id) => doc(db, 'artifacts', appId, 'public', 'data', 'app_data', id);

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
    const data = payload?.data || {};
    const title = data.title || payload?.notification?.title || 'لجنة السلامة';
    const body = data.body || payload?.notification?.body || '';
    onNotify({ title, body, url: data.url || '/', id: data.id || '' });
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
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { sent: 0, failed: 0, error: `استجابة غير صالحة من الخادم (HTTP ${res.status}) — تأكد من النشر على Vercel وليس خادم التطوير` };
    }
  } catch (err) {
    return { sent: 0, failed: 0, error: String(err) };
  }
};

export const createNotification = async (db, appId, { title, body, url, kind, senderId, senderName }) => {
  const list = await readTokens(db, appId);
  const tokens = list.map((t) => t.token).filter(Boolean);
  const id = 'ntf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const targetUsers = {};
  list.forEach((t) => { if (t.token) targetUsers[t.userId || t.token] = { name: t.userName || 'جهاز' }; });
  try {
    await setDoc(notifDoc(db, appId, id), {
      id,
      title: String(title),
      body: String(body || ''),
      url: url || '/',
      kind: kind || 'custom',
      senderId: senderId || '',
      senderName: senderName || '',
      createdAt: Date.now(),
      likes: {},
      targetUsers,
    });
  } catch { /* سجل الكتابة الفاشلة لكن نكمل الإرسال */ }
  if (tokens.length === 0) return { id, skipped: true, sent: 0, failed: 0, total: tokens.length };
  try {
    const res = await sendPushNotification(db, appId, { title, body, data: { ...(url ? { url } : {}), id } });
    return { id, skipped: false, sent: res.sent || 0, failed: res.failed || 0, total: tokens.length, error: res.error };
  } catch (err) {
    return { id, skipped: false, sent: 0, failed: tokens.length, total: tokens.length, error: String(err) };
  }
};

export const setNotificationLike = async (db, appId, id, user, liked) => {
  try {
    if (liked) {
      await updateDoc(notifDoc(db, appId, id), { [`likes.${user.id}`]: { name: user.name, at: Date.now() } });
    } else {
      await updateDoc(notifDoc(db, appId, id), { [`likes.${user.id}`]: deleteField() });
    }
  } catch { /* ignore */ }
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
