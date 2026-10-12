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
  // Fiches CG Link sans n° BCE : entreprises CG Link moins celles dont la fiche porte un numéro.
  badge: async () => {
    const db = getSupabaseService();
    if (!db) return null;
    const [{ count: total }, { count: avecBce }] = await Promise.all([
      db.from("companies").select("id", { count: "exact", head: true }),
      db.from("site_entreprises").select("id", { count: "exact", head: true }).not("company_id", "is", null).not("numero_bce", "is", null),
    ]);
    const n = (total ?? 0) - (avecBce ?? 0);
    return n > 0 ? `${n} à compléter` : null;
  },
};
