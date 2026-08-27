import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp10602IndustrieDuBeton: TableCP = {
  cp: "106.02",
  nom: "Industrie du beton",
  employeur: [
    { depuis: "1900-01-01", jours: 112 },
    { depuis: "1994-01-01", jours: 84 },
    { depuis: "1999-01-01", jours: 56 },
    { depuis: "2004-01-01", jours: 42 },
    { depuis: "2009-01-01", jours: 35 },
    { depuis: "2012-01-01", jours: 40 },
    { depuis: "2013-07-01", jours: 28 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "1999-01-01", jours: 14 },
    { depuis: "2004-01-01", jours: 14 },
    { depuis: "2009-01-01", jours: 14 },
    { depuis: "2012-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
