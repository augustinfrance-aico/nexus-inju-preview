// /api/health — endpoint de monitoring Nexus (Augustin 08/06/2026)
// Public read-only : permet de vérifier que l'app + Supabase + Vercel répondent.
// JAMAIS de service_role ici (endpoint exposé publiquement). On utilise la anon key.

const SUPABASE_URL = 'https://rehyeczydjimvkauuast.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaHllY3p5ZGppbXZrYXV1YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Njc5MTAsImV4cCI6MjA5NjI0MzkxMH0.3aqTEm-OaXZxGI63BBofTLWnewjGd7lWdO_0Clfg-6Y';

const TABLES = [
  'business_profiles','clients','conversations','messages','auto_campaigns',
  'campaigns','credits','cart_recovery_runs','escalation_log','integrations',
  'agenda_items','vacances_config'
];

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const started = Date.now();
  const checks = { app: 'ok', supabase: 'unknown', tables: 0, latency_ms: 0, errors: [] };

  // Test 1 : ping chaque table via HEAD/count (anon ne voit rien → 200 OK avec []
  // mais la table doit exister, sinon 404). On compte les tables qui répondent 200/206.
  try {
    const results = await Promise.all(TABLES.map(async (t) => {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=tenant_id&limit=0`, {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
            Prefer: 'count=exact'
          }
        });
        return r.ok;
      } catch(_) { return false; }
    }));
    const accessible = results.filter(Boolean).length;
    checks.tables = accessible;
    checks.supabase = accessible === TABLES.length ? 'ok' : 'partial_' + accessible + '_of_' + TABLES.length;
    if (accessible < TABLES.length) checks.errors.push(`${TABLES.length - accessible} table(s) inaccessibles`);
  } catch (e) {
    checks.supabase = 'unreachable';
    checks.errors.push('supabase_unreachable: ' + (e.message || 'unknown'));
  }

  checks.latency_ms = Date.now() - started;

  const allOk = checks.app === 'ok' && checks.supabase === 'ok' && checks.tables === TABLES.length;
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    ...checks,
    expected_tables: TABLES.length
  });
};
