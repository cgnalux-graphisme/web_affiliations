import type { DateISO } from "../types";

const DATE_PLAFOND = "2026-06-01";
const DATE_SEMAINE_UNIQUE = "2026-08-01";

interface ParamsReforme2026 {
  dateEmbauche: DateISO;
  moisAnciennete: number;
  semaines: number;
}

/**
 * Applique les correctifs de la loi du 3 juillet 2026 (entrée en vigueur
 * le 1/8/2026) par-dessus le barème général post-2014, pour les contrats
 * concernés par leur date de début. Non confirmé sur source primaire
 * (Moniteur belge) — voir design spec §12.3, à valider avant mise en
 * production.
 */
export function appliquerReforme2026(params: ParamsReforme2026): number {
  const { dateEmbauche, moisAnciennete, semaines } = params;
  let resultat = semaines;

  if (dateEmbauche >= DATE_SEMAINE_UNIQUE && moisAnciennete < 6) {
    resultat = 1;
  }

  if (dateEmbauche >= DATE_PLAFOND && moisAnciennete >= 204) {
    resultat = Math.min(resultat, 52);
  }

  return resultat;
}
