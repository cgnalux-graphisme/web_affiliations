import { cache } from "react";
import { getSupabaseServer } from "../../../lib/supabase-server";
import { getSupabaseService } from "../../../lib/supabase-service";
import { mesApps, monProfil } from "../../../lib/espace/acces";
import { routeSection, type AppNav, type ManifesteApp } from "./types";
import { manifeste as actions } from "../actions/manifeste";
import { manifeste as scanNews } from "../scan-news/manifeste";
import { manifeste as demarches } from "../demarches/manifeste";
import { manifeste as entreprises } from "../entreprises/manifeste";
import { manifeste as delegues } from "../delegues/manifeste";
import { manifeste as permanents } from "../permanents/manifeste";
import { manifeste as parametres } from "../parametres/manifeste";

/**
 * REGISTRE CENTRAL des apps construites. SERVEUR UNIQUEMENT (les badges lisent la base).
 * Ajouter une app : créer app/espace/<code>/ (manifeste, layout, page, sections), l'ajouter ici,
 * puis insérer sa ligne dans site_apps (+ ses rôles par défaut dans site_app_roles). Voir CLAUDE.md.
 */
export const MANIFESTES: ManifesteApp[] = [actions, scanNews, demarches, permanents, entreprises, delegues, parametres];

/** Apps prévues mais pas encore construites : tuiles « Bientôt », non cliquables, sans aucun droit associé. */
export const PROCHAINES_APPS = [
  { nom: "Mémoire CG", description: "CCT, accords sectoriels et précédents", icone: "book" },
];

type LigneApp = {
  code: string;
  nom: string;
  description: string | null;
  icone: string | null;
  couleur: string | null;
  ordre: number;
  actif: boolean;
};

/** Couleur de repli d'une app sans couleur valide en base. */
const COULEUR_DEFAUT = "#7C90A0";
const HEX = /^#[0-9a-f]{6}$/i;

/** Catalogue site_apps (apps actives, dans l'ordre). Données non sensibles, lues côté serveur. */
const catalogue = cache(async (): Promise<LigneApp[]> => {
  const db = getSupabaseService() ?? (await getSupabaseServer());
  const { data, error } = await db
    .from("site_apps")
    .select("code, nom, description, icone, couleur, ordre, actif")
    .eq("actif", true)
    .order("ordre", { ascending: true });
  if (error) {
    console.error("[espace] site_apps :", error.code);
    return [];
  }
  return (data ?? []) as LigneApp[];
});

function versNav(ligne: LigneApp, m: ManifesteApp, superAdmin = true): AppNav {
  return {
    code: ligne.code,
    nom: ligne.nom,
    description: ligne.description ?? "",
    icone: ligne.icone ?? "grid",
    couleur: ligne.couleur && HEX.test(ligne.couleur) ? ligne.couleur : COULEUR_DEFAUT,
    sections: m.sections.filter((s) => superAdmin || !s.superAdmin).map((s) => ({
      route: routeSection(m.code, s.chemin),
      libelle: s.libelle,
      icone: s.icone,
      aussi: s.aussi,
    })),
  };
}

/** Les apps de la personne connectée : catalogue actif ∩ site_mes_apps() ∩ apps construites. */
export const appsDeLaPersonne = cache(async (): Promise<AppNav[]> => {
  const [lignes, codes, profil] = await Promise.all([catalogue(), mesApps(), monProfil()]);
  const permis = new Set(codes);
  const superAdmin = profil?.role === "SUPER_ADMIN";
  return lignes.flatMap((l) => {
    const m = MANIFESTES.find((x) => x.code === l.code);
    return m && permis.has(l.code) ? [versNav(l, m, superAdmin)] : [];
  });
});

/** Toutes les apps construites et actives (écrans de gestion des accès, lot 2). */
export const toutesLesApps = cache(async (): Promise<AppNav[]> => {
  const lignes = await catalogue();
  return lignes.flatMap((l) => {
    const m = MANIFESTES.find((x) => x.code === l.code);
    return m ? [versNav(l, m)] : [];
  });
});

/** Une app (pour sa garde et son en-tête), même si la personne n'y a pas droit. */
export async function appParCode(code: string): Promise<AppNav | null> {
  return (await toutesLesApps()).find((a) => a.code === code) ?? null;
}

/** Badges des tuiles, seulement pour les apps données (droit déjà vérifié). Délai : 4 s par badge. */
export async function badges(codes: string[]): Promise<Record<string, string>> {
  const resultats = await Promise.all(
    codes.map(async (code) => {
      const m = MANIFESTES.find((x) => x.code === code);
      if (!m?.badge) return [code, null] as const;
      try {
        const valeur = await Promise.race([
          m.badge(),
          new Promise<null>((r) => setTimeout(() => r(null), 4000)),
        ]);
        return [code, valeur] as const;
      } catch (err) {
        console.error(`[espace] badge ${code} :`, err instanceof Error ? err.message : "erreur");
        return [code, null] as const;
      }
    })
  );
  return Object.fromEntries(resultats.filter((r): r is readonly [string, string] => Boolean(r[1])));
}
