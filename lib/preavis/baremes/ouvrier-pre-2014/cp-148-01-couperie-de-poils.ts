import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp14801CouperieDePoils: TableCP = {
  cp: "148.01",
  nom: "Couperie de poils",
  employeur: [
    { depuis: "1900-01-01", jours: 129 },
    { depuis: "1994-01-01", jours: 97 },
    { depuis: "1999-01-01", jours: 64 },
    { depuis: "2004-01-01", jours: 48 },
    { depuis: "2009-01-01", jours: 40 },
    { depuis: "2013-07-01", jours: 28 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "1999-01-01", jours: 14 },
    { depuis: "2004-01-01", jours: 14 },
    { depuis: "2009-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
