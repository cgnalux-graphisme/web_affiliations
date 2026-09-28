import { getSupabase } from "./supabase";

/**
 * Enregistre une demande d'un formulaire public (tables web_*) en lui donnant un identifiant choisi
 * dans le navigateur : la clé publique ne peut pas relire la ligne insérée, et cet identifiant sert
 * ensuite à rattacher les e-mails envoyés à la demande (historique du back-office).
 * Si la base refuse l'identifiant fourni (droit manquant sur la colonne id), la demande est
 * enregistrée sans lui : le formulaire ne doit jamais échouer à cause de l'historique.
 */
export async function insererDemande(
  table: "web_affiliations" | "web_mandats_sepa" | "web_c1" | "web_c3_2",
  ligne: Record<string, unknown>
): Promise<{ id: string | null; error: { message: string; code?: string } | null }> {
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : null;
  if (id) {
    const { error } = await getSupabase().from(table).insert({ ...ligne, id });
    if (!error) return { id, error: null };
    // Seul un refus de droit justifie un second essai (sinon, risque de doublon).
    if (error.code !== "42501") return { id: null, error };
    console.warn(`[insererDemande] identifiant refusé pour ${table}, enregistrement sans historique.`);
  }
  const { error } = await getSupabase().from(table).insert(ligne);
  return { id: null, error };
}
