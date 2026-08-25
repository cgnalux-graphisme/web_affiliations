import type { TableCP } from "./types";
import { cp124Construction } from "./cp-124-construction";
import { cp126Ameublement } from "./cp-126-ameublement";
import { cp14202RecuperationMetaux } from "./cp-142-02-recuperation-metaux";
import { cp109Confection } from "./cp-109-confection";
import { cp12801Tanneries } from "./cp-128-01-tanneries";
import { cp12802Cuir } from "./cp-128-02-cuir";

/** Exporté (en plus de `tableCP`) pour permettre les tests d'intégrité sur l'ensemble du registre. */
export const REGISTRE: Record<string, TableCP> = {
  "124.00": cp124Construction,
  "126.00": cp126Ameublement,
  "142.02": cp14202RecuperationMetaux,
  "109.00": cp109Confection,
  "128.01": cp12801Tanneries,
  "128.02": cp12802Cuir,
};

export function tableCP(cp: string): TableCP | null {
  return REGISTRE[cp] ?? null;
}

/** Recherche par correspondance approximative : dernière entrée dont `depuis` <= dateEmbauche. */
export function joursParEraDate(eras: { depuis: string; jours: number }[], dateEmbauche: string): number {
  let jours = eras[0].jours;
  for (const era of eras) {
    if (era.depuis <= dateEmbauche) {
      jours = era.jours;
    } else {
      break;
    }
  }
  return jours;
}

export { preavisCct75Employeur } from "./cct-75-supletif";
