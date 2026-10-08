import type { SupabaseClient } from "@supabase/supabase-js";
import { DUREE_DEMANDES_MOIS } from "./vie-privee";

/**
 * Suppression automatique des demandes de l'Assistant CG, comme promis dans la politique de vie privée :
 * une demande « traite » est supprimée DUREE_DEMANDES_MOIS mois après son traitement (colonne traite_le,
 * remplie par trigger : migration 20261008120000_site_chatbot_demandes_traite_le.sql).
 * Appelée chaque jour par le cron (/api/veille/analyse), en service_role. Rien n'est journalisé du contenu.
 */

/** Date avant laquelle une demande traitée doit être supprimée. */
export function limiteConservation(maintenant: Date, mois = DUREE_DEMANDES_MOIS): Date {
  const d = new Date(maintenant);
  d.setUTCMonth(d.getUTCMonth() - mois);
  return d;
}

/** Date de suppression prévue d'une demande traitée le `traiteLe`. */
export function suppressionPrevue(traiteLe: string, mois = DUREE_DEMANDES_MOIS): Date {
  const d = new Date(traiteLe);
  d.setUTCMonth(d.getUTCMonth() + mois);
  return d;
}

export async function purgerDemandesChatbot(
  supabase: SupabaseClient,
  maintenant = new Date()
): Promise<{ supprimees: number } | { erreur: string }> {
  const { data, error } = await supabase
    .from("site_chatbot_demandes")
    .delete()
    .eq("statut", "traite")
    .lt("traite_le", limiteConservation(maintenant).toISOString())
    .select("id");
  if (error) {
    // 42703 : colonne traite_le absente (migration pas encore exécutée).
    const message = error.code === "42703" ? "colonne traite_le absente (migration à exécuter)" : error.code || "erreur";
    console.error("[assistant] Purge des demandes :", message);
    return { erreur: message };
  }
  return { supprimees: data?.length ?? 0 };
}
