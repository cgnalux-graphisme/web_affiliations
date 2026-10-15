-- ════════════════════════════════════════════════════════════════════════════
-- Performances : index des clés étrangères les plus utilisées + une règle RLS plus rapide.
-- Base CG Link (partagée). Migration proposée lors de l'audit du 14/10/2026, demandée par Fred.
-- À exécuter une fois dans l'éditeur SQL de Supabase (idempotente : peut être rejouée).
--
-- Aucune donnée n'est modifiée, aucun droit n'est changé :
--   1. des index sur les colonnes qui servent aux jointures et aux filtres (avis « unindexed
--      foreign keys » de Supabase). Les colonnes d'audit (auteur, traité par…) sont laissées de côté :
--      elles ne servent qu'à l'affichage ;
--   2. la règle « Chacun voit ses exceptions » (site_app_acces) évalue auth.uid() une fois par
--      requête au lieu d'une fois par ligne (avis « auth_rls_initplan »). Même condition, même effet.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Index des clés étrangères ─────────────────────────────────────────────

-- Site public : photos et vidéos des actions (vues site_photos_public, site_videos_public).
create index if not exists site_photos_action_id_idx on public.site_photos (action_id);
create index if not exists site_videos_action_id_idx on public.site_videos (action_id);
create index if not exists site_actions_secteur_id_idx on public.site_actions (secteur_id);

-- Scan News.
create index if not exists site_veille_source_id_idx on public.site_veille (source_id);
create index if not exists site_publications_reseaux_article_id_idx on public.site_publications_reseaux (article_id);

-- Démarches et accès.
create index if not exists site_chatbot_demandes_service_id_idx on public.site_chatbot_demandes (service_id);
create index if not exists site_app_acces_app_code_idx on public.site_app_acces (app_code);
create index if not exists site_journal_acces_cible_id_idx on public.site_journal_acces (cible_id);

-- Entreprises, délégués, fiches de suivi.
create index if not exists site_entreprises_secteur_id_idx on public.site_entreprises (secteur_id);
create index if not exists site_entreprise_sites_unite_postale_id_idx on public.site_entreprise_sites (unite_postale_id);
create index if not exists site_entreprise_unites_site_id_idx on public.site_entreprise_unites (site_id);
create index if not exists site_entreprise_onss_site_id_idx on public.site_entreprise_onss (site_id);
create index if not exists site_delegue_mandats_site_id_idx on public.site_delegue_mandats (site_id);
create index if not exists site_fiches_suivi_site_id_idx on public.site_fiches_suivi (site_id);

-- Libérations.
create index if not exists site_liberations_entreprise_id_idx on public.site_liberations (entreprise_id);
create index if not exists site_liberations_lieu_id_idx on public.site_liberations (lieu_id);
create index if not exists site_liberations_secteur_id_idx on public.site_liberations (secteur_id);
create index if not exists site_liberation_participants_entreprise_id_idx on public.site_liberation_participants (entreprise_id);
create index if not exists site_liberation_montants_date_id_idx on public.site_liberation_montants (date_id);
create index if not exists site_liberation_presences_participant_id_idx on public.site_liberation_presences (participant_id);
create index if not exists site_liberation_tickets_liberation_id_idx on public.site_liberation_tickets (liberation_id);
create index if not exists site_liberation_tentatives_participant_id_idx on public.site_liberation_tentatives (participant_id);

-- ── 2. Règle RLS évaluée une fois par requête ────────────────────────────────
drop policy if exists "Chacun voit ses exceptions" on public.site_app_acces;
create policy "Chacun voit ses exceptions" on public.site_app_acces
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.site_is_super_admin()));
