-- ════════════════════════════════════════════════════════════════════════════
-- App « Libérations », lot 2 : les courriers. Décisions de Fred du 14/10/2026 : docs/contexte/liberations.md.
-- Idempotente : peut être rejouée. À exécuter APRÈS 20261013130000_site_liberations.sql.
--
-- Sécurité (RÈGLE D'OR) : comme le lot 1. Lecture : app « liberations » et (admin ou demandeur du dossier) ;
-- modèles : lecture avec l'app. AUCUNE politique d'écriture : le code écrit côté serveur (service_role) après
-- vérification du droit. anon n'a aucun droit.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Délégués : n° de compte (fiche de paiement), saisi par un admin ─────────
alter table public.site_delegues add column if not exists iban text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'site_delegues_iban_format') then
    alter table public.site_delegues add constraint site_delegues_iban_format
      check (iban is null or iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$');
  end if;
end $$;
comment on column public.site_delegues.iban is 'N° de compte (IBAN, sans espaces) pour la fiche de paiement des libérations.';

-- ── Dossier : « Conseil » de la fiche de paiement ───────────────────────────
alter table public.site_liberations add column if not exists conseil text;

-- ── Participant : attestation de perte de salaire reçue, remarques de paiement ──
alter table public.site_liberation_participants add column if not exists attestation_recue_le timestamptz;
alter table public.site_liberation_participants add column if not exists remarques_paiement text;

-- ── Modèles de courriers modifiés (le texte proposé vit dans le code ; une ligne = texte remplacé) ──
create table if not exists public.site_liberations_modeles (
  code text primary key,
  -- Objet de l'e-mail (modèles d'e-mail seulement).
  objet text,
  texte text not null,
  auteur_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
comment on table public.site_liberations_modeles is 'Textes des courriers de libération modifiés dans Paramètres (sinon : texte proposé par le code).';

-- ── Courriers d'un participant : texte retouché, envoi ──────────────────────
create table if not exists public.site_liberation_courriers (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  participant_id uuid not null references public.site_liberation_participants(id) on delete cascade,
  genre text not null check (genre in ('lettre_employeur', 'convocation', 'attestation_presence')),
  -- Texte retouché par l'admin pour ce participant (null = texte du modèle).
  corps text,
  statut text not null default 'a_envoyer' check (statut in ('a_envoyer', 'envoye', 'imprime', 'echec')),
  mode text check (mode is null or mode in ('email', 'impression')),
  destinataire text,
  resend_id text,
  erreur text,
  envoye_le timestamptz,
  envoye_par uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, genre)
);
create index if not exists site_liberation_courriers_dossier_idx on public.site_liberation_courriers (liberation_id);
drop trigger if exists site_liberation_courriers_touch on public.site_liberation_courriers;
create trigger site_liberation_courriers_touch before update on public.site_liberation_courriers
  for each row execute function public.site_entreprises_touch();

-- ── Montants de la fiche de paiement : un participant, une date ─────────────
create table if not exists public.site_liberation_montants (
  id uuid primary key default gen_random_uuid(),
  liberation_id uuid not null references public.site_liberations(id) on delete cascade,
  participant_id uuid not null references public.site_liberation_participants(id) on delete cascade,
  date_id uuid not null references public.site_liberation_dates(id) on delete cascade,
  salaire_brut numeric(10, 2),
  deplacements numeric(10, 2),
  indemnites numeric(10, 2),
  petits_frais numeric(10, 2),
  cheques_repas numeric(10, 2),
  updated_at timestamptz not null default now(),
  unique (participant_id, date_id)
);
create index if not exists site_liberation_montants_dossier_idx on public.site_liberation_montants (liberation_id);

-- ── Serrures RLS ────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['site_liberations_modeles', 'site_liberation_courriers', 'site_liberation_montants']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('revoke all on public.%I from authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
  end loop;
end $$;

create policy site_liberations_modeles_select on public.site_liberations_modeles for select to authenticated
  using ((select public.site_a_app('liberations')));
create policy site_liberation_courriers_select on public.site_liberation_courriers for select to authenticated
  using (public.site_liberation_lisible(liberation_id));
create policy site_liberation_montants_select on public.site_liberation_montants for select to authenticated
  using (public.site_liberation_lisible(liberation_id));
