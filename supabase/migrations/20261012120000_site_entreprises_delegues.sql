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
  -- Pas unique : deux entreprises d'un même employeur (ex. HEIDELBERG carrières et construction) partagent
  -- le même n° d'entreprise et le même ONSS (décision de Fred, 13/10/2026).
  numero_bce text,
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
  -- Autres entreprises CG Link regroupées dans cette fiche (ex. XLG HOME rachetée par TRIXXO) : leurs
  -- affiliés s'additionnent, leurs délégués sont repris dans cette fiche (lot B).
  autres_company_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Pas de contrainte « nom obligatoire hors CG Link » : si CG Link supprime l'entreprise, company_id passe
  -- à null et la contrainte bloquerait la suppression dans CG Link. Le nom est exigé par l'app (nomManquant).
  constraint site_entreprises_bce_check
    check (numero_bce is null or numero_bce ~ '^[01][0-9]{9}$')
);
-- Mise à niveau des tables créées par une version précédente de ce fichier (create table if not exists ne
-- modifie pas une table existante) :
alter table public.site_entreprises drop constraint if exists site_entreprises_nom_check;
alter table public.site_entreprises drop constraint if exists site_entreprises_numero_bce_key;
alter table public.site_entreprises add column if not exists autres_company_ids uuid[] not null default '{}';
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
  numero_ue text,
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
  constraint site_entreprise_unites_numero_check check (numero_ue is null or numero_ue ~ '^[2-8][0-9]{9}$'),
  -- Unique par fiche : deux fiches d'un même n° d'entreprise peuvent reprendre les mêmes unités.
  constraint site_entreprise_unites_numero_unique unique (entreprise_id, numero_ue)
);
comment on table public.site_entreprise_unites is 'Unités d''établissement (BCE ou encodées à la main).';
create index if not exists site_entreprise_unites_entreprise_idx on public.site_entreprise_unites (entreprise_id);
-- Mise à niveau : n° d'unité unique par fiche (et non plus dans toute la table).
alter table public.site_entreprise_unites drop constraint if exists site_entreprise_unites_numero_ue_key;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_entreprise_unites_numero_unique') then
    alter table public.site_entreprise_unites
      add constraint site_entreprise_unites_numero_unique unique (entreprise_id, numero_ue);
  end if;
end $$;

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

-- ── Remplissage initial (Fred, 12 et 13/10/2026). Source : supabase/donnees/entreprises-2026-10-12.csv
--    (tableau de Fred : 91 entreprises, n° BCE, ONSS et libellés, commentaire → notes), plus :
--    - HEIDELBERG MATERIALS BENELUX : entreprise distincte de HEIDELBERG (construction / carrières), même
--      n° d'entreprise et même ONSS ;
--    - IL&C LUXEMBOURG : fiche ajoutée, n° BCE à compléter ;
--    - XLG HOME (rachetée par TRIXXO) : pas de fiche, regroupée dans TRIXXO (affiliés additionnés) ;
--    - les ONSS présents dans CG Link mais absents du tableau sont repris aussi (libellés de CG Link).
--    Rapprochement par le nom exact de CG Link (vérifié le 13/10/2026 : 91/91). Rejouable sans doublon.
-- Un seul bloc : le SQL Editor de Supabase peut exécuter chaque requête sur une connexion différente, et une
-- table temporaire n'existe que sur la connexion qui l'a créée.
do $remplissage$
begin
drop table if exists pg_temp.site_import_entreprises;
create temporary table site_import_entreprises (nom_cglink text, numero_bce text, notes text, onss jsonb);
insert into site_import_entreprises (nom_cglink, numero_bce, notes, onss) values
  ('AGC', '0413638187', null, '[{"n": "039055109", "l": null}]'::jsonb),
  ('AIR PRODUCTS', '0402052330', null, '[{"n": "191766671", "l": null}]'::jsonb),
  ('ALE CINEY', '0455495766', null, '[{"n": "130928659", "l": null}]'::jsonb),
  ('ALE NAMUR', '0456342438', null, '[{"n": "128411703", "l": null}]'::jsonb),
  ('AMPACET', '0428477704', null, '[{"n": "111392762", "l": null}]'::jsonb),
  ('ARTES TW', '0449710707', null, '[{"n": "119077296", "l": null}]'::jsonb),
  ('ATELIER 85', '0402582662', null, '[{"n": "029176144", "l": null}]'::jsonb),
  ('ATELIER ST VINCENT', '0414231471', null, '[{"n": "039255026", "l": null}]'::jsonb),
  ('AUTAJON', '0402682929', null, '[{"n": "011517294", "l": null}]'::jsonb),
  ('AVIENT', '0401430738', null, '[{"n": "030717571", "l": null}]'::jsonb),
  ('AZAE', '0892989918', null, '[{"n": "133046654", "l": null}]'::jsonb),
  ('BAJART', '0415486929', null, '[{"n": "040142673", "l": null}]'::jsonb),
  ('BELAIR', '0473806396', null, '[{"n": "126582671", "l": null}]'::jsonb),
  ('BELDICO', '0432680178', null, '[{"n": "113154185", "l": null}]'::jsonb),
  ('BPMN', '0425351235', null, '[{"n": "110468546", "l": null}]'::jsonb),
  ('BURGO', '0451821842', null, '[{"n": "119802371", "l": null}]'::jsonb),
  ('CARMEUSE', '0431473519', null, '[{"n": "112643480", "l": null}]'::jsonb),
  ('CARP', '0407844715', null, '[{"n": "032756026", "l": null}]'::jsonb),
  ('CHASSIS NORMA', '0408411372', null, '[{"n": "035714720", "l": null}]'::jsonb),
  ('CHIMSCO', '0477199121', null, '[{"n": "127716892", "l": null}]'::jsonb),
  ('DA HOME', '0400523292', null, '[{"n": "028704142", "l": null}]'::jsonb),
  ('DE GRAEVE', '0402528323', null, '[{"n": "031233029", "l": null}]'::jsonb),
  ('DUCHENE', '0405619851', null, '[{"n": "010575230", "l": null}]'::jsonb),
  ('EEG', '0442891013', null, '[{"n": "159055943", "l": null}]'::jsonb),
  ('EKLOZIO', '1008333410', null, '[{"n": "148972793", "l": null}]'::jsonb),
  ('ENROBES DU GERNY', '0428849074', null, '[{"n": "111427197", "l": null}]'::jsonb),
  ('ENTRANAM', '0407273801', null, '[{"n": "032184502", "l": null}]'::jsonb),
  ('ERDA', '0874244271', null, '[{"n": "130756484", "l": null}]'::jsonb),
  ('ETA BEAURAING', '0407845903', null, '[{"n": "034547616", "l": null}]'::jsonb),
  ('FOURNIPAC', '0457234739', null, '[{"n": "121617920", "l": null}]'::jsonb),
  ('FRUITIER', '0428884411', null, '[{"n": "111551357", "l": null}]'::jsonb),
  ('G4S', '0411519431', null, '[{"n": "035908817", "l": null}]'::jsonb),
  ('GROUPE FRANCOIS', '0464376018', null, '[{"n": "124405603", "l": null}]'::jsonb),
  ('HALIN & FILS', '0421413332', null, '[{"n": "047464136", "l": null}]'::jsonb),
  ('HEIDELBERG', '0400465290', 'Inclus SAGREX', '[{"n": "017066373", "l": null}]'::jsonb),
  ('HOLZINDUSTRIE PAULS', '0438004488', null, '[{"n": "115885123", "l": null}]'::jsonb),
  ('HOME CLEAN', '0865284243', null, '[{"n": "129698020", "l": null}]'::jsonb),
  ('HOUYOUX', '0404358950', null, '[{"n": "030350523", "l": null}]'::jsonb),
  ('IBV', '0466169132', null, '[{"n": "125886017", "l": null}]'::jsonb),
  ('ICM', '0428583414', null, '[{"n": "111103023", "l": null}]'::jsonb),
  ('ICTS', '0434170614', null, '[{"n": "163605049", "l": null}]'::jsonb),
  ('IL&C NAMUR', '0878765659', null, '[{"n": "131412010", "l": null}]'::jsonb),
  ('INEOS INOVYN', '0403147638', 'Inclus Solvay', '[{"n": "022072349", "l": null}, {"n": "116605736", "l": "Solvay Chimie - Bruxelles"}]'::jsonb),
  ('ISS', '0403313330', null, '[{"n": "174020036", "l": null}]'::jsonb),
  ('JINDAL', '0554887213', null, '[{"n": "139647989", "l": null}]'::jsonb),
  ('KRINKELS', '0821547933', null, '[{"n": "184853481", "l": null}]'::jsonb),
  ('L ATELIER', '0407884307', null, '[{"n": "030349456", "l": null}]'::jsonb),
  ('LA LORRAINE', '0412131719', null, '[{"n": "036354144", "l": null}]'::jsonb),
  ('LAURENTY', '0402349862', null, '[{"n": "034649757", "l": null}]'::jsonb),
  ('LES DAUPHINS', '0429051883', null, '[{"n": "111069752", "l": null}]'::jsonb),
  ('LES HAUTES ARDENNES', '0407574994', null, '[{"n": "032214863", "l": null}]'::jsonb),
  ('LHOIST DOLOMIES MLD', '0425225234', '=Groupe LHOIST', '[{"n": "112290206", "l": null}]'::jsonb),
  ('LHOIST DW', '0403948679', null, '[{"n": "012144593", "l": null}]'::jsonb),
  ('LHOIST JEMELLE', '0402321950', null, '[{"n": "119953497", "l": null}]'::jsonb),
  ('LOREAL', '0468475455', null, '[{"n": "125977294", "l": null}]'::jsonb),
  ('MARLUX', '0439579056', null, '[{"n": "157643332", "l": null}]'::jsonb),
  ('MB ECO CONSTRUCTIONS', '0864085205', null, '[{"n": "129521092", "l": null}]'::jsonb),
  ('MOBIX', '0430013470', null, '[{"n": "112100377", "l": null}]'::jsonb),
  ('NONET', '0417072581', null, '[{"n": "041538891", "l": null}]'::jsonb),
  ('NUTONS', '0422918317', null, '[{"n": "048506304", "l": null}]'::jsonb),
  ('PEPINIERES LA GAUME', '0417548673', null, '[{"n": "042222353", "l": null}]'::jsonb),
  ('PIERRET EXTRUSION', '0469623817', null, '[{"n": "126199424", "l": null}]'::jsonb),
  ('PIERRET PROJECT', '0831341270', null, '[{"n": "136325351", "l": null}]'::jsonb),
  ('POLE DES SERVICES', '0837414856', null, '[{"n": "136998046", "l": null}]'::jsonb),
  ('PROTECTION UNIT', '0457632142', null, '[{"n": "124461863", "l": null}]'::jsonb),
  ('PROXI SERVICES', '0872774227', null, '[{"n": "130596046", "l": null}]'::jsonb),
  ('REMACLE', '0402569893', null, '[{"n": "015166531", "l": null}]'::jsonb),
  ('REMONDIS', '0838611322', null, '[{"n": "137053724", "l": null}]'::jsonb),
  ('RONVEAUX', '0439480076', null, '[{"n": "012783629", "l": null}]'::jsonb),
  ('SAUPONT', '0407713665', null, '[{"n": "034547034", "l": null}]'::jsonb),
  ('SERIS', '0404770607', null, '[{"n": "050177226", "l": null}]'::jsonb),
  ('SERVIPLAST', '0416287970', null, '[{"n": "040602453", "l": null}]'::jsonb),
  ('SIGNAROUTE', '0474519050', null, '[{"n": "137007649", "l": null}]'::jsonb),
  ('SIGNODE', '0461026449', null, '[{"n": "123152460", "l": null}]'::jsonb),
  ('SMB', '0431842812', null, '[{"n": "112548129", "l": null}]'::jsonb),
  ('SOBEMO', '0437848991', null, '[{"n": "115169069", "l": null}]'::jsonb),
  ('SOCOGETRA', '0442280903', null, '[{"n": "117028462", "l": null}]'::jsonb),
  ('ST GOBAIN BASTOGNE', '0400865465', 'AUTOVER', '[{"n": "066377390", "l": null}]'::jsonb),
  ('STALLBOIS', '0407149877', null, '[{"n": "033112889", "l": null}]'::jsonb),
  ('T&D', '0830397501', 'TUTELA NOVITAS', '[{"n": "186695123", "l": null}]'::jsonb),
  ('TEMPO TEAM', '0467127056', null, '[{"n": "172103704", "l": null}]'::jsonb),
  ('TEMPS LIBRE', '0890485338', null, '[{"n": "132943640", "l": null}]'::jsonb),
  ('THYMOLUX', '0889156042', null, '[{"n": "133562694", "l": null}]'::jsonb),
  ('TP BAT', '0848805725', null, '[{"n": "138503389", "l": null}]'::jsonb),
  ('TP HOME', '0415776939', null, '[{"n": "041300077", "l": null}]'::jsonb),
  ('TRIXXO', '0808674647', null, '[{"n": "184044404", "l": null}, {"n": "173916731", "l": "TRIXXO I - Bilzen"}, {"n": "100418764", "l": "TRIXXO IX - Bilzen"}, {"n": "131624343", "l": "XLG HOME"}]'::jsonb),
  ('UNILIN', '0405414072', null, '[{"n": "065672491", "l": null}]'::jsonb),
  ('V3 MANUPAL', '0407763749', null, '[{"n": "032921702", "l": null}]'::jsonb),
  ('VIGICORE', '0479108833', null, '[{"n": "129254439", "l": null}]'::jsonb),
  ('WIAME NET', '0479444175', null, '[{"n": "128571559", "l": null}]'::jsonb),
  ('WUST', '0402443595', null, '[{"n": "033349375", "l": null}]'::jsonb),
  ('HEIDELBERG MATERIALS BENELUX', '0400465290', null, '[]'::jsonb),
  ('IL&C LUXEMBOURG', null, null, '[]'::jsonb);

insert into public.site_entreprises (company_id, numero_bce, notes)
select c.id, i.numero_bce, i.notes
from site_import_entreprises i
join public.companies c on c.name = i.nom_cglink
where not exists (select 1 from public.site_entreprises e where e.company_id = c.id);

-- Fiches déjà créées par une version précédente : n° BCE et notes complétés s'ils sont vides.
update public.site_entreprises e
set numero_bce = coalesce(e.numero_bce, i.numero_bce), notes = coalesce(e.notes, i.notes)
from site_import_entreprises i
join public.companies c on c.name = i.nom_cglink
where e.company_id = c.id and (e.numero_bce is null or e.notes is null);

-- XLG HOME n'a pas de fiche propre (regroupée dans TRIXXO) : fiche supprimée si une version précédente l'a créée
-- et qu'aucun délégué n'y est encore rattaché.
delete from public.site_entreprises e
using public.companies x
where e.company_id = x.id and x.name = 'XLG HOME'
  and not exists (select 1 from public.site_delegues d where d.entreprise_id = e.id);

insert into public.site_entreprise_sites (entreprise_id, nom, principal)
select e.id, 'Site principal', true from public.site_entreprises e
where not exists (select 1 from public.site_entreprise_sites s where s.entreprise_id = e.id and s.principal);

-- ONSS du tableau (avec leurs libellés)
insert into public.site_entreprise_onss (entreprise_id, numero, libelle)
select distinct on (e.id, o ->> 'n') e.id, o ->> 'n', o ->> 'l'
from site_import_entreprises i
join public.companies c on c.name = i.nom_cglink
join public.site_entreprises e on e.company_id = c.id
cross join lateral jsonb_array_elements(i.onss) as o
order by e.id, o ->> 'n'
on conflict (entreprise_id, numero) do update
  set libelle = coalesce(public.site_entreprise_onss.libelle, excluded.libelle);

-- ONSS de CG Link absents du tableau (TRIXXO, WUST, HEIDELBERG MATERIALS BENELUX, IL&C LUXEMBOURG)
insert into public.site_entreprise_onss (entreprise_id, numero, libelle)
select distinct on (e.id, x.numero) e.id, x.numero, x.libelle
from public.site_entreprises e
join public.companies c on c.id = e.company_id
cross join lateral (values
  (1, regexp_replace(coalesce(c.onss, ''), '\D', '', 'g'), null::text),
  (2, regexp_replace(coalesce(c.onss2, ''), '\D', '', 'g'), nullif(btrim(c.onss2_label), '')),
  (3, regexp_replace(coalesce(c.onss3, ''), '\D', '', 'g'), nullif(btrim(c.onss3_label), '')),
  (4, regexp_replace(coalesce(c.onss4, ''), '\D', '', 'g'), nullif(btrim(c.onss4_label), ''))
) as x(rang, numero, libelle)
where x.numero <> ''
order by e.id, x.numero, x.rang
on conflict (entreprise_id, numero) do nothing;

-- XLG HOME regroupée dans TRIXXO
update public.site_entreprises e
set autres_company_ids = array_append(e.autres_company_ids, x.id)
from public.companies t, public.companies x
where e.company_id = t.id and t.name = 'TRIXXO' and x.name = 'XLG HOME'
  and not (x.id = any (e.autres_company_ids));

drop table if exists pg_temp.site_import_entreprises;
end
$remplissage$;
