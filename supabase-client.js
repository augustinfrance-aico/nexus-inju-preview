/* ============================================================
   NEXUS — Cloud Layer Supabase v1 (Augustin 04/06/2026)
   Branche l'app à Supabase pour Auth + Profil entreprise.
   Mode démo intact si pas connecté (zéro régression M1).
   ============================================================ */
(function() {
  'use strict';

  // anon public = safe côté browser tant que RLS est activé (oui, on l'a fait dans le SQL).
  const SUPABASE_URL = 'https://rehyeczydjimvkauuast.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaHllY3p5ZGppbXZrYXV1YXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Njc5MTAsImV4cCI6MjA5NjI0MzkxMH0.3aqTEm-OaXZxGI63BBofTLWnewjGd7lWdO_0Clfg-6Y';

  // Le SDK est chargé via <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js">
  function whenSdkReady(cb, tries) {
    if (window.supabase && typeof window.supabase.createClient === 'function') return cb();
    if ((tries || 0) > 80) { console.warn('[NxCloud] Supabase SDK introuvable après 4s'); return; }
    setTimeout(() => whenSdkReady(cb, (tries || 0) + 1), 50);
  }

  whenSdkReady(() => {
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    // ============================================================
    // Mapping JS state ↔ colonnes BDD (snake_case côté Postgres)
    // ============================================================
    function profileFromDb(row) {
      if (!row) return null;
      return {
        name: row.name || '',
        owner: row.owner || '',
        ownerPhone: row.owner_phone || '',
        mercadoPagoHandle: row.mercado_pago_handle || '',
        city: row.city || '',
        country: row.country || '',
        logo: row.logo || '🏪',
        logoType: row.logo_type || 'emoji',
        industry: row.industry || '',
        description: row.description || '',
        dataArchives: row.data_archives || '',
        composition: row.composition || '',
        webPage: row.web_page || '',
        catalogUrl: row.catalog_url || '',
        hours: row.hours || {},
        tone: row.tone || '',
        faq: row.faq || [],
        catalog: row.catalog || [],
        payment: row.payment || '',
        delivery: row.delivery || '',
        tagline: row.tagline || ''
      };
    }
    function profileToDb(p, tenantId) {
      const row = {
        tenant_id: tenantId,
        name: p.name || '',
        owner: p.owner || '',
        mercado_pago_handle: p.mercadoPagoHandle || '',
        city: p.city || '',
        country: p.country || '',
        logo: p.logo || '🏪',
        logo_type: p.logoType || 'emoji',
        industry: p.industry || '',
        description: p.description || '',
        data_archives: p.dataArchives || '',
        composition: p.composition || '',
        web_page: p.webPage || '',
        catalog_url: p.catalogUrl || '',
        hours: p.hours || {},
        tone: p.tone || '',
        faq: p.faq || [],
        catalog: p.catalog || [],
        payment: p.payment || '',
        delivery: p.delivery || '',
        tagline: p.tagline || ''
      };
      // V5 fix (10/06) : owner_phone n'a PAS de champ d'édition dans l'app — si on pousse
      // une valeur vide, on écrase celle posée en base (et l'escalade WhatsApp casse).
      // On n'envoie le champ que s'il est rempli ; sinon la base garde sa valeur.
      if (p.ownerPhone) row.owner_phone = p.ownerPhone;
      return row;
    }

    // ============================================================
    // API publique : window.NxCloud
    // ============================================================
    const NxCloud = {
      client,
      _user: null,
      _ready: false,

      // ----- AUTH -----
      async signInWithMagicLink(email) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return { ok: false, error: 'Email invalide' };
        }
        const { data, error } = await client.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true, data };
      },
      async signInWithPassword(email, password) {
        if (!email || !password) return { ok: false, error: 'Email et mot de passe requis' };
        const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return { ok: false, error: error.message };
        this._user = data.user;
        return { ok: true, data };
      },
      async signOut() {
        const { error } = await client.auth.signOut();
        this._user = null;
        return error ? { ok: false, error: error.message } : { ok: true };
      },
      async getUser() {
        const { data, error } = await client.auth.getUser();
        if (error || !data.user) return null;
        this._user = data.user;
        return data.user;
      },
      isAuthed() { return !!this._user; },
      onAuthChange(cb) {
        return client.auth.onAuthStateChange((event, session) => {
          this._user = session ? session.user : null;
          try { cb(event, session); } catch(e) { console.warn('[NxCloud] onAuthChange handler', e); }
        });
      },

      // ----- PROFILE ENTREPRISE -----
      async getProfile() {
        const user = this._user || await this.getUser();
        if (!user) return null;
        const { data, error } = await client
          .from('business_profiles')
          .select('*')
          .eq('tenant_id', user.id)
          .maybeSingle();
        if (error) { console.warn('[NxCloud] getProfile', error); return null; }
        return profileFromDb(data);
      },
      async upsertProfile(profileObj) {
        const user = this._user || await this.getUser();
        if (!user) return { ok: false, error: 'Pas connecté' };
        const row = profileToDb(profileObj, user.id);
        const { data, error } = await client
          .from('business_profiles')
          .upsert(row, { onConflict: 'tenant_id' })
          .select()
          .single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: profileFromDb(data) };
      },

      // ----- DIAGNOSTICS -----
      async ping() {
        try {
          const { error } = await client.from('business_profiles').select('tenant_id').limit(1);
          return error ? { ok: false, error: error.message } : { ok: true };
        } catch(e) { return { ok: false, error: e.message }; }
      },

      // ============================================================
      // PHASE B — CRUD générique pour les 10 tables restantes
      // ============================================================
      async listAll(tableName) {
        const user = this._user || await this.getUser();
        if (!user) return { ok: false, error: 'Pas connecté', data: [] };
        const { data, error } = await client.from(tableName).select('*');
        if (error) return { ok: false, error: error.message, data: [] };
        return { ok: true, data: data || [] };
      },
      async upsertOne(tableName, row, onConflict) {
        const user = this._user || await this.getUser();
        if (!user) return { ok: false, error: 'Pas connecté' };
        const payload = Object.assign({}, row, { tenant_id: user.id });
        const opts = onConflict ? { onConflict } : undefined;
        const { data, error } = await client.from(tableName).upsert(payload, opts).select().single();
        if (error) return { ok: false, error: error.message };
        return { ok: true, data };
      },
      async bulkUpsert(tableName, rows, onConflict) {
        const user = this._user || await this.getUser();
        if (!user) return { ok: false, error: 'Pas connecté' };
        if (!rows || !rows.length) return { ok: true, data: [] };
        const payload = rows.map(r => Object.assign({}, r, { tenant_id: user.id }));
        const opts = onConflict ? { onConflict } : undefined;
        const { data, error } = await client.from(tableName).upsert(payload, opts).select();
        if (error) return { ok: false, error: error.message };
        return { ok: true, data: data || [] };
      },
      async deleteOne(tableName, idField, idValue) {
        const user = this._user || await this.getUser();
        if (!user) return { ok: false, error: 'Pas connecté' };
        const { error } = await client.from(tableName).delete().eq(idField, idValue);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
      },

      // V5 (10/06) — appel RPC Postgres authentifié (ex: nexus_sign_action pour signer
      // les ordres app -> n8n sans exposer le secret dans le navigateur)
      async rpc(fnName, args) {
        const user = this._user || await this.getUser();
        if (!user) return { ok: false, error: 'Pas connecté' };
        const { data, error } = await client.rpc(fnName, args || {});
        if (error) return { ok: false, error: error.message };
        return { ok: true, data };
      },

      version: '1.2.0-V5',
      tablesScope: ['business_profiles','clients','conversations','messages','auto_campaigns','campaigns','credits','cart_recovery_runs','escalation_log','integrations','agenda_items','vacances_config']
    };

    window.NxCloud = NxCloud;

    // Au boot : restaure la session si présente
    NxCloud.getUser().finally(() => {
      NxCloud._ready = true;
      document.dispatchEvent(new CustomEvent('nx-cloud-ready', { detail: { user: NxCloud._user } }));
    });

    // Réagit aux changements d'auth (login / logout / magic link réussi)
    NxCloud.onAuthChange((event) => {
      document.dispatchEvent(new CustomEvent('nx-cloud-auth', { detail: { event, user: NxCloud._user } }));
    });
  });
})();
