import type { ManifesteApp } from "../_noyau/types";
import { getSupabaseServer } from "../../../lib/supabase-server";
import { motsClesTrouves, preparerCorrespondance } from "../../../lib/themes";
import { VEILLE_NOUVEAU } from "../../../lib/veille";

/** Nouveaux articles du fil lus pour le calcul de pertinence (comme l'écran « Le fil »). */
const LIMITE_NOUVEAUX = 1000;

/** App « Scan News » : le fil et le Check IA, articles, « On vous explique », sources, thématiques. */
export const manifeste: ManifesteApp = {
  code: "scan-news",
  sections: [
    { chemin: "fil", libelle: "Le fil", icone: "rss" },
    { chemin: "articles", libelle: "Articles", icone: "newspaper" },
    { chemin: "articles/nouveau", libelle: "Écrire un article", icone: "pen" },
    { chemin: "explications", libelle: "On vous explique", icone: "lightbulb" },
    { chemin: "explications/nouvelle", libelle: "Importer une note", icone: "upload" },
    { chemin: "sources", libelle: "Sources", icone: "list" },
    { chemin: "themes", libelle: "Thématiques", icone: "tag" },
  ],
  // Articles pertinents à trier : au moins un mot-clé actif dans le titre ou le résumé (même règle que « Le fil »).
  badge: async () => {
    const supabase = await getSupabaseServer();
    const [nouveaux, themes] = await Promise.all([
      supabase.from("site_veille").select("titre, resume").eq("statut", VEILLE_NOUVEAU).limit(LIMITE_NOUVEAUX),
      supabase.from("site_themes").select("mot_cle").eq("actif", true),
    ]);
    if (nouveaux.error || themes.error) return null;
    const correspondance = preparerCorrespondance(((themes.data ?? []) as { mot_cle: string }[]).map((t) => t.mot_cle));
    const n = ((nouveaux.data ?? []) as { titre: string; resume: string | null }[]).filter(
      (it) => motsClesTrouves(it, correspondance).length > 0
    ).length;
    return n ? `${n} à trier` : null;
  },
};
