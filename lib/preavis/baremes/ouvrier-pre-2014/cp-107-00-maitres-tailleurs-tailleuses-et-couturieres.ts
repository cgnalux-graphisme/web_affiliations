import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp10700MaitresTailleursTailleusesEt: TableCP = {
  cp: "107.00",
  nom: "Maitres-tailleurs, tailleuses et couturieres",
  employeur: [
    { depuis: "1900-01-01", jours: 120 },
    { depuis: "1994-01-01", jours: 90 },
    { depuis: "1999-01-01", jours: 60 },
    { depuis: "2004-01-01", jours: 45 },
    { depuis: "2009-01-01", jours: 37 },
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
