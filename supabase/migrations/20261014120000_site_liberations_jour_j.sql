-- ════════════════════════════════════════════════════════════════════════════
-- App « Libérations », lot 3 : le jour J (QR code, présences signées, trajets, frais).
-- Décisions de Fred du 14/10/2026 (docs/contexte/liberations.md) : calcul des km par Google Maps, QR valable de
-- 08h00 à 18h00 chaque jour du dossier, tickets visibles par les admins et le permanent demandeur.
-- Idempotente : peut être rejouée. À exécuter APRÈS 20261014090000_site_liberations_courriers.sql.
--
-- Sécurité (RÈGLE D'OR) :
--   - la page publique du QR code n'a AUCUN accès direct à la base : tout passe par le serveur (service_role),
--     après vérification du jeton du QR, de l'horaire, du n° de registre national et des tentatives ;
--   - lecture : app « liberations » et (admin ou demandeur du dossier) ; tentatives : aucune lecture ;
--   - aucune politique d'écriture ; anon n'a aucun droit.
-- ════════════════════════════════════════════════════════════════════════════

-- ── QR code du dossier (un seul, régénérable : l'ancien ne marche plus) ─────
alter table public.site_liberations add column if not exists qr_jeton text;
alter table public.site_liberations add column if not exists qr_cree_le timestamptz;
create unique index if not exists site_liberations_qr_jeton_idx on public.site_liberations (qr_jeton) where qr_jeton is not null;

-- ── Présences : une signature par participant et par date ───────────────────
create table if not exists public.site_liberation_presences (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  date_id uuid not null references public.site_liberation_dates(id) on delete cascade,
  -- null = « Je ne suis pas dans la liste » (à vérifier par un admin).
  participant_id uuid references public.site_liberation_participants(id) on delete set null,
  hors_liste boolean not null default false,
  prenom_saisi text,
  nom_saisi text,
  entreprise_saisie text,
  registre_saisi text check (registre_saisi is null or registre_saisi ~ '^[0-9]{11}$'),
  -- Image PNG de la signature dans le bucket privé liberations (<dossier>/presences/<id>.png).
  signature_chemin text,
  a_verifier boolean not null default false,
  verifie_le timestamptz,
  verifie_par uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists site_liberation_presences_unique_idx
  on public.site_liberation_presences (date_id, participant_id) where participant_id is not null;
create index if not exists site_liberation_presences_dossier_idx on public.site_liberation_presences (liberation_id);

-- ── Trajet déclaré avec la présence ─────────────────────────────────────────
create table if not exists public.site_liberation_trajets (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  presence_id uuid not null unique references public.site_liberation_presences(id) on delete cascade,
  mode text not null check (mode in ('voiture', 'covoit_conducteur', 'covoit_passager', 'voiture_puis_passager', 'train', 'voiture_train')),
  -- Départ : domicile (carte du délégué) ou autre adresse.
  depart_domicile boolean not null default true,
  depart_adresse text,
  -- Point de rendez-vous (voiture puis covoiturage) ou gare (voiture + train).
  etape_adresse text,
  conducteur_nom text,
  -- Kilomètres remboursés (aller-retour) ; km_manuel = corrigés par un admin.
  km numeric(7, 1),
  km_manuel boolean not null default false,
  km_erreur text,
  km_calcule_le timestamptz,
  -- Montant des tickets de train, encodé par l'admin ; tickets vérifiés.
  montant_tickets numeric(10, 2),
  tickets_verifies_le timestamptz,
  tickets_verifies_par uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_liberation_trajets_dossier_idx on public.site_liberation_trajets (liberation_id);
drop trigger if exists site_liberation_trajets_touch on public.site_liberation_trajets;
create trigger site_liberation_trajets_touch before update on public.site_liberation_trajets
  for each row execute function public.site_entreprises_touch();

-- ── Photos des tickets de train (bucket privé liberations) ──────────────────
create table if not exists public.site_liberation_tickets (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  presence_id uuid not null references public.site_liberation_presences(id) on delete cascade,
  chemin text not null unique,
  taille integer,
  created_at timestamptz not null default now()
);
create index if not exists site_liberation_tickets_presence_idx on public.site_liberation_tickets (presence_id);

-- ── Tentatives sur la page publique (limite des essais de n° de registre national) ──
create table if not exists public.site_liberation_tentatives (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  -- Empreinte de l'adresse IP (jamais l'adresse elle-même).
  empreinte text not null,
  participant_id uuid references public.site_liberation_participants(id) on delete cascade,
  reussie boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists site_liberation_tentatives_idx on public.site_liberation_tentatives (liberation_id, empreinte, created_at);

-- ── Serrures RLS ────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['site_liberation_presences', 'site_liberation_trajets', 'site_liberation_tickets', 'site_liberation_tentatives']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
  end loop;
  foreach t in array array['site_liberation_presences', 'site_liberation_trajets', 'site_liberation_tickets']
  loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.site_liberation_lisible(liberation_id))', t || '_select', t);
  end loop;
end $$;
-- site_liberation_tentatives : aucune politique (serveur seulement).
