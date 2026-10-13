import type { ManifesteApp } from "../_noyau/types";
import { getSupabaseService } from "../../../lib/supabase-service";

/** App « Gestion délégués CG Link » : délégués, mandats, import CG Link. SUPER_ADMIN uniquement (layout). */
export const manifeste: ManifesteApp = {
  code: "delegues",
  sections: [
    { chemin: "liste", libelle: "Délégués", icone: "id-card", aussi: ["^/espace/delegues/[0-9a-f-]{36}"] },
    { chemin: "nouveau", libelle: "Nouveau délégué", icone: "plus" },
    { chemin: "a-verifier", libelle: "À vérifier", icone: "flag" },
    { chemin: "import", libelle: "Import CG Link", icone: "upload" },
    { chemin: "journal", libelle: "Journal", icone: "history" },
  ],
  badge: async () => {
    const db = getSupabaseService();
    if (!db) return null;
    const [{ count: d }, { count: m }] = await Promise.all([
      db.from("site_delegues").select("id", { count: "exact", head: true }).not("a_verifier", "is", null),
      db.from("site_delegue_mandats").select("id", { count: "exact", head: true }).not("a_verifier", "is", null),
    ]);
    const n = (d ?? 0) + (m ?? 0);
    return n > 0 ? `${n} à vérifier` : null;
  },
};
