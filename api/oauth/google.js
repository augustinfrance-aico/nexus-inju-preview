// Vercel serverless — Google OAuth SELF-SERVE : chaque compte (tenant) connecte SON Google Calendar lui-même.
// Flux :
//   GET /api/oauth/google?action=start&token=<supabase_access_token>   -> 302 vers le consentement Google
//   GET /api/oauth/google?code=...&state=...                           -> échange le code, stocke le refresh_token, redirige vers l'app
//   GET /api/oauth/google?action=status&token=<supabase_access_token>  -> { connected, email }
//
// Sécurité :
//   - Le refresh_token n'est JAMAIS renvoyé au navigateur (stocké côté serveur via service_role, table google_tokens).
//   - Le `state` est signé (HMAC) pour empêcher qu'un attaquant lie SON Google au compte d'une victime.
//   - L'identité du compte est vérifiée via le JWT Supabase avant de démarrer le flux.
//
// Env Vercel requises : GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE

import crypto from 'crypto';

const REDIRECT_URI = 'https://nexus-inju.vercel.app/api/oauth/google';
const APP_URL = 'https://nexus-inju.vercel.app/app.html';
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid', 'email', 'profile'
].join(' ');

// state signé pour empêcher la falsification (account-linking attack)
function signState(uid, secret) {
  const sig = crypto.createHmac('sha256', secret).update(uid).digest('hex').slice(0, 32);
  return uid + '.' + sig;
}
function verifyState(state, secret) {
  const parts = String(state || '').split('.');
  if (parts.length !== 2) return null;
  const [uid, sig] = parts;
  const expected = crypto.createHmac('sha256', secret).update(uid).digest('hex').slice(0, 32);
  // comparaison à temps constant
  if (sig.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? uid : null;
}

// vérifie le JWT Supabase de l'utilisateur -> renvoie { id, email } ou null
async function getUser(token, SUPA, SR) {
  if (!token) return null;
  try {
    const r = await fetch(SUPA + '/auth/v1/user', {
      headers: { apikey: SR, Authorization: 'Bearer ' + token }
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS — sinon le navigateur bloque le POST (Authorization) avec "Failed to fetch"
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const SUPA = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SR = process.env.SUPABASE_SERVICE_ROLE;

  if (!CLIENT_ID || !CLIENT_SECRET || !SUPA || !SR) {
    return res.status(500).send('OAuth Google non configuré (variables d\'environnement manquantes côté serveur).');
  }

  const { action, code, state } = req.query;
  // Le jeton du compte est lu dans l'en-tête Authorization (jamais dans l'URL = pas de fuite en logs/historique)
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token || null);

  // --- CALLBACK Google (présence d'un `code`) ---
  if (code) {
    const uid = verifyState(state, SR);
    if (!uid) return res.redirect(302, APP_URL + '?google=error');
    try {
      const tokRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        })
      });
      const data = await tokRes.json();
      if (!tokRes.ok) {
        console.error('Google token exchange error:', data);
        return res.redirect(302, APP_URL + '?google=error');
      }

      // email depuis l'id_token (lecture du payload, sans vérif lourde — informatif seulement)
      let email = null;
      try {
        if (data.id_token) {
          const payload = JSON.parse(Buffer.from(data.id_token.split('.')[1], 'base64').toString('utf8'));
          email = payload.email || null;
        }
      } catch { /* ignore */ }

      // upsert serveur (service_role -> bypass RLS) dans google_tokens
      const up = await fetch(SUPA + '/rest/v1/google_tokens', {
        method: 'POST',
        headers: {
          apikey: SR,
          Authorization: 'Bearer ' + SR,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          tenant_id: uid,
          email,
          refresh_token: data.refresh_token || null,
          access_token: data.access_token || null,
          expiry: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      });
      if (!up.ok) {
        console.error('Supabase store token error:', await up.text());
        return res.redirect(302, APP_URL + '?google=error');
      }
      return res.redirect(302, APP_URL + '?google=connected');
    } catch (e) {
      console.error('OAuth callback error:', e);
      return res.redirect(302, APP_URL + '?google=error');
    }
  }

  // --- START : rediriger vers le consentement Google ---
  if (action === 'start') {
    const user = await getUser(token, SUPA, SR);
    if (!user || !user.id) return res.status(401).send('Connexion à ton compte Nexus requise avant de connecter Google.');
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state: signState(user.id, SR)
    }).toString();
    return res.redirect(302, url);
  }

  // --- STATUS : l'app demande si CE compte est connecté ---
  if (action === 'status') {
    const user = await getUser(token, SUPA, SR);
    if (!user || !user.id) return res.status(401).json({ connected: false });
    try {
      const r = await fetch(
        SUPA + '/rest/v1/google_tokens?tenant_id=eq.' + encodeURIComponent(user.id) + '&select=email,connected_at',
        { headers: { apikey: SR, Authorization: 'Bearer ' + SR } }
      );
      const rows = r.ok ? await r.json() : [];
      if (Array.isArray(rows) && rows.length) {
        return res.status(200).json({ connected: true, email: rows[0].email, connected_at: rows[0].connected_at });
      }
      return res.status(200).json({ connected: false });
    } catch {
      return res.status(200).json({ connected: false });
    }
  }

  // --- DISCONNECT : supprime le jeton Google de CE compte ---
  if (action === 'disconnect') {
    const user = await getUser(token, SUPA, SR);
    if (!user || !user.id) return res.status(401).json({ ok: false });
    try {
      await fetch(SUPA + '/rest/v1/google_tokens?tenant_id=eq.' + encodeURIComponent(user.id), {
        method: 'DELETE',
        headers: { apikey: SR, Authorization: 'Bearer ' + SR }
      });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(200).json({ ok: false });
    }
  }

  return res.status(400).send('Action inconnue.');
}
