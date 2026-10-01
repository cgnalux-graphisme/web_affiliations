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

/** Mémoire du fil : au-delà, les articles sont effacés et plus jamais ramassés (choix de Fred, 01/10/2026). */
export const MEMOIRE_JOURS = 3;
const JOUR_MS = 24 * 60 * 60 * 1000;

/** Date limite de la mémoire du fil (ISO) : tout article plus ancien est purgé. */
export function limiteMemoire(maintenant: Date = new Date()): string {
  return new Date(maintenant.getTime() - MEMOIRE_JOURS * JOUR_MS).toISOString();
}

/**
 * Un article du flux peut-il entrer dans le fil ? Oui s'il a moins de MEMOIRE_JOURS jours,
 * ou s'il n'a pas de date. Sans ce filtre, un article purgé encore présent dans le flux reviendrait « nouveau ».
 */
export function dansLaMemoire(datePublication: string | null, maintenant: Date = new Date()): boolean {
  if (!datePublication) return true;
  const t = new Date(datePublication).getTime();
  return Number.isNaN(t) || t >= maintenant.getTime() - MEMOIRE_JOURS * JOUR_MS;
}

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
