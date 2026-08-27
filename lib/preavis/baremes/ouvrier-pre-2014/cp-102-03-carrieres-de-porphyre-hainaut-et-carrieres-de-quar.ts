import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp10203CarrieresDePorphyreHainaut: TableCP = {
  cp: "102.03",
  nom: "Carrieres de porphyre (Hainaut) et carrieres de quartzite (Brabant wallon)",
  employeur: [
    { depuis: "1900-01-01", jours: 129 },
    { depuis: "1994-01-01", jours: 98 },
    { depuis: "1999-01-01", jours: 70 },
    { depuis: "2004-01-01", jours: 49 },
    { depuis: "2009-01-01", jours: 42 },
    { depuis: "2013-07-01", jours: 35 },
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
