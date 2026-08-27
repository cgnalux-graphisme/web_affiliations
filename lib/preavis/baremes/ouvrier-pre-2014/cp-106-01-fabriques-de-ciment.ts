import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp10601FabriquesDeCiment: TableCP = {
  cp: "106.01",
  nom: "Fabriques de ciment",
  employeur: [
    { depuis: "1900-01-01", jours: 213 },
    { depuis: "1989-01-01", jours: 175 },
    { depuis: "1994-01-01", jours: 140 },
    { depuis: "1999-01-01", jours: 105 },
    { depuis: "2004-01-01", jours: 70 },
    { depuis: "2009-01-01", jours: 35 },
    { depuis: "2012-01-01", jours: 40 },
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
    { depuis: "2012-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
