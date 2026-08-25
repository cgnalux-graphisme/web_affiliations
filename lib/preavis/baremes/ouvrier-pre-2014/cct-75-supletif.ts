/**
 * Régime intersectoriel supplétif, CCT n°75 du 20/12/1999, art. 2.
 * Contrairement aux tables par CP (indexées par date d'embauche), ce
 * régime est indexé par ANCIENNETÉ au 31/12/2013 (en mois). S'applique
 * en licenciement par l'employeur uniquement — la CCT 75 ne couvre pas
 * la démission (voir design spec §12.2).
 * Non couvert : ancienneté < 6 mois au 31/12/2013 (non trouvé dans les
 * sources consultées) — retourne null, à traiter par message
 * d'orientation côté appelant.
 */
export function preavisCct75Employeur(moisAncienneteAu20131231: number): number | null {
  if (moisAncienneteAu20131231 < 6) return null;
  if (moisAncienneteAu20131231 < 60) return 35;
  if (moisAncienneteAu20131231 < 120) return 42;
  if (moisAncienneteAu20131231 < 180) return 56;
  if (moisAncienneteAu20131231 < 240) return 84;
  return 112;
}
