import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp109Confection: TableCP = {
  cp: "109.00",
  nom: "Confection et habillement",
  employeur: [
    { depuis: "1900-01-01", jours: 64 },
    { depuis: "1994-01-01", jours: 32 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
