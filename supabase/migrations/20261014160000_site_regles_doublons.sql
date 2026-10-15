-- ════════════════════════════════════════════════════════════════════════════
-- Règles d'accès (RLS) en double : suppression des anciennes règles « Super admin… ».
-- Base CG Link (partagée). Demandée par Fred le 14/10/2026 (audit). Idempotente : peut être rejouée.
--
-- Depuis le 12/10/2026, chaque table site_* a une règle « App … » (site_a_app('<app>')) et un super
-- admin a toujours toutes les apps actives. Les anciennes règles « Super admin … » donnent donc un
-- accès déjà accordé : Postgres les évalue pour rien à chaque lecture (avis « multiple permissive
-- policies » de Supabase). Personne ne gagne ni ne perd d'accès :
--   1. règles « Super admin … » couvertes par une règle « App … » : supprimées ;
--   2. règles « Super admin gère … » (tous les droits) dont seule la lecture fait doublon : remplacées
--      par une règle d'écriture seule (ajout, modification, suppression) ;
--   3. règles auth_select des web_* neutralisées le 12/10/2026 (condition « false ») : supprimées.
-- Reste réservé au seul SUPER_ADMIN, inchangé : suppression d'une demande chatbot, catalogue des apps,
-- apps par rôle, exceptions d'accès, référentiel du chatbot (antennes, centrales, répartition, secteurs).
--
-- Attention pour la suite : désactiver une app dans site_apps (actif = false) retire aussi au super
-- admin l'accès à ses tables depuis le navigateur. La réactiver le rend.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Couvertes par une règle « App … » ─────────────────────────────────────

-- App actions
drop policy if exists "Super admin ajoute une action" on public.site_actions;
drop policy if exists "Super admin lit les actions" on public.site_actions;
drop policy if exists "Super admin modifie une action" on public.site_actions;
drop policy if exists "Super admin supprime une action" on public.site_actions;

drop policy if exists "Super admin ajoute une mobilisation" on public.site_mobilisations;
drop policy if exists "Super admin lit les mobilisations" on public.site_mobilisations;
drop policy if exists "Super admin modifie une mobilisation" on public.site_mobilisations;
drop policy if exists "Super admin supprime une mobilisation" on public.site_mobilisations;

drop policy if exists "Super admin ajoute une photo" on public.site_photos;
drop policy if exists "Super admin lit les photos" on public.site_photos;
drop policy if exists "Super admin modifie une photo" on public.site_photos;
drop policy if exists "Super admin supprime une photo" on public.site_photos;

drop policy if exists "Super admin ajoute une video" on public.site_videos;
drop policy if exists "Super admin lit les videos" on public.site_videos;
drop policy if exists "Super admin modifie une video" on public.site_videos;
drop policy if exists "Super admin supprime une video" on public.site_videos;

drop policy if exists "Super admin ajoute un secteur" on public.site_secteurs;

-- App scan-news
drop policy if exists "Super admin ajoute un article" on public.site_articles;
drop policy if exists "Super admin lit les articles" on public.site_articles;
drop policy if exists "Super admin modifie un article" on public.site_articles;
drop policy if exists "Super admin supprime un article" on public.site_articles;

drop policy if exists "Super admin ajoute une publication reseau" on public.site_publications_reseaux;
drop policy if exists "Super admin lit les publications reseaux" on public.site_publications_reseaux;
drop policy if exists "Super admin modifie une publication reseau" on public.site_publications_reseaux;
drop policy if exists "Super admin supprime une publication reseau" on public.site_publications_reseaux;

drop policy if exists "Super admin ajoute une source" on public.site_sources;
drop policy if exists "Super admin lit les sources" on public.site_sources;
drop policy if exists "Super admin modifie une source" on public.site_sources;
drop policy if exists "Super admin supprime une source" on public.site_sources;

drop policy if exists "Super admin ajoute un theme" on public.site_themes;
drop policy if exists "Super admin lit les themes" on public.site_themes;
drop policy if exists "Super admin modifie un theme" on public.site_themes;
drop policy if exists "Super admin supprime un theme" on public.site_themes;

drop policy if exists "Super admin lit la veille" on public.site_veille;
drop policy if exists "Super admin supprime la veille" on public.site_veille;
drop policy if exists "Super admin trie la veille" on public.site_veille;

drop policy if exists site_veille_analyses_select on public.site_veille_analyses;

-- App demarches (la suppression d'une demande chatbot reste réservée au super admin)
drop policy if exists "Super admin lit les demandes chatbot" on public.site_chatbot_demandes;
drop policy if exists "Super admin met a jour les demandes chatbot" on public.site_chatbot_demandes;

-- ── 2. « Gère » (tous les droits) → écriture seule ───────────────────────────
-- La lecture est déjà donnée par une autre règle (app demarches, « connectés lisent », « chacun voit
-- ses exceptions », app permanents). Une règle par opération : INSERT, UPDATE, DELETE.

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('site_chatbot_antennes',    'Super admin gere site_chatbot_antennes',    'antennes du chatbot'),
      ('site_chatbot_centrales',   'Super admin gere site_chatbot_centrales',   'centrales du chatbot'),
      ('site_chatbot_repartition', 'Super admin gere site_chatbot_repartition', 'repartition du chatbot'),
      ('site_chatbot_secteurs',    'Super admin gere site_chatbot_secteurs',    'secteurs du chatbot'),
      ('site_apps',                'Super admin gere le catalogue',             'catalogue des apps'),
      ('site_app_roles',           'Super admin gere les apps par role',        'apps par role'),
      ('site_app_acces',           'Super admin gere les exceptions',           'exceptions d''acces')
    ) as v(tbl, ancienne, libelle)
  loop
    execute format('drop policy if exists %I on public.%I', t.ancienne, t.tbl);
    execute format('drop policy if exists %I on public.%I', 'Super admin ajoute : ' || t.libelle, t.tbl);
    execute format('drop policy if exists %I on public.%I', 'Super admin modifie : ' || t.libelle, t.tbl);
    execute format('drop policy if exists %I on public.%I', 'Super admin supprime : ' || t.libelle, t.tbl);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.site_is_super_admin()))',
      'Super admin ajoute : ' || t.libelle, t.tbl);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.site_is_super_admin())) with check ((select public.site_is_super_admin()))',
      'Super admin modifie : ' || t.libelle, t.tbl);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select public.site_is_super_admin()))',
      'Super admin supprime : ' || t.libelle, t.tbl);
  end loop;
end $$;

-- Fichiers des fiches de suivi : même logique (lecture déjà donnée par l'app permanents).
drop policy if exists site_fiches_suivi_fichiers_ecriture on public.site_fiches_suivi_fichiers;
drop policy if exists site_fiches_suivi_fichiers_insert on public.site_fiches_suivi_fichiers;
drop policy if exists site_fiches_suivi_fichiers_update on public.site_fiches_suivi_fichiers;
drop policy if exists site_fiches_suivi_fichiers_delete on public.site_fiches_suivi_fichiers;
create policy site_fiches_suivi_fichiers_insert on public.site_fiches_suivi_fichiers
  for insert to authenticated
  with check (exists (select 1 from public.site_fiches_suivi f
                      where f.id = site_fiches_suivi_fichiers.fiche_id and public.site_fiche_modifiable(f.auteur_id)));
create policy site_fiches_suivi_fichiers_update on public.site_fiches_suivi_fichiers
  for update to authenticated
  using (exists (select 1 from public.site_fiches_suivi f
                 where f.id = site_fiches_suivi_fichiers.fiche_id and public.site_fiche_modifiable(f.auteur_id)))
  with check (exists (select 1 from public.site_fiches_suivi f
                      where f.id = site_fiches_suivi_fichiers.fiche_id and public.site_fiche_modifiable(f.auteur_id)));
create policy site_fiches_suivi_fichiers_delete on public.site_fiches_suivi_fichiers
  for delete to authenticated
  using (exists (select 1 from public.site_fiches_suivi f
                 where f.id = site_fiches_suivi_fichiers.fiche_id and public.site_fiche_modifiable(f.auteur_id)));

-- ── 3. Règles neutralisées (condition « false ») des formulaires ─────────────
drop policy if exists auth_select on public.web_c1;
drop policy if exists auth_select on public.web_c3_2;
drop policy if exists auth_select on public.web_mandats_sepa;
