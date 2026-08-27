import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp14805TanneriesDePeaux: TableCP = {
  cp: "148.05",
  nom: "Tanneries de peaux",
  employeur: [
    { depuis: "1900-01-01", jours: 112 },
    { depuis: "1994-01-01", jours: 84 },
    { depuis: "1999-01-01", jours: 42 },
    { depuis: "2009-01-01", jours: 35 },
    { depuis: "2013-07-01", jours: 28 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "1999-01-01", jours: 14 },
    { depuis: "2009-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
