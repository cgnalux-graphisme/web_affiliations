-- ════════════════════════════════════════════════════════════════════════════
-- App « Libérations » (lot 1 : la demande) + registre national et genre des délégués.
-- Base CG Link (partagée) — tables préfixées site_. Décisions de Fred du 13/10/2026 :
-- docs/contexte/liberations.md. Idempotente : peut être rejouée.
--
-- Sécurité (RÈGLE D'OR : chaque table a sa serrure RLS) :
--   - dossiers et tout ce qui en dépend : LECTURE si site_a_app('liberations') ET (admin OU demandeur du dossier) ;
--     admin = ADMIN_OP ou SUPER_ADMIN (site_liberations_admin()). AUCUNE politique d'écriture : le code écrit
--     uniquement côté serveur (service_role) après avoir vérifié le droit ;
--   - lieux et taux kilométrique : lecture avec l'app ; écriture côté serveur (admins) ;
--   - bucket liberations : PRIVÉ et sans aucune politique (liens signés créés côté serveur) ;
--   - anon n'a aucun droit sur ces tables.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Délégués : registre national et genre (saisis à la main sur la carte, app Délégués) ──
alter table public.site_delegues add column if not exists registre_national text;
alter table public.site_delegues add column if not exists genre text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_delegues_registre_national_format') then
    alter table public.site_delegues add constraint site_delegues_registre_national_format
      check (registre_national is null or registre_national ~ '^[0-9]{11}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_delegues_genre_valeurs') then
    alter table public.site_delegues add constraint site_delegues_genre_valeurs
      check (genre is null or genre in ('M', 'F'));
  end if;
end $$;
comment on column public.site_delegues.registre_national is 'Numéro de registre national (11 chiffres), saisi à la main. Visible : SUPER_ADMIN, ADMIN_OP, permanents.';
comment on column public.site_delegues.genre is 'M = délégué, F = déléguée (accord des courriers de libération).';

-- ── Admin de l'app : ADMIN_OP ou SUPER_ADMIN, avec l'app ────────────────────
create or replace function public.site_liberations_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select (select public.site_a_app('liberations'))
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ADMIN_OP', 'SUPER_ADMIN'));
$$;
revoke all on function public.site_liberations_admin() from public, anon;
grant execute on function public.site_liberations_admin() to authenticated;

-- ── Lieux (modifiables dans Paramètres ; servent au calcul des km, lot 3) ───
create table if not exists public.site_liberations_lieux (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  -- Précision avant la rue (ex. « Espace Solidarité »).
  complement text,
  rue text,
  numero text,
  boite text,
  code_postal text,
  localite text,
  actif boolean not null default true,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.site_liberations_lieux is 'Lieux des réunions et formations (app Libérations, Paramètres).';
drop trigger if exists site_liberations_lieux_touch on public.site_liberations_lieux;
create trigger site_liberations_lieux_touch before update on public.site_liberations_lieux
  for each row execute function public.site_entreprises_touch();

insert into public.site_liberations_lieux (nom, complement, rue, numero, code_postal, localite, ordre)
select v.nom, v.complement, v.rue, v.numero, v.code_postal, v.localite, v.ordre
from (values
  ('CEPAG', 'Espace Solidarité', 'Rue de Namur', '47', '5000', 'Beez', 1),
  ('Centrale Générale Namur', null, 'Rue Dewez', '40-42', '5000', 'Namur', 2),
  ('Centrale Générale Libramont', null, 'Rue Fonteny Maroy', '13', '6800', 'Libramont-Chevigny', 3),
  ('CGSP Namur', null, 'Rue de l''Armée Grouchy', '41', '5000', 'Namur', 4),
  ('Centrale Générale Bruxelles', null, 'Rue Watteeu', '6', '1000', 'Bruxelles', 5)
) as v(nom, complement, rue, numero, code_postal, localite, ordre)
where not exists (select 1 from public.site_liberations_lieux l where l.nom = v.nom);

-- ── Taux kilométrique (un taux par date de début : un trajet garde le taux de son jour) ──
create table if not exists public.site_liberations_taux_km (
  id uuid primary key default gen_random_uuid(),
  valable_du date not null unique,
  -- Euros par kilomètre (ex. 0.4280).
  taux numeric(6, 4) not null check (taux > 0 and taux < 10),
  auteur_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
comment on table public.site_liberations_taux_km is 'Taux kilométrique des frais de déplacement, par date de début de validité.';

-- ── Dossiers ────────────────────────────────────────────────────────────────
create table if not exists public.site_liberations (
  id uuid primary key default gen_random_uuid(),
  -- Numéro lisible du dossier (« Dossier n° 12 »).
  numero bigint generated by default as identity unique,
  type text not null check (type in ('conge_education', 'mission_syndicale', 'credit_heures', 'formation_syndicale')),
  objet text,
  -- Lieu : choisi dans la liste (lieu_id) ou « Autre » (lieu_id null). L'adresse est toujours copiée ici
  -- pour que le dossier reste juste si la liste change ensuite.
  lieu_id uuid references public.site_liberations_lieux(id) on delete set null,
  lieu_autre boolean not null default false,
  lieu_nom text,
  lieu_complement text,
  lieu_rue text,
  lieu_numero text,
  lieu_boite text,
  lieu_code_postal text,
  lieu_localite text,
  salle text,
  ordre_du_jour text,
  -- null = pas encore répondu.
  perte_salaire boolean,
  perte_salaire_charge text check (perte_salaire_charge is null or perte_salaire_charge in ('employeur', 'cg_federale')),
  introduire_cg_federale boolean,
  regime_paiement text,
  lunch boolean,
  secteur_id uuid references public.site_secteurs(id) on delete set null,
  commission_paritaire text,
  entreprise_specifique boolean not null default false,
  entreprise_id uuid references public.site_entreprises(id) on delete set null,
  statut text not null default 'brouillon' check (statut in
    ('brouillon', 'demande', 'en_traitement', 'liberation_envoyee', 'jour_j', 'frais', 'cloture', 'annule', 'archive')),
  demandeur_id uuid not null references auth.users(id) on delete restrict,
  -- Admin qui traite le dossier (le « correspondant » des courriers, lot 2).
  traite_par uuid references auth.users(id) on delete set null,
  soumis_le timestamptz,
  archive_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.site_liberations is 'Dossiers de libération (app Libérations) : demande, traitement, jour J, frais, archive.';
create index if not exists site_liberations_demandeur_idx on public.site_liberations (demandeur_id);
create index if not exists site_liberations_statut_idx on public.site_liberations (statut);
drop trigger if exists site_liberations_touch on public.site_liberations;
create trigger site_liberations_touch before update on public.site_liberations
  for each row execute function public.site_entreprises_touch();

-- Lecture d'un dossier : admin, ou demandeur (avec l'app).
create or replace function public.site_liberation_lisible(p_liberation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (select public.site_a_app('liberations')) and exists (
    select 1 from public.site_liberations l
    where l.id = p_liberation and (l.demandeur_id = auth.uid() or public.site_liberations_admin())
  );
$$;
revoke all on function public.site_liberation_lisible(uuid) from public, anon;
grant execute on function public.site_liberation_lisible(uuid) to authenticated;

-- ── Dates d'un dossier ──────────────────────────────────────────────────────
create table if not exists public.site_liberation_dates (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  jour date not null,
  duree text not null default 'journee' check (duree in ('journee', 'matin', 'apres_midi')),
  heure_debut time,
  created_at timestamptz not null default now(),
  unique (liberation_id, jour, duree)
);
create index if not exists site_liberation_dates_dossier_idx on public.site_liberation_dates (liberation_id, jour);

-- ── Participants (délégués uniquement ; nom et entreprise copiés au moment de l'ajout) ──
create table if not exists public.site_liberation_participants (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  delegue_id uuid references public.site_delegues(id) on delete set null,
  prenom text,
  nom text not null,
  entreprise_id uuid references public.site_entreprises(id) on delete set null,
  ajoute_par uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (liberation_id, delegue_id)
);
create index if not exists site_liberation_participants_dossier_idx on public.site_liberation_participants (liberation_id);
create index if not exists site_liberation_participants_delegue_idx on public.site_liberation_participants (delegue_id);

-- ── Pièces jointes (bucket privé liberations) ───────────────────────────────
create table if not exists public.site_liberation_fichiers (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  -- Chemin dans le bucket : <liberation_id>/<uuid>-<nom>.
  chemin text not null unique,
  nom_origine text not null,
  taille integer,
  type_mime text,
  created_at timestamptz not null default now()
);
create index if not exists site_liberation_fichiers_dossier_idx on public.site_liberation_fichiers (liberation_id);

-- ── Historique des statuts ──────────────────────────────────────────────────
create table if not exists public.site_liberation_historique (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  statut_avant text,
  statut_apres text not null,
  auteur_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists site_liberation_historique_dossier_idx on public.site_liberation_historique (liberation_id, created_at);

-- ── Profil de l'équipe : fonction (signature) et téléphone (correspondant), lot 2 ──
create table if not exists public.site_equipe_profils (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Ex. « Secrétaire permanent », « Secrétaire permanente adjointe », « Secrétaire régional ».
  fonction text,
  telephone text,
  updated_at timestamptz not null default now()
);
comment on table public.site_equipe_profils is 'Fonction et téléphone des membres de l''équipe (signature et correspondant des courriers).';

-- ── Serrures RLS ────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['site_liberations', 'site_liberation_dates', 'site_liberation_participants',
    'site_liberation_fichiers', 'site_liberation_historique', 'site_liberations_lieux', 'site_liberations_taux_km',
    'site_equipe_profils']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
  end loop;
end $$;

create policy site_liberations_select on public.site_liberations for select to authenticated
  using ((select public.site_a_app('liberations')) and (demandeur_id = (select auth.uid()) or (select public.site_liberations_admin())));

do $$
declare t text;
begin
  foreach t in array array['site_liberation_dates', 'site_liberation_participants', 'site_liberation_fichiers',
    'site_liberation_historique']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (public.site_liberation_lisible(liberation_id))',
      t || '_select', t);
  end loop;
end $$;

create policy site_liberations_lieux_select on public.site_liberations_lieux for select to authenticated
  using ((select public.site_a_app('liberations')));
create policy site_liberations_taux_km_select on public.site_liberations_taux_km for select to authenticated
  using ((select public.site_a_app('liberations')));
-- Fonction et téléphone : lisibles par l'équipe (aucune donnée sensible).
create policy site_equipe_profils_select on public.site_equipe_profils for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('SUPER_ADMIN', 'ADMIN_OP', 'PERMANENT')));

-- ── Bucket privé (aucune politique : liens signés côté serveur uniquement) ──
insert into storage.buckets (id, name, public, file_size_limit)
values ('liberations', 'liberations', false, 26214400)
on conflict (id) do update set public = false;

-- ── Catalogue des apps ──────────────────────────────────────────────────────
insert into public.site_apps (code, nom, description, icone, couleur, ordre, actif)
select 'liberations', 'Libérations', 'Demandes de libération, courriers, présences et frais', 'calendar-check', '#D55E00', 45, true
where not exists (select 1 from public.site_apps where code = 'liberations');

insert into public.site_app_roles (app_code, role)
select 'liberations', r from unnest(array['ADMIN_OP', 'PERMANENT']) as r
where not exists (select 1 from public.site_app_roles where app_code = 'liberations' and role = r);
