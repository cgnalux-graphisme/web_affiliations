export type Statut = "ouvrier" | "employe";

export type QuiRompt = "employeur" | "travailleur";

/** Date au format ISO AAAA-MM-JJ (voir lib/dates.ts). */
export type DateISO = string;

export interface DureePreavis {
  jours: number;
  semaines: number;
}

export interface ResultatPreavisOuvrier {
  statut: "ouvrier";
  quiRompt: QuiRompt;
  cp: string;
  cpCouverte: boolean;
  regimeApplique: "cp-specifique" | "cct75-supletif" | "non-source";
  /**
   * true si la partie 1 (pré-2014) n'a pas pu être calculée faute de source
   * légale (démission hors CP couvertes, ou < 6 mois d'ancienneté au
   * 31/12/2013 sous CCT75) — dans ce cas javantPart1 vaut 0 par défaut mais
   * ne reflète PAS un vrai calcul. Le résultat doit être affiché avec un
   * avertissement visible, pas comme un chiffre fiable.
   */
  avertissementNonSource: boolean;
  javantPart1: DureePreavis;
  japresPart2: DureePreavis;
  total: DureePreavis;
  indemniteCompensatoire: DureePreavis | null;
}

export interface ResultatPreavisEmploye {
  statut: "employe";
  quiRompt: QuiRompt;
  seuilDepasse: boolean;
  part1: DureePreavis;
  part2: DureePreavis;
  total: DureePreavis;
  part1DemissionIncertaine: boolean;
}

export type ResultatPreavis = ResultatPreavisOuvrier | ResultatPreavisEmploye;

/**
 * Une section de contenu informatif écrite en langage simple : phrases
 * courtes, un sujet par phrase, destinée à être comprise sans
 * connaissance juridique préalable (voir contenu-onem-sanctions.ts et
 * contenu-procedures-envoi.ts).
 */
export interface SectionInfo {
  titre: string;
  /** Chaque entrée est une phrase courte et autonome, à afficher séparément. */
  phrases: string[];
  /** Lien optionnel affiché à la fin de la section (ex. formulaire officiel à télécharger). */
  lien?: { texte: string; url: string };
}

export interface ContenuInformatif {
  /** Date à laquelle le contenu légal a été vérifié pour la dernière fois. */
  derniereVerification: DateISO;
  sections: SectionInfo[];
  /** Points à retenir, affichés en évidence (liste courte). */
  pointsCles: string[];
  /** Avertissement permanent affiché avec ce bloc (ex. "ne remplace pas un conseil personnalisé"). */
  avertissement: string;
}
