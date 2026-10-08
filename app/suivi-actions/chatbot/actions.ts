"use server";

import { revalidatePath } from "next/cache";
import { STATUTS_DEMANDE_CHATBOT, type StatutDemandeChatbot } from "../../../lib/assistant-demandes";
import { getSuperAdmin } from "../../../lib/supabase-server";
import { getSupabaseService } from "../../../lib/supabase-service";

/**
 * Back-office « Demandes chatbot » : chaque action revérifie la session SUPER_ADMIN, puis passe par la clé
 * service_role (les tables du chatbot ne sont pas lisibles autrement). Rien n'est journalisé.
 */

type Resultat = { ok: true } | { ok: false; erreur: string };

async function client() {
  if (!(await getSuperAdmin())) return null;
  return getSupabaseService();
}

export async function changerStatutDemande(id: string, statut: StatutDemandeChatbot): Promise<Resultat> {
  if (!STATUTS_DEMANDE_CHATBOT.some((s) => s.valeur === statut)) return { ok: false, erreur: "Statut inconnu." };
  const supabase = await client();
  if (!supabase) return { ok: false, erreur: "Accès refusé. Reconnectez-vous." };
  const { data, error } = await supabase.from("site_chatbot_demandes").update({ statut }).eq("id", id).select("id");
  if (error || !data?.length) {
    console.error("[chatbot admin] statut :", error?.code ?? "aucune ligne");
    return { ok: false, erreur: "Le statut n'a pas pu être enregistré. Rechargez la page et réessayez." };
  }
  revalidatePath("/suivi-actions/chatbot");
  return { ok: true };
}

export async function supprimerDemande(id: string): Promise<Resultat> {
  const supabase = await client();
  if (!supabase) return { ok: false, erreur: "Accès refusé. Reconnectez-vous." };
  const { error } = await supabase.from("site_chatbot_demandes").delete().eq("id", id);
  if (error) {
    console.error("[chatbot admin] suppression :", error.code);
    return { ok: false, erreur: "La demande n'a pas pu être supprimée. Réessayez." };
  }
  revalidatePath("/suivi-actions/chatbot");
  return { ok: true };
}

/** Registre national d'une demande, lu seulement quand l'administrateur clique « Afficher ». */
export async function lireRegistreNational(id: string): Promise<{ ok: true; valeur: string } | { ok: false; erreur: string }> {
  const supabase = await client();
  if (!supabase) return { ok: false, erreur: "Accès refusé. Reconnectez-vous." };
  const { data, error } = await supabase.from("site_chatbot_demandes").select("registre_national").eq("id", id).maybeSingle();
  if (error || !data) return { ok: false, erreur: "Numéro introuvable." };
  return { ok: true, valeur: (data.registre_national as string | null) ?? "" };
}
