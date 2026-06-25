// Vercel serverless — Proxy WAHA pour connecter WhatsApp en SELF-SERVE (QR affiché dans l'app).
// La clé WAHA reste côté serveur, jamais exposée au navigateur.
//
// ISOLATION : une session WAHA PAR COMPTE (nom = uid du compte). Chaque commerce a SON numéro,
//   indépendant des autres. WAHA 2026.6.1+ autorise les sessions illimitées gratuitement
//   -> le numéro d'un compte n'écrase JAMAIS celui d'un autre, même connectés en même temps.
//
// Actions (en-tête Authorization: Bearer <jwt supabase> requis) :
//   POST /api/waha?action=start   -> démarre/assure la session, renvoie { status, number }
//   GET  /api/waha?action=status  -> { status, number }
//   GET  /api/waha?action=qr      -> { qr: "data:image/png;base64,..." } ou { qr:null }
//   POST /api/waha?action=logout  -> déconnecte le numéro

// SESSION est calculé PAR REQUÊTE dans le handler = uid du compte connecté (voir ci-dessous) -> isolation par compte.

async function getUser(token, SUPA, SR) {
  if (!token) return null;
  try {
    const r = await fetch(SUPA + '/auth/v1/user', { headers: { apikey: SR, Authorization: 'Bearer ' + token } });
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
  const WAHA = (process.env.WAHA_URL || '').replace(/\/$/, '');
  const KEY = process.env.WAHA_API_KEY;
  const SUPA = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const SR = process.env.SUPABASE_SERVICE_ROLE;
  if (!WAHA || !KEY) return res.status(500).json({ error: 'WAHA non configuré côté serveur.' });

  // Auth : seul un compte Nexus connecté peut connecter un WhatsApp
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = await getUser(token, SUPA, SR);
  if (!user || !user.id) return res.status(401).json({ error: 'Connexion à ton compte Nexus requise.' });

  // Session WAHA PROPRE à ce compte (isolation) : nom = uid nettoyé.
  // -> le numéro WhatsApp d'un compte n'écrase jamais celui d'un autre, même connectés en même temps.
  const SESSION = 'u' + String(user.id).replace(/[^a-zA-Z0-9]/g, '');

  const action = req.query.action;
  const H = { 'X-Api-Key': KEY, 'Content-Type': 'application/json' };

  const getStatus = async () => {
    const r = await fetch(WAHA + '/api/sessions/' + SESSION, { headers: { 'X-Api-Key': KEY } });
    if (r.status === 404) return { exists: false, status: 'STOPPED', number: null };
    if (!r.ok) return { exists: true, status: 'UNKNOWN', number: null };
    const s = await r.json();
    const me = s.me || {};
    return { exists: true, status: s.status || 'UNKNOWN', number: me.id || me.pushName || null };
  };

  try {
    if (action === 'status') {
      const st = await getStatus();
      // Connecté + numéro -> on l'enregistre dans le profil du compte.
      // INDISPENSABLE : le robot Inbound résout le tenant via business_profiles.phone = numéro du commerce.
      // Sans ça, l'IA WhatsApp ne sait pas à quel compte appartient le message (TENANT_NOT_FOUND).
      if (st.status === 'WORKING' && st.number) {
        const digits = String(st.number).replace(/[^0-9]/g, '');
        if (digits.length >= 8) {
          try {
            await fetch(SUPA + '/rest/v1/business_profiles?tenant_id=eq.' + encodeURIComponent(user.id), {
              method: 'PATCH',
              headers: { apikey: SR, Authorization: 'Bearer ' + SR, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
              body: JSON.stringify({ phone: digits })
            });
          } catch (e) { /* non bloquant */ }
        }
      }
      return res.status(200).json(st);
    }

    if (action === 'start') {
      const st = await getStatus();
      // Pas connecté -> on (re)crée une session propre pour obtenir un QR frais.
      // (Une session FAILED/STOPPED ne redonne pas toujours un QR via un simple /start -> on supprime + recrée.)
      if (st.status !== 'WORKING') {
        if (st.exists) { await fetch(WAHA + '/api/sessions/' + SESSION, { method: 'DELETE', headers: H }).catch(() => {}); }
        // PAS de webhook ici, VOLONTAIREMENT (choix Augustin 25/06) : aucune auto-réponse de l'IA.
        // Connecter un numéro = JUSTE lier le numéro. Personne ne reçoit de réponse automatique.
        // Pour activer l'IA plus tard (sur un numéro DÉDIÉ aux clients, pas perso) :
        //   ajouter config:{webhooks:[{url:'.../webhook/nexus-waha-inbound',events:['message']}]} + allumer le robot n8n.
        await fetch(WAHA + '/api/sessions', { method: 'POST', headers: H, body: JSON.stringify({ name: SESSION, start: true }) }).catch(() => {});
      }
      return res.status(200).json(await getStatus());
    }

    if (action === 'qr') {
      const r = await fetch(WAHA + '/api/' + SESSION + '/auth/qr?format=image', { headers: { 'X-Api-Key': KEY } });
      if (!r.ok) return res.status(200).json({ qr: null }); // déjà connecté ou pas encore prêt
      const buf = Buffer.from(await r.arrayBuffer());
      return res.status(200).json({ qr: 'data:image/png;base64,' + buf.toString('base64') });
    }

    if (action === 'logout') {
      await fetch(WAHA + '/api/sessions/' + SESSION + '/logout', { method: 'POST', headers: H }).catch(() => {});
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Action inconnue.' });
  } catch (e) {
    return res.status(502).json({ error: 'WAHA injoignable', detail: String(e).slice(0, 120) });
  }
}
