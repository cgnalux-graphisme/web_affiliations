import { cache } from "react";
import { COLONNES_PUBLIQUES, type MobilisationPublique } from "./mobilisations";
import { getSupabase } from "./supabase";

/**
 * La mobilisation mise en avant sur le site public, lue UNIQUEMENT dans la vue site_accueil_mobilisation :
 * elle ne renvoie une ligne que si l'interrupteur « accueil_mobilisation » est sur « on » ET qu'une
 * mobilisation est active. Sans ligne (ou en cas d'erreur) : null, et le site n'affiche ni bloc, ni bandeau,
 * ni page campagne. Mis en cache pour la requête (layout + page).
 */
export const chargerMobilisationActive = cache(async (): Promise<MobilisationPublique | null> => {
  const { data, error } = await getSupabase()
    .from("site_accueil_mobilisation")
    .select(COLONNES_PUBLIQUES)
    .order("date_evenement", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("site_accueil_mobilisation:", error.message);
    return null;
  }
  const m = data as MobilisationPublique | null;
  return m?.titre?.trim() ? m : null;
});
