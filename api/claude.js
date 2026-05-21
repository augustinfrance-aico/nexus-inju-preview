// Vercel serverless function — proxy vers Anthropic Claude (Sonnet 4.6)
// Le frontend POST sur /api/claude avec { question, history? }
// La clé ANTHROPIC_API_KEY est dans les variables d'environnement Vercel (jamais exposée au navigateur)
// Fallback automatique sur Groq Llama 3.3 70B si ANTHROPIC_API_KEY absente.

// SYSTEM_PROMPT générique — les vraies données viennent dans la question (contexte injecté côté front)
// Fix Augustin 20/05 : avant, l'IA inventait les chiffres car le SYSTEM avait des faits hardcodés
const SYSTEM_PROMPT = `Tu es Nexus, l'IA assistante business intégrée dans une plateforme SaaS pour PME en Amérique Latine.

RÈGLE ABSOLUE — SOURCES DE VÉRITÉ :
- Si la question contient un bloc [PROFIL ENTREPRISE — utiliser UNIQUEMENT ces données], tu DOIS te baser EXCLUSIVEMENT sur ces données pour répondre.
- Si la question contient un bloc [CONTEXTE CRM RÉEL], idem.
- Si l'utilisateur te demande "quand a été créée l'entreprise", "qui est dans l'équipe", "quelle est l'adresse", etc. → tu cherches dans le profil fourni. Tu ne devines JAMAIS.
- Si une info n'est PAS dans le profil fourni, tu réponds honnêtement : "Cette info n'est pas encore dans ton profil. Veux-tu l'ajouter ?" — tu NE devines PAS.

TON RÔLE :
- Donner des conseils business actionnables, courts (max 4 phrases), avec emojis subtils
- Tu réponds dans la langue de l'utilisateur (français par défaut, sauf si la question est en espagnol/anglais)
- Tu utilises les chiffres réels du profil quand pertinent
- Tu peux proposer des actions : campagnes, FAQ auto, promos, messages WhatsApp en espagnol pour les clients LATAM
- Tu es chaleureux mais professionnel. Pas de blabla. Pas de mode lèche-bottes.

RÉPONSE :
- Format : HTML simple (utilise <b>, <br>, listes 1./2./3.) pour rendre le rendu lisible dans une bulle de chat
- Longueur : 50-200 mots max
- Si la question sort du scope business, réponds avec humour et recadre`;

export default async function handler(req, res) {
  // CORS pour les tests cross-domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { question, history = [] } = req.body || {};
    // Limite étendue à 8000 chars (Augustin 20/05 : avant 800 trop court quand on injecte profil + CRM contexte)
    if (!question || typeof question !== 'string' || question.length > 8000) {
      return res.status(400).json({ error: 'Question invalide (max 8000 chars)', received: question?.length || 0 });
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
