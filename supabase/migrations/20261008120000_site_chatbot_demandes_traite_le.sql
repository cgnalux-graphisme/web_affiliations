-- Assistant CG : date de traitement des demandes transmises (site_chatbot_demandes).
-- Demandée par Fred le 08/10/2026 (option A) : la politique de vie privée promet la suppression des demandes
-- un certain temps APRÈS LEUR TRAITEMENT (lib/vie-privee.ts, DUREE_DEMANDES_MOIS). Le site supprime chaque jour
-- les demandes « traite » dont traite_le est dépassé (purgerDemandesChatbot, cron /api/veille/analyse).
--
-- Idempotente (rejouable sans erreur). Ne touche à aucun droit ni à aucune politique RLS.
-- À exécuter par Fred dans l'éditeur SQL de Supabase (projet CG Link).

-- 1. Colonne : moment où la demande est passée au statut « traite » (vide sinon).
alter table public.site_chatbot_demandes
  add column if not exists traite_le timestamptz;

comment on column public.site_chatbot_demandes.traite_le is
  'Date de passage au statut « traite » (remplie par trigger). Sert à supprimer la demande après la durée de conservation.';

-- 2. Remplissage automatique, quel que soit le chemin de la mise à jour (back-office, éditeur SQL…) :
--    passage à « traite » = maintenant ; retour à un autre statut = vide (le délai repartira au prochain traitement).
create or replace function public.site_chatbot_demandes_traite_le()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.statut = 'traite' then
    if old.statut is distinct from 'traite' or new.traite_le is null then
      new.traite_le := now();
    end if;
  else
    new.traite_le := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_site_chatbot_demandes_traite_le on public.site_chatbot_demandes;
create trigger trg_site_chatbot_demandes_traite_le
  before update of statut on public.site_chatbot_demandes
  for each row
  execute function public.site_chatbot_demandes_traite_le();

-- 3. Demandes déjà traitées avant cette migration : date réelle inconnue, le délai part d'aujourd'hui
--    (on conserve un peu plus longtemps plutôt que de supprimer trop tôt).
update public.site_chatbot_demandes
  set traite_le = now()
  where statut = 'traite' and traite_le is null;
