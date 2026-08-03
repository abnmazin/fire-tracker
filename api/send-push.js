import crypto from 'node:crypto';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const FCM_SEND_URL = 'https://fcm.googleapis.com/v1/projects';

const b64url = (buf) =>
  Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

function readServiceAccount() {
  if (process.env.FCM_SERVICE_ACCOUNT) {
    try { return JSON.parse(process.env.FCM_SERVICE_ACCOUNT); } catch (e) { /* ignore */ }
  }
  if (process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
    return {
      project_id: process.env.FCM_PROJECT_ID,
      client_email: process.env.FCM_CLIENT_EMAIL,
      private_key: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }
  return null;
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: FCM_SCOPE,
      aud: OAUTH_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const unsigned = `${header}.${payload}`;
  const sig = crypto
    .createSign('RSA-SHA256')
    .update(unsigned)
    .sign(sa.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const jwt = `${unsigned}.${sig}`;

  const res = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('FCM auth failed: ' + JSON.stringify(json));
  return json.access_token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const rawBody =
      typeof req.body === 'string'
        ? req.body
        : req.body && typeof req.body === 'object'
          ? JSON.stringify(req.body)
          : '{}';
    const body = JSON.parse(rawBody || '{}');
    const tokens = Array.isArray(body.tokens) ? body.tokens.slice(0, 500) : [];
    if (tokens.length === 0) return res.status(400).json({ error: 'No tokens' });

    const sa = readServiceAccount();
    if (!sa) return res.status(500).json({ error: 'FCM service account not configured' });

    const accessToken = await getAccessToken(sa);
    const data = { title: String(body.title || 'لجنة السلامة'), body: String(body.body || '') };
    if (body.data && typeof body.data === 'object') {
      for (const [k, v] of Object.entries(body.data)) data[k] = String(v);
    }

    let sent = 0;
    let failed = 0;
    const invalid = [];

    for (const token of tokens) {
      try {
        const r = await fetch(`${FCM_SEND_URL}/${encodeURIComponent(sa.project_id)}/messages:send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token,
              data,
              webpush: {
                fcm_options: { link: data.url || '/' },
                headers: { Urgency: 'high' },
              },
            },
          }),
        });
        if (r.ok) {
          sent++;
        } else {
          failed++;
          const t = await r.json().catch(() => ({}));
          const reason = t.error?.details?.[0]?.reason || t.error?.message || '';
          if (reason === 'UNREGISTERED' || /not-registered|invalid/i.test(reason)) invalid.push(token);
        }
      } catch (e) {
        failed++;
      }
    }

    return res.status(200).json({ sent, failed, invalidCount: invalid.length, failedTokens: invalid });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
