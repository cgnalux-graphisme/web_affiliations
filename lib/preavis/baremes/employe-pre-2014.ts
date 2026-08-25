import type { QuiRompt } from "../types";

/** Seuil de rémunération annuelle brute au 31/12/2013 (design spec §12.4). */
export const SEUIL_REMUNERATION_2013 = 32254;

interface ParamsEmployePre2014 {
  anneesAnciennete: number;
  remunerationAnnuelle: number;
  quiRompt: QuiRompt;
}

interface ResultatEmployePre2014 {
  mois: number;
  incertain: boolean;
}

export function preavisEmployePre2014(params: ParamsEmployePre2014): ResultatEmployePre2014 {
  const { anneesAnciennete, remunerationAnnuelle, quiRompt } = params;
  const sousLeSeuil = remunerationAnnuelle <= SEUIL_REMUNERATION_2013;

  if (sousLeSeuil) {
    // 3 mois par tranche de 5 ans entamée, même règle employeur/démission (source confirmée).
    const tranches = Math.ceil(anneesAnciennete / 5);
    return { mois: tranches * 3, incertain: false };
  }

  // Au-dessus du seuil : 1 mois par année entamée, minimum 3 mois (licenciement, confirmé).
  const moisLicenciement = Math.max(3, Math.ceil(anneesAnciennete));

  if (quiRompt === "employeur") {
    return { mois: moisLicenciement, incertain: false };
  }

  // Démission au-dessus du seuil : règle non confirmée sur source primaire
  // (design spec §12.4) — approximation "moitié, plafond 13 semaines/~3 mois".
  const PLAFOND_MOIS_DEMISSION = 3;
  const moisDemission = Math.min(Math.round(moisLicenciement / 2), PLAFOND_MOIS_DEMISSION);
  return { mois: moisDemission, incertain: true };
}
