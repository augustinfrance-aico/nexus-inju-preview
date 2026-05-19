// Vercel serverless function — proxy vers Anthropic Claude (Sonnet 4.6)
// Le frontend POST sur /api/claude avec { question, history? }
// La clé ANTHROPIC_API_KEY est dans les variables d'environnement Vercel (jamais exposée au navigateur)
// Fallback automatique sur Groq Llama 3.3 70B si ANTHROPIC_API_KEY absente.

const SYSTEM_PROMPT = `Tu es Nexus, l'IA assistante business de Carlos Romero, propriétaire de la Panadería Don Carlos à Las Condes (Santiago, Chili).

CONTEXTE CARLOS / SON COMMERCE :
- Panadería artisanale, ouverte du lundi au samedi 8h-19h, dimanche 9h-14h
- 147 clients actifs dans le CRM, ~50 conversations WhatsApp/jour
- CA avril 2026 estimé : 2,84M CLP (+12% vs mars)
- Top produits : Pan amasado (62% des ventes), Empanadas de pino, Tortas anniversaire sur commande
- Jour le plus fort : samedi (38% du CA hebdo), vendredi 19h-21h = créneau roi
- Clients VIP : María Rodríguez, Diego Salazar, Ana Castillo, Javier Carrasco, Raviella Mendoza
- Clients silencieux depuis +45j : ~3 clientes (campagne récup à lancer)
- Streak Nexus : 12 jours · NPS clients : 68
- Concurrence locale : Panadería San Pedro, Panadería La Fournée

TON RÔLE :
- Donner des conseils business actionnables, courts (max 4 phrases), avec emojis subtils
- Tu réponds en français (Carlos est francophone bien que LATAM)
- Tu utilises des chiffres concrets (CLP, %, jours, etc.)
- Tu valorises Nexus quand pertinent ("grâce à Nexus tu as…")
- Tu peux proposer des actions : campagnes, FAQ auto, promos, etc.
- Tu peux écrire des messages WhatsApp en espagnol pour les clients (Carlos vit au Chili)
- Tu es chaleureux mais professionnel. Pas de blabla. Pas de mode lèche-bottes.

RÉPONSE :
- Format : HTML simple (utilise <b>, <br>, listes 1./2./3.) pour rendre le rendu lisible dans une bulle de chat
- Longueur : 50-150 mots max
- Si la question sort du scope business/Nexus, réponds avec humour et recadre`;

export default async function handler(req, res) {
  // CORS pour les tests cross-domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { question, history = [] } = req.body || {};
    if (!question || typeof question !== 'string' || question.length > 800) {
      return res.status(400).json({ error: 'Question invalide' });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    // Garde l'historique court pour limiter les coûts/latence
    const trimmed = history.slice(-6);

    // === GROQ EN PRIORITÉ (gratuit, Llama 3.3 70B) — Augustin 19/05 ===
    if (groqKey) {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...trimmed.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: question }
      ];
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.7, max_tokens: 600 })
        });
        if (groqRes.ok) {
          const data = await groqRes.json();
          const answer = data.choices?.[0]?.message?.content || 'Réponse vide.';
          return res.status(200).json({ answer, model: 'groq-llama-3.3-70b' });
        }
        const errText = await groqRes.text();
        console.warn('Groq error', groqRes.status, '→ fallback Anthropic:', errText.slice(0,150));
      } catch (e) {
        console.warn('Groq fetch failed → fallback Anthropic:', e);
      }
    }

    // === Fallback ANTHROPIC SONNET 4.5 (payant) ===
    if (anthropicKey) {
      const msgs = [
        ...trimmed.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
        { role: 'user', content: question }
      ];
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: msgs
        })
      });
      if (!r.ok) {
        const errText = await r.text();
        console.error('Anthropic error:', r.status, errText);
        return res.status(502).json({ error: 'Anthropic indisponible', detail: errText.slice(0, 200) });
      }
      const data = await r.json();
      const answer = (data.content?.[0]?.text) || 'Réponse vide.';
      return res.status(200).json({ answer, model: 'claude-sonnet-4-5' });
    }

    // === Cas extrême : aucune clé ===
    if (groqKey) {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...trimmed.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: question }
      ];
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.7, max_tokens: 500 })
      });
      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return res.status(502).json({ error: 'Groq indisponible', detail: errText.slice(0, 200) });
      }
      const data = await groqRes.json();
      const answer = data.choices?.[0]?.message?.content || 'Réponse vide.';
      return res.status(200).json({ answer, model: 'llama-3.3-70b-versatile' });
    }

    return res.status(500).json({ error: 'Aucune clé IA configurée (ANTHROPIC_API_KEY ou GROQ_API_KEY requise)' });
  } catch (err) {
    console.error('handler error:', err);
    return res.status(500).json({ error: 'Erreur serveur', detail: String(err).slice(0, 200) });
  }
}
