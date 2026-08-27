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
