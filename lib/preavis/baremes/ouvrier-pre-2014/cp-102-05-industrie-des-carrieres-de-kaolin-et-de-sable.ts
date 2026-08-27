import type { TableCP } from "./types";

/** Source: classeur ACCG accg-preavis-employeur.xlsx / accg-preavis-travailleur.xlsx (design spec §12.2). */
export const cp10205IndustrieDesCarrieresDe: TableCP = {
  cp: "102.05",
  nom: "Industrie des carrieres de kaolin et de sable",
  employeur: [
    { depuis: "1900-01-01", jours: 364 },
    { depuis: "2004-01-01", jours: 182 },
    { depuis: "2009-01-01", jours: 91 },
    { depuis: "2013-07-01", jours: 28 },
    { depuis: "2014-01-01", jours: 0 },
  ],
  demission: [
    { depuis: "1900-01-01", jours: 28 },
    { depuis: "1994-01-01", jours: 14 },
    { depuis: "2004-01-01", jours: 14 },
    { depuis: "2009-01-01", jours: 14 },
    { depuis: "2013-07-01", jours: 14 },
    { depuis: "2014-01-01", jours: 0 },
  ],
};
