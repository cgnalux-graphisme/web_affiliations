import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp12001IndustrieTextileDeL: TableCP = {
  cp: "120.01",
  nom: "Industrie textile de l'arrondissement de Verviers",
  employeur: [
    { depuis: "1900-01-01", jours: 119 },
    { depuis: "1994-01-01", jours: 91 },
    { depuis: "1999-01-01", jours: 63 },
    { depuis: "2004-01-01", jours: 49 },
    { depuis: "2009-01-01", jours: 42 },
    { depuis: "2013-07-01", jours: 7 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 59 },
    { depuis: "1994-01-01", jours: 45 },
    { depuis: "1999-01-01", jours: 31 },
    { depuis: "2004-01-01", jours: 24 },
    { depuis: "2009-01-01", jours: 21 },
    { depuis: "2013-07-01", jours: 3 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
