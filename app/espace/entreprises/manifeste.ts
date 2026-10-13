import type { ManifesteApp } from "../_noyau/types";
import { getSupabaseService } from "../../../lib/supabase-service";

/** App « Entreprises » : fiches, BCE, sites (UTE), unités d'établissement, ONSS, bloc adresse. */
export const manifeste: ManifesteApp = {
  code: "entreprises",
  sections: [
    { chemin: "liste", libelle: "Entreprises", icone: "building", aussi: ["^/espace/entreprises/(?!nouvelle|bce$)[^/]+"] },
    { chemin: "nouvelle", libelle: "Nouvelle entreprise", icone: "plus" },
    { chemin: "bce", libelle: "Import BCE", icone: "upload" },
  ],
  // Fiches sans n° BCE (toutes les entreprises ont leur fiche depuis la migration du 13/10/2026).
  badge: async () => {
    const db = getSupabaseService();
    if (!db) return null;
    const { count, error } = await db.from("site_entreprises").select("id", { count: "exact", head: true }).is("numero_bce", null);
    if (error || !count) return null;
    return `${count} à compléter`;
  },
};
