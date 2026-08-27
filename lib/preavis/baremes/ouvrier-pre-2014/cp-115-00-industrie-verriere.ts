import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp11500IndustrieVerriere: TableCP = {
  cp: "115.00",
  nom: "Industrie verriere",
  employeur: [
    { depuis: "1900-01-01", jours: 224 },
    { depuis: "1979-01-01", jours: 196 },
    { depuis: "1984-01-01", jours: 168 },
    { depuis: "1989-01-01", jours: 140 },
    { depuis: "1994-01-01", jours: 105 },
    { depuis: "1999-01-01", jours: 64 },
    { depuis: "2004-01-01", jours: 48 },
    { depuis: "2009-01-01", jours: 40 },
    { depuis: "2013-07-01", jours: 7 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1979-01-01", jours: 28 },
    { depuis: "1984-01-01", jours: 28 },
    { depuis: "1989-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "1999-01-01", jours: 14 },
    { depuis: "2004-01-01", jours: 14 },
    { depuis: "2009-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 3 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
