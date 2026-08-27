import type { DateISO } from "../types";

const DATE_PLAFOND = "2026-06-01";
const DATE_SEMAINE_UNIQUE = "2026-08-01";

interface ParamsReforme2026 {
  dateEmbauche: DateISO;
  moisAnciennete: number;
  semaines: number;
}

/**
 * Applique les correctifs de la loi du 3 juin 2026 (M.B. 15/6/2026, entrée
 * en vigueur le 1/8/2026 pour le délai de 1 semaine et le 1/6/2026 pour le
 * plafond de 52 semaines) par-dessus le barème général post-2014, pour les
 * contrats concernés par leur date de début. Confirmé le 2026-08-27 par
 * recherche indépendante (Securex, Semafor, PeoplePay, Elegis) ; la lecture
 * du Moniteur belge lui-même reste à faire pour une validation définitive —
 * voir design spec §12.3.
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
