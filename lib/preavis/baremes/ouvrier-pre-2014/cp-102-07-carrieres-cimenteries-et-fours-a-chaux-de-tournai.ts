import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp10207CarrieresCimenteriesEtFours: TableCP = {
  cp: "102.07",
  nom: "Carrieres, cimenteries et fours a chaux de Tournai",
  employeur: [
    { depuis: "1900-01-01", jours: 224 },
    { depuis: "1989-01-01", jours: 161 },
    { depuis: "1994-01-01", jours: 133 },
    { depuis: "1999-01-01", jours: 105 },
    { depuis: "2004-01-01", jours: 77 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1989-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "1999-01-01", jours: 14 },
    { depuis: "2004-01-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
