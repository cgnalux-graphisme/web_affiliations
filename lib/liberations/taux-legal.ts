/**
 * Taux kilométrique légal de référence (Belgique), affiché À TITRE INFORMATIF dans Paramètres › Taux kilométrique.
 * Indemnité des fonctionnaires fédéraux pour l'usage de leur véhicule personnel, système trimestriel : c'est aussi le
 * plafond forfaitaire admis par l'ONSS dans le privé. Il change chaque trimestre : relevé à la main, à mettre à jour.
 * Le taux appliqué aux libérations reste celui que les admins encodent.
 */
export const TAUX_LEGAL = {
  taux: 0.4452,
  du: "2026-10-01",
  au: "2026-12-31",
  texte: "circulaire n° 771 du 16/09/2026 (Moniteur belge du 29/09/2026)",
  /** Système annuel (certains secteurs, ex. CP 329.02), pour comparaison. */
  annuel: { taux: 0.4761, du: "2026-07-01", au: "2027-06-30" },
  releveLe: "2026-10-14",
} as const;
