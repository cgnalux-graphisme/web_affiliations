interface Palier {
  moisMin: number;
  semaines: number;
}

function lookup(paliers: Palier[], mois: number): number {
  let semaines = paliers[0].semaines;
  for (const palier of paliers) {
    if (mois >= palier.moisMin) {
      semaines = palier.semaines;
    } else {
      break;
    }
  }
  return semaines;
}

/**
 * Barème général employeur, statut unique (Art. 37/2 loi du 3/7/1978),
 * en semaines par mois d'ancienneté acquise. Source: SPF Emploi + Securex,
 * cross-validé classeur ACCG feuille '2014'. Voir design spec §12.1.
 * Valide pour les contrats commencés avant le 1/6/2026 (pas de plafond
 * 52 semaines) — voir baremes/reforme-2026.ts pour le correctif.
 */
const PALIERS_EMPLOYEUR: Palier[] = [
  { moisMin: 0, semaines: 1 },
  { moisMin: 3, semaines: 3 },
  { moisMin: 4, semaines: 4 },
  { moisMin: 5, semaines: 5 },
  { moisMin: 6, semaines: 6 },
  { moisMin: 9, semaines: 7 },
  { moisMin: 12, semaines: 8 },
  { moisMin: 15, semaines: 9 },
  { moisMin: 18, semaines: 10 },
  { moisMin: 21, semaines: 11 },
  { moisMin: 24, semaines: 12 },
  { moisMin: 36, semaines: 13 },
  { moisMin: 48, semaines: 15 },
  { moisMin: 60, semaines: 18 },
  { moisMin: 72, semaines: 21 },
  { moisMin: 84, semaines: 24 },
  { moisMin: 96, semaines: 27 },
  { moisMin: 108, semaines: 30 },
  { moisMin: 120, semaines: 33 },
  { moisMin: 132, semaines: 36 },
  { moisMin: 144, semaines: 39 },
  { moisMin: 156, semaines: 42 },
  { moisMin: 168, semaines: 45 },
  { moisMin: 180, semaines: 48 },
  { moisMin: 192, semaines: 51 },
  { moisMin: 204, semaines: 54 },
  { moisMin: 216, semaines: 57 },
  { moisMin: 228, semaines: 60 },
  { moisMin: 240, semaines: 62 },
  { moisMin: 252, semaines: 63 },
  { moisMin: 264, semaines: 64 },
  { moisMin: 276, semaines: 65 },
  { moisMin: 288, semaines: 66 },
  { moisMin: 300, semaines: 67 },
  { moisMin: 312, semaines: 68 },
  { moisMin: 324, semaines: 69 },
  { moisMin: 336, semaines: 70 },
  { moisMin: 348, semaines: 71 },
  { moisMin: 360, semaines: 72 },
  { moisMin: 372, semaines: 73 },
  { moisMin: 384, semaines: 74 },
  { moisMin: 396, semaines: 75 },
  { moisMin: 408, semaines: 76 },
  { moisMin: 420, semaines: 77 },
  { moisMin: 432, semaines: 78 },
  { moisMin: 444, semaines: 79 },
  { moisMin: 456, semaines: 80 },
  { moisMin: 468, semaines: 81 },
  { moisMin: 480, semaines: 82 },
  { moisMin: 492, semaines: 83 },
  { moisMin: 504, semaines: 84 },
  { moisMin: 516, semaines: 85 },
  { moisMin: 528, semaines: 86 },
  { moisMin: 540, semaines: 87 },
  { moisMin: 552, semaines: 88 },
  { moisMin: 564, semaines: 89 },
  { moisMin: 576, semaines: 90 },
  { moisMin: 588, semaines: 91 },
  { moisMin: 600, semaines: 92 },
  { moisMin: 612, semaines: 93 },
];

/**
 * Barème général démission, statut unique, plafonné à 13 semaines.
 * Source: SPF Emploi, régime du 28/10/2023. Voir design spec §12.1.
 */
const PALIERS_DEMISSION: Palier[] = [
  { moisMin: 0, semaines: 1 },
  { moisMin: 3, semaines: 2 },
  { moisMin: 6, semaines: 3 },
  { moisMin: 12, semaines: 4 },
  { moisMin: 18, semaines: 5 },
  { moisMin: 24, semaines: 6 },
  { moisMin: 48, semaines: 7 },
  { moisMin: 60, semaines: 9 },
  { moisMin: 72, semaines: 10 },
  { moisMin: 84, semaines: 12 },
  { moisMin: 96, semaines: 13 },
];

export function preavisGeneralEmployeur(moisAnciennete: number): number {
  return lookup(PALIERS_EMPLOYEUR, moisAnciennete);
}

export function preavisGeneralDemission(moisAnciennete: number): number {
  return lookup(PALIERS_DEMISSION, moisAnciennete);
}
