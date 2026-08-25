import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp124Construction: TableCP = {
  cp: "124.00",
  nom: "Construction",
  employeur: [
    { depuis: "1900-01-01", jours: 56 },
    { depuis: "1994-01-01", jours: 28 },
    { depuis: "2011-01-01", jours: 14 },
    { depuis: "2012-01-01", jours: 16 },
    { depuis: "2013-07-01", jours: 4 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "2011-01-01", jours: 7 },
    { depuis: "2012-01-01", jours: 7 },
    { depuis: "2013-07-01", jours: 1 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
