/**
 * Veille : statuts des items (site_veille) et validation des adresses de flux (site_sources).
 * Sans dépendance : utilisable côté navigateur. La lecture des flux est dans lib/veille-flux.ts (serveur).
 */

/** Valeurs de site_veille.statut. */
export const VEILLE_NOUVEAU = "nouveau";
export const VEILLE_IGNORE = "ignore";
export const VEILLE_TRAITE = "traite";
export const STATUTS_VEILLE = [VEILLE_NOUVEAU, VEILLE_TRAITE, VEILLE_IGNORE] as const;
export type StatutVeille = (typeof STATUTS_VEILLE)[number];
export const LIBELLES_STATUT: Record<StatutVeille, string> = {
  [VEILLE_NOUVEAU]: "Nouveau",
  [VEILLE_TRAITE]: "Traité",
  [VEILLE_IGNORE]: "Ignoré",
};

/** Adresse http(s) complète, ou null. */
export function lienValide(url: string): string | null {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Adresse de flux acceptable : http(s) complète. */
export function urlFluxValide(url: string): boolean {
  return lienValide(url) !== null;
}
