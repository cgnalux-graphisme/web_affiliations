import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp13300IndustrieDesTabacs: TableCP = {
  cp: "133.00",
  nom: "Industrie des tabacs",
  employeur: [
    { depuis: "1900-01-01", jours: 182 },
    { depuis: "1994-01-01", jours: 140 },
    { depuis: "1999-01-01", jours: 112 },
    { depuis: "2004-01-01", jours: 70 },
    { depuis: "2011-01-01", jours: 49 },
    { depuis: "2013-07-01", jours: 28 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "1999-01-01", jours: 14 },
    { depuis: "2004-01-01", jours: 14 },
    { depuis: "2011-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
