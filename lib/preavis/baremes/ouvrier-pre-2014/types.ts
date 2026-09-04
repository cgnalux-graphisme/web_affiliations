export interface EraJours {
  /** Date d'embauche à partir de laquelle cette valeur s'applique (AAAA-MM-JJ). */
  depuis: string;
  jours: number;
}

export interface TableCP {
  cp: string;
  nom: string;
  employeur: EraJours[];
  demission: EraJours[];
}

/**
 * Palier d'un barème gradué par ancienneté (mécanisme différent des tables
 * `TableCP` ci-dessus, indexées par date d'embauche avec un nombre de jours
 * fixe indépendant de l'ancienneté). Ici, le nombre de jours dépend du
 * nombre de mois d'ancienneté acquis (au 31/12/2013) — recherche par la
 * dernière entrée dont `moisMin` <= ancienneté en mois entiers. Exprimé en
 * mois (et non en années) pour distinguer des paliers comme "< 6 mois" vs
 * "6 mois à 5 ans", tous deux dans la même année civile d'ancienneté.
 */
export interface PalierAnciennete {
  moisMin: number;
  jours: number;
}

/**
 * Version d'un barème gradué par ancienneté, applicable aux contrats dont la
 * date d'embauche est postérieure ou égale à `depuisEmbauche` (recherche par
 * correspondance approximative, comme pour `EraJours`). Pour la grande
 * majorité des CP de ce mécanisme, une seule entrée avec `depuisEmbauche:
 * "1900-01-01"` suffit : le barème pertinent est celui en vigueur au
 * 31/12/2013 (date du gel légal), pas celui en vigueur à la date
 * d'embauche — les versions antérieures d'un même barème, remplacées avant
 * le 31/12/2013, sont donc sans effet sur le calcul et ne sont pas encodées.
 * Seules quelques CP (ex. 140.04, 301.01) dérogent réellement par date
 * d'embauche du contrat lui-même (confirmé par le texte source ONEM) et
 * nécessitent alors plusieurs entrées.
 *
 * `paliersDemission: null` signale un régime démission non sourcé avec
 * certitude (ex. mention ONEM "régime légal" sans détail chiffré fiable) —
 * dans ce cas le moteur doit lever `avertissementNonSource`, pas deviner.
 */
export interface RegimeParDateEmbauche {
  depuisEmbauche: string;
  paliersEmployeur: PalierAnciennete[];
  paliersDemission: PalierAnciennete[] | null;
}

export interface TableCPAnciennete {
  cp: string;
  nom: string;
  regimes: RegimeParDateEmbauche[];
}
