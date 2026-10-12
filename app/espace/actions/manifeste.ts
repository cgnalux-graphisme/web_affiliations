import type { ManifesteApp } from "../_noyau/types";
import { getSupabaseServer } from "../../../lib/supabase-server";

/** App « Actions syndicales » : encodage, liste, mobilisations, rapport de congrès. */
export const manifeste: ManifesteApp = {
  code: "actions",
  sections: [
    // La modification d'une action (/espace/actions/<id>/modifier) reste rattachée à la liste.
    { chemin: "liste", libelle: "Toutes les actions", icone: "list", aussi: ["^/espace/actions/[0-9a-f-]{36}/"] },
    { chemin: "nouvelle", libelle: "Encoder une action", icone: "plus" },
    { chemin: "mobilisations", libelle: "Mobilisations", icone: "flag" },
    { chemin: "rapport", libelle: "Rapport de congrès", icone: "file-text" },
  ],
  badge: async () => {
    const supabase = await getSupabaseServer();
    const { count, error } = await supabase
      .from("site_actions")
      .select("id", { count: "exact", head: true })
      .eq("visible_public", false);
    if (error || !count) return null;
    return `${count} non publiée${count > 1 ? "s" : ""}`;
  },
};
