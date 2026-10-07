-- ════════════════════════════════════════════════════════════════════════════
-- Formulaire « Signaler un changement » (/changement-situation)
-- Base CG Link (partagée). Migration demandée par Fred le 07/10/2026.
-- À exécuter une fois dans l'éditeur SQL de Supabase (idempotente : peut être rejouée).
--
-- Sécurité (RÈGLE D'OR : chaque table a sa serrure RLS) :
--   - web_modifications : le formulaire public (anon) peut INSÉRER seulement, jamais relire ;
--     lecture réservée aux super admins (plus strict que les autres web_*, lisibles par tout
--     compte connecté) ; le back-office lit avec la clé service_role.
--   - aucune modification ni suppression possible avec les clés publique ou connectée.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Table des demandes de changement ───────────────────────────────────────
create table if not exists public.web_modifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Identité (obligatoire)
  nom text not null check (length(btrim(nom)) between 1 and 100),
  prenom text not null check (length(btrim(prenom)) between 1 and 100),
  niss text not null check (niss ~ '^[0-9]{11}$'),
  email text not null check (length(email) <= 254),

  -- Changements signalés : adresse · contact · employeur · regime · situation
  changements text[] not null
    check (
      cardinality(changements) between 1 and 5
      and changements <@ array['adresse', 'contact', 'employeur', 'regime', 'situation']::text[]
    ),

  -- Adresse
  adresse_rue text check (length(adresse_rue) <= 150),
  adresse_numero text check (length(adresse_numero) <= 20),
  adresse_boite text check (length(adresse_boite) <= 20),
  adresse_code_postal text check (adresse_code_postal ~ '^[0-9]{4}$'),
  adresse_localite text check (length(adresse_localite) <= 100),
  adresse_depuis date,

  -- E-mail / téléphone
  nouvel_email text check (length(nouvel_email) <= 254),
  nouveau_telephone text check (length(nouveau_telephone) <= 30),
  contact_depuis date,

  -- Employeur
  employeur_nom text check (length(employeur_nom) <= 150),
  employeur_onss_tva text check (length(employeur_onss_tva) <= 30),
  employeur_localite text check (length(employeur_localite) <= 100),
  employeur_cp text check (length(employeur_cp) <= 10),
  employeur_depuis date,

  -- Régime de travail
  regime text check (regime in ('temps_plein', 'temps_partiel')),
  regime_heures numeric(4, 1) check (regime_heures > 0 and regime_heures <= 38),
  regime_depuis date,

  -- Situation professionnelle
  situation text check (situation in ('profession', 'chomage', 'mutuelle')),
  profession text check (length(profession) <= 150),
  profession_cp text check (length(profession_cp) <= 10),
  situation_depuis date,

  -- Transfert vers une autre centrale : non · a_organiser (CP « Autre ») · a_verifier (« Je ne sais pas »)
  transfert text not null default 'non' check (transfert in ('non', 'a_organiser', 'a_verifier')),

  -- Signature
  date_signature date not null,
  lieu_signature text not null check (length(btrim(lieu_signature)) between 1 and 100),
  signature text not null check (signature like 'data:image/%' and length(signature) <= 500000)
);

comment on table public.web_modifications is
  'Formulaire « Signaler un changement » (adresse, contact, employeur, régime, situation professionnelle). Écrit par le formulaire public (insertion seule), lu dans le back-office des demandes.';

create index if not exists web_modifications_created_at_idx on public.web_modifications (created_at desc);

alter table public.web_modifications enable row level security;

revoke all on public.web_modifications from anon;
revoke all on public.web_modifications from authenticated;
grant insert on public.web_modifications to anon;
grant select, insert on public.web_modifications to authenticated;

drop policy if exists web_modifications_insert on public.web_modifications;
create policy web_modifications_insert on public.web_modifications
  for insert to anon, authenticated
  with check (true);

drop policy if exists web_modifications_select on public.web_modifications;
create policy web_modifications_select on public.web_modifications
  for select to authenticated
  using ((select public.site_is_super_admin()));

-- ── 2. Nouvel envoi automatique « modification » ──────────────────────────────
alter table public.site_destinataires drop constraint if exists site_destinataires_envoi_check;
alter table public.site_destinataires add constraint site_destinataires_envoi_check
  check (envoi in ('affiliation', 'sepa', 'changement', 'c1', 'c32', 'parcours_onem', 'modification'));

insert into public.site_destinataires (envoi, email) values
  ('modification', 'admin.nalux@accg.be')
on conflict (envoi, email) do nothing;

alter table public.site_envois_mails drop constraint if exists site_envois_mails_demande_type_check;
alter table public.site_envois_mails add constraint site_envois_mails_demande_type_check
  check (demande_type in ('affiliation', 'sepa', 'changement', 'c1', 'c32', 'modification'));

alter table public.site_envois_mails drop constraint if exists site_envois_mails_envoi_check;
alter table public.site_envois_mails add constraint site_envois_mails_envoi_check
  check (envoi in ('affiliation', 'sepa', 'changement', 'c1', 'c32', 'parcours_onem', 'copie_personnelle', 'modification'));
