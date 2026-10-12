import type { ManifesteApp } from "../_noyau/types";
import { getSupabaseService } from "../../../lib/supabase-service";

/** App « Démarches & demandes » : formulaires des affiliés (historique, PDF) et demandes du chatbot. */
export const manifeste: ManifesteApp = {
  code: "demarches",
  sections: [
    { chemin: "demandes", libelle: "Démarches des affiliés", icone: "folder" },
    { chemin: "chatbot", libelle: "Demandes chatbot", icone: "message" },
  ],
  // Demandes chatbot pas encore prises en charge (table lisible seulement côté serveur, en service_role ;
  // le droit sur l'app est vérifié avant tout appel de badge).
  badge: async () => {
    const db = getSupabaseService();
    if (!db) return null;
    const { count, error } = await db
      .from("site_chatbot_demandes")
      .select("id", { count: "exact", head: true })
      .eq("statut", "nouveau");
    if (error || !count) return null;
    return `${count} nouvelle${count > 1 ? "s" : ""}`;
  },
};
