import type { ManifesteApp } from "../_noyau/types";
import { getSupabaseService } from "../../../lib/supabase-service";
import { utilisateurConnecte } from "../../../lib/espace/acces";

/** App « Accès permanents » : tableau de bord du permanent et fiches de suivi (rapport de congrès, historique). */
export const manifeste: ManifesteApp = {
  code: "permanents",
  sections: [
    { chemin: "accueil", libelle: "Tableau de bord", icone: "grid" },
    { chemin: "fiches", libelle: "Fiches de suivi", icone: "clipboard", aussi: ["^/espace/permanents/fiches/[0-9a-f-]{36}"] },
    { chemin: "fiches/nouvelle", libelle: "Nouvelle fiche", icone: "plus" },
  ],
  // Mes fiches encore en brouillon.
  badge: async () => {
    const db = getSupabaseService();
    const user = await utilisateurConnecte();
    if (!db || !user) return null;
    const { count, error } = await db.from("site_fiches_suivi").select("id", { count: "exact", head: true })
      .eq("auteur_id", user.id).eq("statut", "brouillon");
    if (error || !count) return null;
    return `${count} brouillon${count > 1 ? "s" : ""}`;
  },
};
