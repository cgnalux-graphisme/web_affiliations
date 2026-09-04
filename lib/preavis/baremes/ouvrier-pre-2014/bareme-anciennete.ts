import type { PalierAnciennete, RegimeParDateEmbauche } from "./types";

/** Recherche par correspondance approximative : dernière entrée dont `depuisEmbauche` <= dateEmbauche. */
export function regimeParDateEmbauche(regimes: RegimeParDateEmbauche[], dateEmbauche: string): RegimeParDateEmbauche {
  let regime = regimes[0];
  for (const r of regimes) {
    if (r.depuisEmbauche <= dateEmbauche) {
      regime = r;
    } else {
      break;
    }
  }
  return regime;
}

/**
 * Recherche par correspondance approximative : dernier palier dont
 * `moisMin` <= ancienneté (en mois entiers). Retourne `null` si `paliers`
 * vaut `null` (régime non sourcé, voir `RegimeParDateEmbauche`), si la
 * liste est vide, ou si `moisAnciennete` est inférieur au premier palier
 * documenté (certaines tables sourcées ne couvrent pas les anciennetés les
 * plus faibles — mieux vaut signaler l'absence de source que de réutiliser
 * à tort la valeur du premier palier connu).
 */
export function joursParPalierAnciennete(paliers: PalierAnciennete[] | null, moisAnciennete: number): number | null {
  if (paliers === null || paliers.length === 0) return null;
  if (moisAnciennete < paliers[0].moisMin) return null;
  let jours = paliers[0].jours;
  for (const palier of paliers) {
    if (palier.moisMin <= moisAnciennete) {
      jours = palier.jours;
    } else {
      break;
    }
  }
  return jours;
}
