import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp126Ameublement: TableCP = {
  cp: "126.00",
  nom: "Ameublement et industrie transformatrice du bois",
  employeur: [
    { depuis: "1900-01-01", jours: 112 },
    { depuis: "1994-01-01", jours: 28 },
    { depuis: "2013-01-01", jours: 32 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "2013-01-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
