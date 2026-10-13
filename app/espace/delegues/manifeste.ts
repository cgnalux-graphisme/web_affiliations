import type { ManifesteApp } from "../_noyau/types";
import { getSupabaseService } from "../../../lib/supabase-service";
import { accesDelegues } from "../../../lib/permanents/perimetre-serveur";

/**
 * App « Gestion délégués CG Link » : délégués, mandats, import CG Link. SUPER_ADMIN : tout ; permanent : les délégués
 * de ses entreprises, sans les paramètres de connexion (comptes CG Link), ni l'import, ni le journal.
 */
export const manifeste: ManifesteApp = {
  code: "delegues",
  sections: [
    { chemin: "liste", libelle: "Délégués", icone: "id-card", aussi: ["^/espace/delegues/[0-9a-f-]{36}"] },
    { chemin: "nouveau", libelle: "Nouveau délégué", icone: "plus" },
    { chemin: "a-verifier", libelle: "À vérifier", icone: "flag" },
    { chemin: "import", libelle: "Import CG Link", icone: "upload", superAdmin: true },
    { chemin: "journal", libelle: "Journal", icone: "history", superAdmin: true },
  ],
  badge: async () => {
    const db = getSupabaseService();
    const acces = await accesDelegues();
    if (!db || !acces) return null;
    const [{ data: d }, { data: m }] = await Promise.all([
      db.from("site_delegues").select("entreprise_id").not("a_verifier", "is", null),
      db.from("site_delegue_mandats").select("delegue:site_delegues(entreprise_id)").not("a_verifier", "is", null),
    ]);
    const garde = (e: string | null | undefined) => acces.tout || Boolean(e && acces.fiches.has(e));
    const n =
      ((d ?? []) as { entreprise_id: string }[]).filter((x) => garde(x.entreprise_id)).length +
      ((m ?? []) as unknown as { delegue: { entreprise_id: string } | null }[]).filter((x) => garde(x.delegue?.entreprise_id)).length;
    return n > 0 ? `${n} à vérifier` : null;
  },
};
