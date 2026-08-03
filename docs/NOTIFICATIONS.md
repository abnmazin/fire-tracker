# Notification system (FCM / Web Push)

The app ships with a full Web-Push notification system built on Firebase Cloud Messaging (FCM).

## What works out of the box (no config)
- **In-app alerts**: while the app is open, notifications triggered by status changes or near/overdue expiry appear as a toast with a beep sound.
- **Custom notification panel**: in إعدادات المطور → نظام الإشعارات, an admin can type a title + body and send it to all registered devices.
- **Trigger events** (sent automatically to ALL registered devices):
  1. An extinguisher's status becomes anything other than `صالحة` (e.g. `تحتاج صيانة`, `صيانة قريبة`, `تحتاج فحص`).
  2. An extinguisher's expiry (`nextDate`) is near or overdue (`تحتاج صيانة` / `صيانة قريبة`).
  3. Manual/custom notification from the settings panel.

Deduplication: each (extinguisher, status) transition and each (extinguisher, expiry date) is sent at most once (stored in `localStorage ft_notif_sent`).

## What needs setup for real push (app closed / other devices)
Real push (delivered even when the app is closed) requires three pieces:

### 1. Enable Cloud Messaging on the Firebase project
- Firebase console → your project (`fire-tracker-ed183`) → Project settings → **Cloud Messaging** tab.
- If needed, enable the API. Generate a **Web Push certificate** (VAPID key pair) there.

### 2. Client VAPID key
Create `.env` in the project root (copy `.env.example`):

```
VITE_FCM_VAPID_KEY=<paste the VAPID key "public key" from Firebase>
```

This is bundled into the client and used by `getToken()`.

### 3. Server-side sender (`api/send-push.js`)
The client cannot send FCM messages; the app calls `POST /api/send-push` (a Vercel serverless function) with the message + the registered device tokens. The function authenticates to FCM HTTP v1 with a signed JWT and pushes to every token.

Configure these environment variables in Vercel (Settings → Environment Variables):

```
FCM_SERVICE_ACCOUNT = {"type":"service_account", "project_id":"fire-tracker-ed183", "client_email":"...", "private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n", ...}
```

or the three individual variables `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` (the private key with `\n` escapes).

To create the service account: Firebase console → Project settings → Service accounts → **Generate new private key**. Store its JSON in the `FCM_SERVICE_ACCOUNT` env var (keep the exact JSON, it is not exposed to the client).

### Device tokens registry
Tokens are stored in Firestore at `artifacts/{appId}/public/data/app_data/notifTokens` as a doc with a `list` array. The client registers/unregisters its own token there; the sender collects them all (all devices → all users).

## iPhone (iOS) requirements — important
- iOS supports web push only from **iOS 16.4+** and **only in an installed PWA**:
  1. Open the site in **Safari**.
  2. Tap Share → **Add to Home Screen** (إضافة إلى الشاشة الرئيسية).
  3. Open the app **from the Home Screen** and enable notifications in إعدادات المطور.
- **Sound**: iOS plays the system notification sound only. It will not ring if the device is on silent/mute. Custom sounds are not supported by iOS web push.
- If notifications stop working, re-open the installed app once (Safari must be foregrounded) — iOS wakes the service worker on app use.

## Verification checklist
1. `VITE_FCM_VAPID_KEY` set in `.env`; rebuild.
2. Deploy with the `api/send-push.js` function and the `FCM_SERVICE_ACCOUNT` env var.
3. On a device: enable notifications (permission prompt → allow).
4. In the console: check the Firestore `app_data/notifTokens` doc has the token.
5. Send a custom notification from إعدادات المطور → the device should receive it (and play sound when not muted).

## Notes / limits
- Foreground notifications also play a short beep via WebAudio.
- The sender is the open client app: status/expiry triggers fire whenever the app is used and observes the change. Fully server-side (Firestore-triggered) sending would require a Firebase Cloud Function; not included here.
- `api/send-push.js` uses Node built-ins only (no extra npm deps).
