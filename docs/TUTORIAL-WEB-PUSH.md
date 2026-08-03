# دليل إنشاء نظام إشعارات Web Push (Firebase Cloud Messaging)

**English version below** → scroll down.

---

# 🟢 Arabic / بالعربية

## 1. نظرة عامة
هذا الدليل يشرح كيفية إضافة نظام إشعارات (Web Push) لأي موقع ويب، نفس النظام المستخدم في مشروع fire-tracker. يعمل على:
- المتصفحات (Chrome / Edge / Firefox)
- Safari على الآيفون (iOS 16.4+) **بشرط تثبيت الموقع كتطبيق (PWA) على الشاشة الرئيسية**
- عند إغلاق الموقع (تصل الإشعارات حتى لو التطبيق مقفل)

المكوّنات:
1. **Firebase** — لإصدار الرموز وإرسال الرسائل (FCM)
2. **Service Worker** — ملف `firebase-messaging-sw.js` يستقبل الرسائل في الخلفية
3. **دالة خادم** (`api/send-push.js`) — ترسل الرسائل عبر FCM HTTP v1 (لا يمكن إرسالها من المتصفح مباشرة)
4. **Vercel** — لاستضافة دالة الإرسال والمتغيرات السرية

---

## 2. إنشاء مشروع Firebase
1. ادخل إلى [Firebase Console](https://console.firebase.google.com)
2. اضغط **Add project** → أدخل اسم المشروع → أنشئه.
3. من **Project Settings ⚙️ → General**، في قسم **Your apps** اضغط زر الويب `</>`:
   - اكتب اسم التطبيق، **لا تحتاج** تفعيل Firebase Hosting.
   - انسخ كائن الإعدادات `firebaseConfig` (يحتوي: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
   - هذه القيم **عامة (public)** وتُوضع في كود الواجهة.

## 3. الحصول على مفاتيح VAPID (مفتاح عام)
VAPID يسمح للمتصفح بالاشتراك في الإشعارات:
1. من Firebase Console → **Project Settings → Cloud Messaging**.
2. في قسم **Web Push certificates** اضغط **Generate key pair**.
3. ستظهر **Key pair** — هذه سلسلة واحدة (مثل `BOV1AY...`). انسخها.
4. ضعها في ملف `.env` في مشروعك:

```
VITE_FCM_VAPID_KEY=نسخ-مفتاح-الفابيد-هنا
```

> هذا المفتاح عام ويُدمج مع الكود أثناء البناء (يتغير اسم المتغير `VITE_` حسب نوع المشروع: Vue = `VITE_`، Next.js = `NEXT_PUBLIC_`).

## 4. الحصول على حساب الخدمة (Service Account) — سرّي جداً
يُستخدم من **دالة الخادم** لتوقيع طلب OAuth والحصول على إذن إرسال رسائل:
1. Firebase Console → **Project Settings → Service accounts**.
2. اضغط **Generate new private key** → سيتم تنزيل ملف JSON (اسمه مثل `firebase-adminsdk-...json`).
3. **لا ترفعه إلى GitHub أبداً** — استخدمه فقط كقيمة لمتغير في Vercel.

## 5. إعداد المتغيرات السرية في Vercel
1. ارفع مشروعك إلى [Vercel](https://vercel.com) (استيراد من GitHub).
2. في المشروع → **Settings → Environment Variables** أضف:
   - الاسم: `FCM_SERVICE_ACCOUNT`
   - القيمة: **محتوى ملف JSON كاملاً** (المحتوى، وليس اسم المتغير داخل الملف)
   - Environment: **Production** (+ Preview إن أردت)
3. **أعد النشر (Redeploy)** — المتغيرات لا تسري إلا بعد إعادة نشر.

أو عبر CLI:
```bash
vercel env add FCM_SERVICE_ACCOUNT production
# ثم الصق الـ JSON
```

---

## 6. الملفات المطلوبة في مشروعك

### 6.1 `public/firebase-messaging-sw.js`
هذا هو Service Worker الذي يسجّله FCM تلقائياً عند `getToken()`. **يجب أن يكون موجوداً وإلا فشل التسجيل**:
```js
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'من-الكود-الخاص-بك',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.firebasestorage.app',
  messagingSenderId: 'رقم',
  appId: '1:رقم:web:...',
});

const messaging = firebase.messaging();

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'موقعك';
  const body = notification.body || data.body || '';
  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  };
  // لا تُظهر إشعاراً إذا كان الموقع مفتوحاً ومرئياً (لتجنب التكرار)
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ('visibilityState' in client && client.visibilityState === 'visible') return undefined;
    }
    return self.registration.showNotification(title, options);
  });
});
```

### 6.2 ملف الإشعارات في الواجهة `notifications.js`
```js
import { getMessaging, isSupported, getToken, onMessage, deleteToken } from 'firebase/messaging';

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

// استقبال رسالة أثناء فتح الموقع (Foreground)
export const subscribeForeground = async (fbApp, onNotify) => {
  const ok = await isNotifSupported();
  if (!ok) return () => {};
  const m = await getMessagingInstance(fbApp);
  if (cleanupForeground) cleanupForeground();
  cleanupForeground = onMessage(m, (payload) => {
    const title = payload?.notification?.title || 'موقعك';
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

export const playNotifSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.65);
    o.onended = () => ctx.close();
  } catch { /* ignore */ }
};
```

### 6.3 دالة الإرسال `api/send-push.js`
**تُنشر على Vercel** — تستخدم حساب الخدمة لتوقيع JWT وإرسال الرسالة:
```js
import crypto from 'node:crypto';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const FCM_SEND_URL = 'https://fcm.googleapis.com/v1/projects';

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function readServiceAccount() {
  if (process.env.FCM_SERVICE_ACCOUNT) {
    try { return JSON.parse(process.env.FCM_SERVICE_ACCOUNT); } catch { /* ignore */ }
  }
  return null;
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email, scope: FCM_SCOPE, aud: OAUTH_URL, iat: now, exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('FCM auth failed: ' + JSON.stringify(json));
  return json.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rawBody = typeof req.body === 'string' ? req.body : (req.body && typeof req.body === 'object' ? JSON.stringify(req.body) : '{}');
    const body = JSON.parse(rawBody || '{}');
    const tokens = Array.isArray(body.tokens) ? body.tokens.slice(0, 500) : [];
    if (tokens.length === 0) return res.status(400).json({ error: 'No tokens' });

    const sa = readServiceAccount();
    if (!sa) return res.status(500).json({ error: 'FCM service account not configured' });

    const accessToken = await getAccessToken(sa);
    const notification = { title: String(body.title || 'موقعك'), body: String(body.body || '') };
    const data = {};
    if (body.data && typeof body.data === 'object') {
      for (const [k, v] of Object.entries(body.data)) data[k] = String(v);
    }

    let sent = 0, failed = 0;
    for (const token of tokens) {
      try {
        const r = await fetch(`${FCM_SEND_URL}/${encodeURIComponent(sa.project_id)}/messages:send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            message: { token, notification, data,
              webpush: { fcm_options: { link: data.url || '/' }, headers: { Urgency: 'high' } } },
          }),
        });
        r.ok ? sent++ : failed++;
      } catch { failed++; }
    }
    return res.status(200).json({ sent, failed, invalidCount: 0 });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
```

### 6.4 ربط كل شيء في الواجهة (مثال React)
```jsx
import { getMessaging } from 'firebase/messaging';
import { requestNotifToken, subscribeForeground, playNotifSound } from './notifications';

// زر "تفعيل الإشعارات" (يجب أن يُستدعى من ضغطة مستخدم)
const enable = async () => {
  try {
    const token = await requestNotifToken(app); // app = initializeApp(firebaseConfig)
    await saveTokenToYourBackend(token);        // احفظ الرمز في قاعدة بياناتك
  } catch (e) {
    console.error('فشل التفعيل:', e);
  }
};

// استقبال أثناء فتح الموقع
useEffect(() => {
  subscribeForeground(app, ({ title, body }) => {
    playNotifSound();
    showToast({ title, body }); // رسالة داخل التطبيق فقط
  });
}, []);

// إرسال إشعار للجميع (من لوحة تحكم المسؤول)
const sendToAll = async (title, body) => {
  const res = await fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, data: { url: '/' }, tokens: allTokens }),
  });
  console.log(await res.json());
};
```

---

## 7. نقاط مهمة ومشاكل شائعة
| المشكلة | الحل |
|---|---|
| `messaging/failed-service-worker-registration` | تأكد أن `firebase-messaging-sw.js` موجود في جذر الموقع (مجلد `public`). |
| خطأ MIME `text/html` | الملف غير موجود في النشر — أعد رفع الملف وإعادة النشر. |
| `"[object Object]" is not valid JSON` | دالة الخادم تستقبل `req.body` ككائن — استخدم المعالجة أعلاه في 6.3. |
| `FCM service account not configured` | لم تضف متغير `FCM_SERVICE_ACCOUNT` في Vercel، أو لم تعد النشر. |
| الإشعار يصل مرتين | أزل `new Notification()` من الواجهة، وأضف فحص «الموقع مرئي» في الـ SW. |
| لا يعمل على الآيفون | ثبّت الموقع كتطبيق (Share → Add to Home Screen) ثم افتحه من الشاشة الرئيسية (iOS 16.4+). |
| الصوت لا يعمل | iOS يصدر صوت النظام فقط، ولا يصدر إن كان الهاتف على الصامت. |

## 8. ملخص الرموز السرية
| الرمز | أين أحصل عليه | سري؟ | يوضع في |
|---|---|---|---|
| `firebaseConfig` (apiKey, projectId, messagingSenderId, appId) | Firebase → Project Settings → Your apps | لا (عام) | كود الواجهة |
| `VITE_FCM_VAPID_KEY` | Firebase → Cloud Messaging → Web Push certificates | لا (عام) | `.env` |
| `FCM_SERVICE_ACCOUNT` (ملف JSON كامل) | Firebase → Project Settings → Service accounts → Generate new private key | **نعم (سري جداً)** | متغير Vercel فقط، ولا يُرفع إلى GitHub |

---

# 🔵 English / بالإنجليزية

## 1. Overview
This guide explains how to add a Web Push notification system (FCM) to any website — the same one used in the fire-tracker project. It works on:
- Desktop browsers (Chrome / Edge / Firefox)
- iPhone Safari (iOS 16.4+) **only when the site is installed as a PWA on the home screen**
- While the site is closed (notifications arrive even when the app is not open)

Components:
1. **Firebase** — issues device tokens and sends messages (FCM)
2. **Service Worker** — `firebase-messaging-sw.js`, receives messages in the background
3. **Server function** (`api/send-push.js`) — sends via FCM HTTP v1 (browsers cannot send directly)
4. **Vercel** — hosts the send function and the secret env variables

## 2. Create a Firebase project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → enter a name → create.
3. **Project Settings ⚙️ → General → Your apps** → click the web icon `</>`:
   - Enter an app nickname (you don't need Firebase Hosting).
   - Copy the `firebaseConfig` object (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
   - These values are **public** and go into the frontend code.

## 3. Get the VAPID key (public)
VAPID lets the browser subscribe to notifications:
1. Firebase Console → **Project Settings → Cloud Messaging**.
2. Under **Web Push certificates** click **Generate key pair**.
3. Copy the **Key pair** string (e.g. `BOV1AY...`).
4. Put it in your project's `.env`:

```
VITE_FCM_VAPID_KEY=paste-your-vapid-key-here
```

> Public key, inlined at build time (rename `VITE_` for other frameworks, e.g. `NEXT_PUBLIC_` in Next.js).

## 4. Get the Service Account (very secret)
Used by the **server function** to sign an OAuth request and get permission to send:
1. Firebase Console → **Project Settings → Service accounts**.
2. Click **Generate new private key** → a JSON file downloads (e.g. `firebase-adminsdk-....json`).
3. **Never commit it to GitHub** — only paste its content as a Vercel env value.

## 5. Set secrets in Vercel
1. Deploy your project to [Vercel](https://vercel.com) (import from GitHub).
2. Project → **Settings → Environment Variables** → add:
   - Name: `FCM_SERVICE_ACCOUNT`
   - Value: the **full JSON content** (the content, not a variable name inside the file)
   - Environment: **Production** (+ Preview if needed)
3. **Redeploy** — env vars only apply after a new deployment.

Or via CLI:
```bash
vercel env add FCM_SERVICE_ACCOUNT production
# then paste the JSON
```

## 6. Required files in your project

### 6.1 `public/firebase-messaging-sw.js`
The service worker FCM registers automatically on `getToken()`. **It must exist or registration fails**:
```js
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'your-api-key',
  authDomain: 'your-project.firebaseapp.com',
  projectId: 'your-project',
  storageBucket: 'your-project.firebasestorage.app',
  messagingSenderId: 'number',
  appId: '1:number:web:...',
});

const messaging = firebase.messaging();

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'Your site';
  const body = notification.body || data.body || '';
  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: data.url || '/' },
  };
  // Skip if the site is visible (avoids duplicates)
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ('visibilityState' in client && client.visibilityState === 'visible') return undefined;
    }
    return self.registration.showNotification(title, options);
  });
});
```

### 6.2 Frontend `notifications.js`
```js
import { getMessaging, isSupported, getToken, onMessage, deleteToken } from 'firebase/messaging';

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

// Foreground messages (site open)
export const subscribeForeground = async (fbApp, onNotify) => {
  const ok = await isNotifSupported();
  if (!ok) return () => {};
  const m = await getMessagingInstance(fbApp);
  if (cleanupForeground) cleanupForeground();
  cleanupForeground = onMessage(m, (payload) => {
    const title = payload?.notification?.title || 'Your site';
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

export const playNotifSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.65);
    o.onended = () => ctx.close();
  } catch { /* ignore */ }
};
```

### 6.3 Send function `api/send-push.js`
Deploy on Vercel — signs a JWT with the service account and sends the message:
```js
import crypto from 'node:crypto';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const FCM_SEND_URL = 'https://fcm.googleapis.com/v1/projects';

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function readServiceAccount() {
  if (process.env.FCM_SERVICE_ACCOUNT) {
    try { return JSON.parse(process.env.FCM_SERVICE_ACCOUNT); } catch { /* ignore */ }
  }
  return null;
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email, scope: FCM_SCOPE, aud: OAUTH_URL, iat: now, exp: now + 3600,
  }));
  const unsigned = `${header}.${payload}`;
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('FCM auth failed: ' + JSON.stringify(json));
  return json.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rawBody = typeof req.body === 'string' ? req.body : (req.body && typeof req.body === 'object' ? JSON.stringify(req.body) : '{}');
    const body = JSON.parse(rawBody || '{}');
    const tokens = Array.isArray(body.tokens) ? body.tokens.slice(0, 500) : [];
    if (tokens.length === 0) return res.status(400).json({ error: 'No tokens' });

    const sa = readServiceAccount();
    if (!sa) return res.status(500).json({ error: 'FCM service account not configured' });

    const accessToken = await getAccessToken(sa);
    const notification = { title: String(body.title || 'Your site'), body: String(body.body || '') };
    const data = {};
    if (body.data && typeof body.data === 'object') {
      for (const [k, v] of Object.entries(body.data)) data[k] = String(v);
    }

    let sent = 0, failed = 0;
    for (const token of tokens) {
      try {
        const r = await fetch(`${FCM_SEND_URL}/${encodeURIComponent(sa.project_id)}/messages:send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            message: { token, notification, data,
              webpush: { fcm_options: { link: data.url || '/' }, headers: { Urgency: 'high' } } },
          }),
        });
        r.ok ? sent++ : failed++;
      } catch { failed++; }
    }
    return res.status(200).json({ sent, failed, invalidCount: 0 });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
```

### 6.4 Wiring it up (React example)
```jsx
import { getMessaging } from 'firebase/messaging';
import { requestNotifToken, subscribeForeground, playNotifSound } from './notifications';

// "Enable notifications" button (must run from a user gesture)
const enable = async () => {
  try {
    const token = await requestNotifToken(app); // app = initializeApp(firebaseConfig)
    await saveTokenToYourBackend(token);
  } catch (e) {
    console.error('Enable failed:', e);
  }
};

useEffect(() => {
  subscribeForeground(app, ({ title, body }) => {
    playNotifSound();
    showToast({ title, body }); // in-app message only
  });
}, []);

const sendToAll = async (title, body) => {
  const res = await fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, data: { url: '/' }, tokens: allTokens }),
  });
  console.log(await res.json());
};
```

## 7. Common problems
| Problem | Solution |
|---|---|
| `messaging/failed-service-worker-registration` | Ensure `firebase-messaging-sw.js` exists at the site root (`public` folder). |
| MIME error `text/html` | The file is missing in the deployment — redeploy it. |
| `"[object Object]" is not valid JSON` | The server receives `req.body` as an object — use the parsing in 6.3. |
| `FCM service account not configured` | `FCM_SERVICE_ACCOUNT` env var missing in Vercel or not redeployed. |
| Duplicate notifications | Remove `new Notification()` from the frontend; add the "visible site" check in the SW. |
| Not working on iPhone | Install the site as an app (Share → Add to Home Screen), open it from the home screen (iOS 16.4+). |
| No sound | iOS plays the system sound only; it won't ring when the phone is on silent. |

## 8. Secrets summary
| Secret | Where to get it | Secret? | Where it goes |
|---|---|---|---|
| `firebaseConfig` (apiKey, projectId, messagingSenderId, appId) | Firebase → Project Settings → Your apps | No (public) | Frontend code |
| `VITE_FCM_VAPID_KEY` | Firebase → Cloud Messaging → Web Push certificates | No (public) | `.env` |
| `FCM_SERVICE_ACCOUNT` (full JSON file) | Firebase → Project Settings → Service accounts → Generate new private key | **Yes (top secret)** | Vercel env var only; never in GitHub |
