-- ════════════════════════════════════════════════════════════════════════════
-- Apps « Entreprises » et « Gestion délégués CG Link » : tables, sécurité, catalogue.
-- Base CG Link (partagée) — tables préfixées site_. Migration autorisée par Fred le 12/10/2026.
-- Idempotente : peut être rejouée. Spec : docs/superpowers/specs/2026-10-12-entreprises-delegues-design.md
--
-- Sécurité (RÈGLE D'OR : chaque table a sa serrure RLS) :
--   - tables entreprises : lecture / écriture si site_a_app('entreprises') (session de l'utilisateur) ;
--   - tables délégués : lecture si app entreprises ou delegues ; écriture UNIQUEMENT en service_role
--     (actions serveur réservées aux SUPER_ADMIN) ;
--   - anon (site public) n'a aucun droit.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.site_entreprises_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── Entreprises ─────────────────────────────────────────────────────────────
create table if not exists public.site_entreprises (
  id uuid primary key default gen_random_uuid(),
  company_id uuid unique references public.companies(id) on delete set null,
  nom text,
  numero_bce text unique,
  denomination_bce text,
  siege_rue text,
  siege_numero text,
  siege_boite text,
  siege_code_postal text,
  siege_localite text,
  ref_nom text,
  ref_fonction text,
  ref_email text,
  ref_telephone text,
  bce_importe_le timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Pas de contrainte « nom obligatoire hors CG Link » : si CG Link supprime l'entreprise, company_id passe
  -- à null et la contrainte bloquerait la suppression dans CG Link. Le nom est exigé par l'app (nomManquant).
  constraint site_entreprises_bce_check
    check (numero_bce is null or numero_bce ~ '^[01][0-9]{9}$')
);
alter table public.site_entreprises drop constraint if exists site_entreprises_nom_check;
comment on table public.site_entreprises is
  'Fiches entreprises de l''Espace CG (app entreprises). company_id = lien CG Link (null = hors CG Link).';

create table if not exists public.site_entreprise_sites (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.site_entreprises(id) on delete cascade,
  nom text not null,
  principal boolean not null default false,
  unite_postale_id uuid,
  ref_nom text,
  ref_fonction text,
  ref_email text,
  ref_telephone text,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.site_entreprise_sites is
  'Sites d''exploitation = UTE des élections sociales. Un seul site principal par entreprise.';
create unique index if not exists site_entreprise_sites_principal_idx
  on public.site_entreprise_sites (entreprise_id) where principal;
create index if not exists site_entreprise_sites_entreprise_idx on public.site_entreprise_sites (entreprise_id);

create table if not exists public.site_entreprise_unites (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.site_entreprises(id) on delete cascade,
  site_id uuid references public.site_entreprise_sites(id) on delete set null,
  numero_ue text unique,
  denomination text,
  rue text,
  numero text,
  boite text,
  code_postal text,
  localite text,
  statut text not null default 'actif'
    constraint site_entreprise_unites_statut_check check (statut in ('actif', 'arrete')),
  date_debut date,
  origine text not null default 'manuel'
    constraint site_entreprise_unites_origine_check check (origine in ('bce', 'manuel')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_entreprise_unites_numero_check check (numero_ue is null or numero_ue ~ '^[2-8][0-9]{9}$')
);
comment on table public.site_entreprise_unites is 'Unités d''établissement (BCE ou encodées à la main).';
create index if not exists site_entreprise_unites_entreprise_idx on public.site_entreprise_unites (entreprise_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_entreprise_sites_unite_postale_fkey') then
    alter table public.site_entreprise_sites
      add constraint site_entreprise_sites_unite_postale_fkey
      foreign key (unite_postale_id) references public.site_entreprise_unites(id) on delete set null;
  end if;
end $$;

create table if not exists public.site_entreprise_onss (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.site_entreprises(id) on delete cascade,
  site_id uuid references public.site_entreprise_sites(id) on delete set null,
  numero text not null constraint site_entreprise_onss_numero_check check (numero ~ '^[0-9]+$'),
  libelle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_entreprise_onss_unique unique (entreprise_id, numero)
);

-- ── Délégués (écrits en service_role uniquement, lot B) ─────────────────────
create table if not exists public.site_delegues (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.site_entreprises(id) on delete restrict,
  cglink_user_id uuid unique,
  prenom text,
  nom text not null,
  email text,
  telephone text,
  notes text,
  a_verifier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_delegues_entreprise_idx on public.site_delegues (entreprise_id);

create table if not exists public.site_delegue_mandats (
  id uuid primary key default gen_random_uuid(),
  delegue_id uuid not null references public.site_delegues(id) on delete cascade,
  site_id uuid references public.site_entreprise_sites(id) on delete set null,
  organe text not null
    constraint site_delegue_mandats_organe_check
    check (organe in ('ds', 'ce', 'cppt', 'cee', 'instances_cg', 'autre')),
  libelle text,
  qualite text constraint site_delegue_mandats_qualite_check check (qualite in ('effectif', 'suppleant')),
  fonction text,
  debut date,
  fin date,
  a_verifier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_delegue_mandats_qualite_requise
    check (organe not in ('ds', 'ce', 'cppt') or qualite is not null),
  constraint site_delegue_mandats_libelle_requis
    check (organe not in ('autre', 'instances_cg') or nullif(btrim(libelle), '') is not null)
);
create index if not exists site_delegue_mandats_delegue_idx on public.site_delegue_mandats (delegue_id);

create table if not exists public.site_ecarts_ignores (
  id uuid primary key default gen_random_uuid(),
  cible text not null constraint site_ecarts_ignores_cible_check check (cible in ('delegue', 'entreprise')),
  cible_id uuid not null,
  champ text not null,
  valeur text not null,
  ignore_par uuid,
  created_at timestamptz not null default now(),
  constraint site_ecarts_ignores_unique unique (cible, cible_id, champ, valeur)
);

create table if not exists public.site_journal_delegues (
  id uuid primary key default gen_random_uuid(),
  auteur_id uuid,
  delegue_id uuid,
  entreprise_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists site_journal_delegues_created_idx on public.site_journal_delegues (created_at desc);

-- ── updated_at ──────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['site_entreprises', 'site_entreprise_sites', 'site_entreprise_unites',
                           'site_entreprise_onss', 'site_delegues', 'site_delegue_mandats'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.site_entreprises_touch()', t || '_touch', t);
  end loop;
end $$;

-- ── RLS ─────────────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  -- Tables entreprises : tout, si l'app entreprises est donnée.
  foreach t in array array['site_entreprises', 'site_entreprise_sites', 'site_entreprise_unites', 'site_entreprise_onss'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_app', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.site_a_app(''entreprises''))) with check ((select public.site_a_app(''entreprises'')))', t || '_app', t);
  end loop;

  -- Délégués et mandats : lecture pour les deux apps, aucune écriture (service_role seulement).
  foreach t in array array['site_delegues', 'site_delegue_mandats'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.site_a_app(''entreprises'')) or (select public.site_a_app(''delegues'')))', t || '_select', t);
  end loop;

  -- Écarts ignorés et journal : lecture app delegues, écriture service_role seulement.
  foreach t in array array['site_ecarts_ignores', 'site_journal_delegues'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.site_a_app(''delegues'')))', t || '_select', t);
  end loop;
end $$;

-- ── Suppression d'un site : refusée pour le site principal (sauf suppression de l'entreprise entière) ;
--    unités, ONSS et mandats rejoignent le site principal dans la même transaction. security definer :
--    les mandats ne sont pas modifiables avec la session (lecture seule), le déplacement reste dans l'entreprise.
create or replace function public.site_entreprise_site_avant_suppression()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_principal uuid;
begin
  if old.principal then
    if exists (select 1 from public.site_entreprises where id = old.entreprise_id) then
      raise exception 'Le site principal ne peut pas être supprimé.' using errcode = 'P0001';
    end if;
    return old;
  end if;
  -- Suppression de l'entreprise entière (cascade) : rien à déplacer, tout part avec elle.
  if not exists (select 1 from public.site_entreprises where id = old.entreprise_id) then
    return old;
  end if;
  select id into v_principal from public.site_entreprise_sites where entreprise_id = old.entreprise_id and principal;
  if v_principal is not null then
    update public.site_entreprise_unites set site_id = v_principal where site_id = old.id;
    update public.site_entreprise_onss set site_id = v_principal where site_id = old.id;
    update public.site_delegue_mandats set site_id = v_principal where site_id = old.id;
  end if;
  return old;
end $$;
revoke all on function public.site_entreprise_site_avant_suppression() from public, anon;
drop trigger if exists site_entreprise_sites_avant_suppression on public.site_entreprise_sites;
create trigger site_entreprise_sites_avant_suppression before delete on public.site_entreprise_sites
  for each row execute function public.site_entreprise_site_avant_suppression();

-- ── Import BCE en une seule transaction (security invoker : la RLS de la session s'applique) ──
--    p_maj : champs de site_entreprises ; p_inserer : unités à créer (site principal) ;
--    p_modifier : [{ id, maj: { champ: valeur } }]. Tout ou rien.
create or replace function public.site_appliquer_bce(p_entreprise uuid, p_maj jsonb, p_inserer jsonb, p_modifier jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  v_site uuid;
  m jsonb;
  x jsonb;
begin
  if not (select public.site_a_app('entreprises')) then
    raise exception 'Accès refusé.' using errcode = '42501';
  end if;
  select id into v_site from public.site_entreprise_sites where entreprise_id = p_entreprise and principal;

  insert into public.site_entreprise_unites
    (entreprise_id, site_id, origine, numero_ue, denomination, rue, numero, boite, code_postal, localite, statut, date_debut)
  select p_entreprise, v_site, 'bce', r.numero_ue, r.denomination, r.rue, r.numero, r.boite, r.code_postal, r.localite,
         coalesce(r.statut, 'actif'), r.date_debut
  from jsonb_to_recordset(coalesce(p_inserer, '[]'::jsonb)) as r(
    numero_ue text, denomination text, rue text, numero text, boite text, code_postal text, localite text, statut text, date_debut date);

  for m in select * from jsonb_array_elements(coalesce(p_modifier, '[]'::jsonb)) loop
    x := m -> 'maj';
    update public.site_entreprise_unites u set
      denomination = case when x ? 'denomination' then x ->> 'denomination' else u.denomination end,
      rue          = case when x ? 'rue' then x ->> 'rue' else u.rue end,
      numero       = case when x ? 'numero' then x ->> 'numero' else u.numero end,
      boite        = case when x ? 'boite' then x ->> 'boite' else u.boite end,
      code_postal  = case when x ? 'code_postal' then x ->> 'code_postal' else u.code_postal end,
      localite     = case when x ? 'localite' then x ->> 'localite' else u.localite end,
      statut       = case when x ? 'statut' then x ->> 'statut' else u.statut end,
      date_debut   = case when x ? 'date_debut' then (x ->> 'date_debut')::date else u.date_debut end
    where u.id = (m ->> 'id')::uuid and u.entreprise_id = p_entreprise;
    if not found then
      raise exception 'Unité introuvable.' using errcode = 'P0002';
    end if;
  end loop;

  update public.site_entreprises e set
    denomination_bce  = case when p_maj ? 'denomination_bce' then p_maj ->> 'denomination_bce' else e.denomination_bce end,
    siege_rue         = case when p_maj ? 'siege_rue' then p_maj ->> 'siege_rue' else e.siege_rue end,
    siege_numero      = case when p_maj ? 'siege_numero' then p_maj ->> 'siege_numero' else e.siege_numero end,
    siege_boite       = case when p_maj ? 'siege_boite' then p_maj ->> 'siege_boite' else e.siege_boite end,
    siege_code_postal = case when p_maj ? 'siege_code_postal' then p_maj ->> 'siege_code_postal' else e.siege_code_postal end,
    siege_localite    = case when p_maj ? 'siege_localite' then p_maj ->> 'siege_localite' else e.siege_localite end,
    bce_importe_le    = now()
  where e.id = p_entreprise;
  if not found then
    raise exception 'Fiche introuvable.' using errcode = 'P0002';
  end if;
end $$;
revoke all on function public.site_appliquer_bce(uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.site_appliquer_bce(uuid, jsonb, jsonb, jsonb) to authenticated;

-- ── Affiliés actifs par entreprise et type de contrat (lu avec la session) ──
create or replace function public.site_compter_affilies()
returns table (company_id uuid, contract_type text, nombre bigint)
language sql stable security definer set search_path = public as $$
  select w.company_id, w.contract_type, count(*)::bigint
  from public.workers w
  where w.status = 'Actif'
    and ((select public.site_a_app('entreprises')) or (select public.site_a_app('delegues')))
  group by w.company_id, w.contract_type
$$;
revoke all on function public.site_compter_affilies() from public;
revoke all on function public.site_compter_affilies() from anon;
grant execute on function public.site_compter_affilies() to authenticated;

-- ── Catalogue des apps ──────────────────────────────────────────────────────
insert into public.site_apps (code, nom, description, icone, couleur, ordre, actif)
select 'entreprises', 'Entreprises', 'Fiches, BCE, sites, unités et bloc adresse', 'building', '#E69F00', 40, true
where not exists (select 1 from public.site_apps where code = 'entreprises');

insert into public.site_apps (code, nom, description, icone, couleur, ordre, actif)
select 'delegues', 'Gestion délégués CG Link', 'Délégués, mandats et comptes CG Link', 'id-card', '#CC79A7', 50, false
where not exists (select 1 from public.site_apps where code = 'delegues');

insert into public.site_app_roles (app_code, role)
select 'entreprises', r from unnest(array['ADMIN_OP', 'PERMANENT']) as r
where not exists (select 1 from public.site_app_roles where app_code = 'entreprises' and role = r);
