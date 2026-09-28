-- ════════════════════════════════════════════════════════════════════════════
-- Paramètres des envois automatiques + historique des e-mails envoyés
-- Base CG Link (partagée) — tables préfixées site_. Migration demandée par Fred le 28/09/2026.
-- À exécuter une fois dans l'éditeur SQL de Supabase (idempotente : peut être rejouée).
--
-- Sécurité (RÈGLE D'OR : chaque table a sa serrure RLS) :
--   - site_destinataires : lecture / écriture réservées aux super admins (écran Paramètres) ;
--     les routes d'envoi la lisent avec la clé service_role.
--   - site_envois_mails : lecture réservée aux super admins ; écriture UNIQUEMENT par les routes
--     d'envoi (clé service_role, qui contourne la RLS) — aucune politique d'écriture.
--   - anon (site public) n'a aucun droit sur ces deux tables.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Destinataires internes de chaque envoi automatique ─────────────────────
create table if not exists public.site_destinataires (
  id uuid primary key default gen_random_uuid(),
  -- affiliation · sepa · changement · c1 · c32 · parcours_onem (voir lib/envois.ts)
  envoi text not null
    constraint site_destinataires_envoi_check
    check (envoi in ('affiliation', 'sepa', 'changement', 'c1', 'c32', 'parcours_onem')),
  email text not null
    constraint site_destinataires_email_check
    check (
      email = lower(btrim(email))
      and length(email) <= 254
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  constraint site_destinataires_envoi_email_key unique (envoi, email)
);

comment on table public.site_destinataires is
  'Adresses internes qui reçoivent chaque envoi automatique des formulaires (le demandeur reçoit toujours sa copie). Géré dans /suivi-actions/parametres.';

alter table public.site_destinataires enable row level security;

revoke all on public.site_destinataires from anon;
revoke all on public.site_destinataires from authenticated;
grant select, insert, update, delete on public.site_destinataires to authenticated;

drop policy if exists site_destinataires_select on public.site_destinataires;
create policy site_destinataires_select on public.site_destinataires
  for select to authenticated
  using ((select public.site_is_super_admin()));

drop policy if exists site_destinataires_insert on public.site_destinataires;
create policy site_destinataires_insert on public.site_destinataires
  for insert to authenticated
  with check ((select public.site_is_super_admin()));

drop policy if exists site_destinataires_update on public.site_destinataires;
create policy site_destinataires_update on public.site_destinataires
  for update to authenticated
  using ((select public.site_is_super_admin()))
  with check ((select public.site_is_super_admin()));

drop policy if exists site_destinataires_delete on public.site_destinataires;
create policy site_destinataires_delete on public.site_destinataires
  for delete to authenticated
  using ((select public.site_is_super_admin()));

-- Adresses en place dans le code au 28/09/2026 (reprises telles quelles).
insert into public.site_destinataires (envoi, email) values
  ('affiliation',   'admin.nalux@accg.be'),
  ('sepa',          'admin.nalux@accg.be'),
  ('changement',    'admin.nalux@accg.be'),
  ('c1',            'jonathan.hubert@accg.be'),
  ('c1',            'op.namlux@fgtb.be'),
  ('c32',           'jonathan.hubert@accg.be'),
  ('c32',           'op.namlux@fgtb.be'),
  ('parcours_onem', 'jonathan.hubert@accg.be'),
  ('parcours_onem', 'op.namlux@fgtb.be')
on conflict (envoi, email) do nothing;

-- ── 2. Historique des e-mails envoyés pour chaque demande ─────────────────────
create table if not exists public.site_envois_mails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Demande concernée : type (onglet du back-office) + id de la ligne dans sa table web_*.
  -- Pas de clé étrangère : la demande peut être dans 4 tables différentes.
  demande_type text not null
    constraint site_envois_mails_demande_type_check
    check (demande_type in ('affiliation', 'sepa', 'changement', 'c1', 'c32')),
  demande_id uuid not null,
  envoi text not null
    constraint site_envois_mails_envoi_check
    check (envoi in ('affiliation', 'sepa', 'changement', 'c1', 'c32', 'parcours_onem', 'copie_personnelle')),
  destinataire text not null,
  sujet text,
  statut text not null
    constraint site_envois_mails_statut_check
    check (statut in ('envoye', 'echec')),
  resend_id text,
  erreur text
);

comment on table public.site_envois_mails is
  'Journal des e-mails envoyés par les formulaires (un enregistrement par demande et par destinataire). Écrit par les routes d''envoi (service_role), lu dans le back-office des demandes.';

create index if not exists site_envois_mails_demande_idx
  on public.site_envois_mails (demande_type, demande_id, created_at desc);

alter table public.site_envois_mails enable row level security;

revoke all on public.site_envois_mails from anon;
revoke all on public.site_envois_mails from authenticated;
grant select on public.site_envois_mails to authenticated;

drop policy if exists site_envois_mails_select on public.site_envois_mails;
create policy site_envois_mails_select on public.site_envois_mails
  for select to authenticated
  using ((select public.site_is_super_admin()));
