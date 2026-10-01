-- ════════════════════════════════════════════════════════════════════════════
-- Scan News : classements « Check IA » du fil (tier list des sujets à poster)
-- Base CG Link (partagée) — table préfixée site_. Migration demandée par Fred le 01/10/2026.
-- À exécuter une fois dans l'éditeur SQL de Supabase (idempotente : peut être rejouée).
--
-- Sécurité (RÈGLE D'OR : chaque table a sa serrure RLS) :
--   - lecture réservée aux super admins (écran Le fil) ;
--   - écriture et purge UNIQUEMENT par le serveur (route /api/veille/analyse, clé service_role,
--     qui contourne la RLS) — aucune politique d'écriture ;
--   - anon (site public) n'a aucun droit.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.site_veille_analyses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- manuel = bouton « Check IA » ; auto = analyse quotidienne de 8 h (Vercel Cron)
  origine text not null
    constraint site_veille_analyses_origine_check
    check (origine in ('manuel', 'auto')),
  -- Nombre d'articles du fil soumis à l'IA (48 dernières heures, hors ignorés)
  nb_articles integer not null default 0,
  -- Classement complet (synthèse, sujets par rang, articles avec titre / source / lien) : voir lib/veille-tri.ts
  resultat jsonb not null,
  modele text
);

comment on table public.site_veille_analyses is
  'Classements « Check IA » du fil Scan News (tier list S / A / B / C / Pas pour nous). Écrit par le serveur (service_role), lu dans /suivi-actions/veille. Purgé après 7 jours.';

create index if not exists site_veille_analyses_created_idx
  on public.site_veille_analyses (created_at desc);

alter table public.site_veille_analyses enable row level security;

revoke all on public.site_veille_analyses from anon;
revoke all on public.site_veille_analyses from authenticated;
grant select on public.site_veille_analyses to authenticated;

drop policy if exists site_veille_analyses_select on public.site_veille_analyses;
create policy site_veille_analyses_select on public.site_veille_analyses
  for select to authenticated
  using ((select public.site_is_super_admin()));
