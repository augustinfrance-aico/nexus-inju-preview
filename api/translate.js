// Vercel serverless function — proxy traduction batch via Anthropic Claude
// POST /api/translate avec { texts: ["...","..."], target: "es"|"en", source?: "fr" }
// Réponse : { translations: ["...","..."], model: "claude-sonnet-4-5" }
// Note : on traduit en batch JSON pour économiser tokens. Cache fait côté frontend.

const TRANSLATE_SYSTEM = `You are a precise translator for a SaaS app called Nexus, used by a Chilean bakery owner.

RULES:
- Translate ONLY the text content from the source language to the target language.
- PRESERVE exactly: emojis, numbers, percentages, HTML tags (<b>, <i>, <br>, etc.), placeholders like {n}, {name}, {qty}.
- DO NOT translate brand names: Nexus, Nexus Core, Nexus Finance, Carlos, María, Diego, Ana, Javier, Raviella, WhatsApp, Gmail, Calendar, Google, Claude, Stripe, Loom, Vercel.
- DO NOT translate product names: empanadas, pan amasado, bolos, panadería.
- DO NOT translate place names: Providencia, Las Condes, Santiago.
- KEEP punctuation style of target language (e.g. Spanish uses ¿ ?, ¡ !).
- KEEP the same tone (warm, professional, concise).
- Output ONLY a JSON array of strings, same order as input. No commentary, no markdown, no code fences.

EXAMPLE input: ["Conversations aujourd'hui", "Taux de réponse"]
EXAMPLE output (target=en): ["Conversations today","Response rate"]
EXAMPLE output (target=es): ["Conversaciones hoy","Tasa de respuesta"]`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { texts, target, source = 'fr' } = req.body || {};
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'texts (array) requis' });
    }
    if (texts.length > 200) {
      return res.status(400).json({ error: 'max 200 textes par batch' });
    }
    if (!['es', 'en', 'fr'].includes(target)) {
      return res.status(400).json({ error: 'target doit être "es", "en" ou "fr"' });
    }
    if (target === source) {
      return res.status(200).json({ translations: texts, model: 'noop' });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      // Fallback gracieux : on renvoie les textes inchangés + 503 pour indiquer service indisponible
      return res.status(503).json({
        translations: texts,
        model: 'none',
        target,
        count: texts.length,
        error: 'ANTHROPIC_API_KEY manquante — fallback original texts'
      });
    }

    const langName = target === 'es' ? 'Spanish (es-ES)' : target === 'en' ? 'English (en-US)' : 'French (fr-FR)';
    const sourceName = source === 'fr' ? 'French' : source === 'es' ? 'Spanish' : 'English';

    const userMsg = `Translate from ${sourceName} to ${langName}.

Input (JSON array of ${texts.length} strings):
${JSON.stringify(texts)}

Output (JSON array of ${texts.length} translated strings, same order):`;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: TRANSLATE_SYSTEM,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('Anthropic translate error:', r.status, errText);
      return res.status(502).json({ error: 'Anthropic indisponible', detail: errText.slice(0, 300) });
    }

    const data = await r.json();
    const raw = data.content?.[0]?.text || '[]';
    let translations;
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      translations = JSON.parse(match ? match[0] : raw);
    } catch (e) {
      console.error('Parse error:', e, raw.slice(0, 200));
      return res.status(502).json({ error: 'Réponse invalide', raw: raw.slice(0, 200) });
    }

    if (!Array.isArray(translations) || translations.length !== texts.length) {
      return res.status(502).json({ error: 'Longueur réponse incorrecte', got: translations?.length, expected: texts.length });
    }

    return res.status(200).json({
      translations,
      model: 'claude-sonnet-4-5',
      target,
      count: texts.length
    });
  } catch (err) {
    console.error('translate handler error:', err);
    return res.status(500).json({ error: 'Erreur serveur', detail: String(err).slice(0, 200) });
  }
}
