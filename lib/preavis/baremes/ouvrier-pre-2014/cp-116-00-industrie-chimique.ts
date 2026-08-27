import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp11600IndustrieChimique: TableCP = {
  cp: "116.00",
  nom: "Industrie chimique",
  employeur: [
    { depuis: "1900-01-01", jours: 245 },
    { depuis: "1989-01-01", jours: 189 },
    { depuis: "1994-01-01", jours: 147 },
    { depuis: "1999-01-01", jours: 119 },
    { depuis: "2004-01-01", jours: 63 },
    { depuis: "2009-01-01", jours: 42 },
    { depuis: "2013-07-01", jours: 28 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1989-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "1999-01-01", jours: 14 },
    { depuis: "2004-01-01", jours: 14 },
    { depuis: "2009-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
