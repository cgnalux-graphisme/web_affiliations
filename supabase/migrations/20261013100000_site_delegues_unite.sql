-- ════════════════════════════════════════════════════════════════════════════
-- Gestion délégués CG Link (plan 2a) : unité d'établissement de rattachement, activation de l'app.
-- Demande de Fred du 13/10/2026. Idempotente : peut être rejouée.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.site_delegues
  add column if not exists unite_id uuid references public.site_entreprise_unites(id) on delete set null;
comment on column public.site_delegues.unite_id is
  'Unité d''établissement de rattachement (une unité suivie et active de la fiche du délégué).';
create index if not exists site_delegues_unite_idx on public.site_delegues (unite_id);

-- L'app apparaît dès que son dossier existe ; réservée aux SUPER_ADMIN par le code (aucun rôle par défaut).
update public.site_apps set actif = true where code = 'delegues' and not actif;
