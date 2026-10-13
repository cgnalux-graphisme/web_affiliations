-- ════════════════════════════════════════════════════════════════════════════
-- Gestion délégués CG Link : adresse complète du délégué (demande de Fred, 13/10/2026).
-- Saisie avec autocomplétion (Photon, comme le formulaire d'affiliation). Idempotente : peut être rejouée.
-- Les tables délégués restent sans politique d'écriture (service_role après vérification du rôle).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.site_delegues add column if not exists adresse_rue text;
alter table public.site_delegues add column if not exists adresse_numero text;
alter table public.site_delegues add column if not exists adresse_boite text;
alter table public.site_delegues add column if not exists adresse_code_postal text;
alter table public.site_delegues add column if not exists adresse_localite text;
alter table public.site_delegues add column if not exists adresse_pays text default 'Belgique';

comment on column public.site_delegues.adresse_rue is 'Adresse personnelle du délégué : rue (autocomplétion Photon).';
