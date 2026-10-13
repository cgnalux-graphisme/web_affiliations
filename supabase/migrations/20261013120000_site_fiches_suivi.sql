-- ════════════════════════════════════════════════════════════════════════════
-- App « Accès permanents » : fiches de suivi, secteur des entreprises, catalogue des apps.
-- Base CG Link (partagée) — tables préfixées site_. Design validé par Fred le 13/10/2026 :
-- docs/superpowers/specs/2026-10-13-acces-permanents-design.md. Idempotente : peut être rejouée.
--
-- Sécurité (RÈGLE D'OR : chaque table a sa serrure RLS) :
--   - fiches et fichiers : lecture si site_a_app('permanents') ; écriture si site_a_app('permanents') ET
--     (auteur de la fiche OU SUPER_ADMIN) ; anon n'a aucun droit ;
--   - bucket fiches-suivi : PRIVÉ et sans aucune politique : envois et lectures uniquement par liens signés
--     créés côté serveur (service_role) après vérification des droits.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Secteur des entreprises (liste site_secteurs, celle des actions) ────────
alter table public.site_entreprises
  add column if not exists secteur_id uuid references public.site_secteurs(id) on delete set null;
comment on column public.site_entreprises.secteur_id is
  'Secteur (site_secteurs), pré-rempli depuis companies.sector, modifiable dans l''app Entreprises.';

-- Remplissage initial : correspondance des libellés CG Link, seulement pour les fiches sans secteur.
update public.site_entreprises e
set secteur_id = s.id
from public.companies c, public.site_secteurs s
where e.company_id = c.id
  and e.secteur_id is null
  and s.nom = case lower(trim(c.sector))
    when 'construction' then 'Construction'
    when 'bois' then 'Bois / ameublement'
    when 'chimie' then 'Chimie'
    when 'eta' then 'Entreprises de travail adapté (ETA)'
    when 'nettoyage' then 'Nettoyage'
    when 'gardiennage' then 'Gardiennage / sécurité'
    when 'titres-services' then 'Titres-services'
    when 'carrière' then 'Carrières & matériaux'
    when 'carrières' then 'Carrières & matériaux'
  end;

-- ── Droit d'écriture sur une fiche : auteur ou SUPER_ADMIN ──────────────────
create or replace function public.site_fiche_modifiable(p_auteur uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (select public.site_a_app('permanents'))
    and (p_auteur = auth.uid()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'));
$$;
revoke all on function public.site_fiche_modifiable(uuid) from public, anon;
grant execute on function public.site_fiche_modifiable(uuid) to authenticated;

-- ── Fiches de suivi ─────────────────────────────────────────────────────────
create table if not exists public.site_fiches_suivi (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('usine', 'sectoriel')),
  titre text,
  date_debut date,
  -- null = date unique ; sinon fin d'une période.
  date_fin date,
  entreprise_id uuid references public.site_entreprises(id) on delete set null,
  site_id uuid references public.site_entreprise_sites(id) on delete set null,
  secteur_id uuid references public.site_secteurs(id) on delete set null,
  origine text,
  duree text,
  echanges_direction text,
  courriers text,
  evenements text,
  resolution text,
  resultat text,
  texte text,
  texte_genere_le timestamptz,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'terminee')),
  auteur_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_fiches_suivi_periode check (date_fin is null or date_debut is null or date_fin >= date_debut)
);
comment on table public.site_fiches_suivi is
  'Fiches de suivi des permanents (événement en usine ou sectoriel) : historique des entreprises, rapport de congrès.';
create index if not exists site_fiches_suivi_entreprise_idx on public.site_fiches_suivi (entreprise_id);
create index if not exists site_fiches_suivi_secteur_idx on public.site_fiches_suivi (secteur_id);
create index if not exists site_fiches_suivi_auteur_idx on public.site_fiches_suivi (auteur_id);
create index if not exists site_fiches_suivi_date_idx on public.site_fiches_suivi (date_debut);

drop trigger if exists site_fiches_suivi_touch on public.site_fiches_suivi;
create trigger site_fiches_suivi_touch before update on public.site_fiches_suivi
  for each row execute function public.site_entreprises_touch();

-- ── Documents et photos d'une fiche ─────────────────────────────────────────
create table if not exists public.site_fiches_suivi_fichiers (
  id uuid primary key default gen_random_uuid(),
  fiche_id uuid not null references public.site_fiches_suivi(id) on delete cascade,
  genre text not null check (genre in ('document', 'photo')),
  -- Chemin dans le bucket privé fiches-suivi : <fiche_id>/<uuid>-<nom>.
  chemin text not null unique,
  nom_origine text not null,
  taille integer,
  type_mime text,
  nature text check (nature is null or nature in
    ('courrier_envoye', 'courrier_recu', 'pv', 'preavis', 'accord', 'tract', 'presse', 'autre')),
  nature_autre text,
  legende text,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists site_fiches_suivi_fichiers_fiche_idx on public.site_fiches_suivi_fichiers (fiche_id, genre, ordre);

-- ── Serrures RLS ────────────────────────────────────────────────────────────
alter table public.site_fiches_suivi enable row level security;
revoke all on public.site_fiches_suivi from anon;
revoke all on public.site_fiches_suivi from authenticated;
grant select, insert, update, delete on public.site_fiches_suivi to authenticated;

drop policy if exists site_fiches_suivi_select on public.site_fiches_suivi;
create policy site_fiches_suivi_select on public.site_fiches_suivi for select to authenticated
  using ((select public.site_a_app('permanents')));
drop policy if exists site_fiches_suivi_insert on public.site_fiches_suivi;
create policy site_fiches_suivi_insert on public.site_fiches_suivi for insert to authenticated
  with check ((select public.site_a_app('permanents')) and auteur_id = (select auth.uid()));
drop policy if exists site_fiches_suivi_update on public.site_fiches_suivi;
create policy site_fiches_suivi_update on public.site_fiches_suivi for update to authenticated
  using (public.site_fiche_modifiable(auteur_id)) with check (public.site_fiche_modifiable(auteur_id));
drop policy if exists site_fiches_suivi_delete on public.site_fiches_suivi;
create policy site_fiches_suivi_delete on public.site_fiches_suivi for delete to authenticated
  using (public.site_fiche_modifiable(auteur_id));

alter table public.site_fiches_suivi_fichiers enable row level security;
revoke all on public.site_fiches_suivi_fichiers from anon;
revoke all on public.site_fiches_suivi_fichiers from authenticated;
grant select, insert, update, delete on public.site_fiches_suivi_fichiers to authenticated;

drop policy if exists site_fiches_suivi_fichiers_select on public.site_fiches_suivi_fichiers;
create policy site_fiches_suivi_fichiers_select on public.site_fiches_suivi_fichiers for select to authenticated
  using ((select public.site_a_app('permanents')));
drop policy if exists site_fiches_suivi_fichiers_ecriture on public.site_fiches_suivi_fichiers;
create policy site_fiches_suivi_fichiers_ecriture on public.site_fiches_suivi_fichiers for all to authenticated
  using (exists (select 1 from public.site_fiches_suivi f where f.id = fiche_id and public.site_fiche_modifiable(f.auteur_id)))
  with check (exists (select 1 from public.site_fiches_suivi f where f.id = fiche_id and public.site_fiche_modifiable(f.auteur_id)));

-- ── Bucket privé (aucune politique : liens signés côté serveur uniquement) ──
insert into storage.buckets (id, name, public, file_size_limit)
values ('fiches-suivi', 'fiches-suivi', false, 26214400)
on conflict (id) do update set public = false;

-- ── Catalogue des apps ──────────────────────────────────────────────────────
insert into public.site_apps (code, nom, description, icone, couleur, ordre, actif)
select 'permanents', 'Accès permanents', 'Mes entreprises, mes délégués et les fiches de suivi', 'key', '#A0522D', 35, true
where not exists (select 1 from public.site_apps where code = 'permanents');

insert into public.site_app_roles (app_code, role)
select v.app_code, v.role from (values ('permanents', 'PERMANENT'), ('delegues', 'PERMANENT')) as v(app_code, role)
where not exists (select 1 from public.site_app_roles r where r.app_code = v.app_code and r.role = v.role);
