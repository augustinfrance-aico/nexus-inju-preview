-- ============================================================
-- V5 — RPC de signature pour les ponts App -> n8n
-- (Calendar / Escalade / Campagnes déclenchés depuis l'app)
--
-- Pourquoi : le secret HMAC (escalate_secret) ne doit JAMAIS
-- être dans le navigateur. L'app demande une signature à cette
-- fonction (authentifiée), et envoie la signature au webhook n8n.
-- Le workflow n8n recalcule et compare. Anti-rejeu : ts ±5 min.
--
-- À coller dans : Supabase Dashboard -> SQL Editor -> Run
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create or replace function public.nexus_sign_action(p_parts text[])
returns json
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_tenant   uuid := auth.uid();
  v_secret   text;
  v_ts       text := floor(extract(epoch from now()))::text;
  v_manifest text;
  v_sig      text;
begin
  if v_tenant is null then
    raise exception 'UNAUTHORIZED: not logged in';
  end if;
  if p_parts is null or array_length(p_parts, 1) is null or array_length(p_parts, 1) > 6 then
    raise exception 'BAD_REQUEST: p_parts must contain 1..6 elements';
  end if;

  select escalate_secret into v_secret
  from public.business_profiles
  where tenant_id = v_tenant;

  if v_secret is null or length(v_secret) < 16 then
    raise exception 'CONFIG_ERROR: escalate_secret missing for tenant';
  end if;

  -- Manifest = tenant_id|part1|part2|...|ts  (même format que les workflows n8n V4.3)
  v_manifest := v_tenant::text || '|' || array_to_string(p_parts, '|') || '|' || v_ts;
  v_sig := encode(extensions.hmac(convert_to(v_manifest, 'utf8'), convert_to(v_secret, 'utf8'), 'sha256'), 'hex');

  return json_build_object('tenant_id', v_tenant, 'ts', v_ts, 'signature', v_sig);
end $$;

-- Seuls les utilisateurs connectés peuvent signer, et uniquement pour LEUR tenant.
revoke execute on function public.nexus_sign_action(text[]) from public, anon;
grant execute on function public.nexus_sign_action(text[]) to authenticated;
