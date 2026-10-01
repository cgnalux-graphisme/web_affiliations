/**
 * Scan News › « Check IA » : classement des sujets du fil (tier list) par l'IA.
 * Types, rangs et libellés. Sans dépendance : utilisable côté navigateur.
 * Consigne et appel à l'API : lib/veille-tri-ia.ts (serveur). Stockage : table site_veille_analyses.
 */

/** Fenêtre analysée : les articles des 48 dernières heures. */
export const FENETRE_HEURES = 48;
/** « Check IA » n'est proposé que sur un fil rafraîchi depuis moins de 2 h. */
export const FRAICHEUR_RAMASSAGE_MS = 2 * 60 * 60 * 1000;
/** Heure (Bruxelles) de l'analyse automatique quotidienne. */
export const HEURE_ANALYSE_AUTO = 8;

export const RANGS = ["S", "A", "B", "C", "X"] as const;
export type Rang = (typeof RANGS)[number];

export const LIBELLES_RANG: Record<Rang, { lettre: string; titre: string; sens: string }> = {
  S: { lettre: "S", titre: "À poster", sens: "Impact direct sur le pouvoir d'achat ou les droits des travailleurs, angle FGTB évident, sujet chaud." },
  A: { lettre: "A", titre: "Ça vaut le coup", sens: "Bon sujet, moins urgent ou plus technique." },
  B: { lettre: "B", titre: "Post rapide", sens: "Mérite un relais court sur les réseaux, pas un article." },
  C: { lettre: "C", titre: "À surveiller", sens: "Dossier qui monte, pas encore mûr." },
  X: { lettre: "–", titre: "Pas pour nous", sens: "Intéressant, mais ne mérite pas qu'on le relaie." },
};

export const FORMATS = ["article", "explication", "post", "surveiller", "aucun"] as const;
export type FormatSujet = (typeof FORMATS)[number];
export const LIBELLES_FORMAT: Record<FormatSujet, string> = {
  article: "Article",
  explication: "On vous explique",
  post: "Post réseaux",
  surveiller: "À suivre",
  aucun: "Rien",
};

export type ArticleSujet = {
  id: string;
  titre: string;
  source: string | null;
  /** Adresse de l'article : pour une alerte Google, l'adresse réelle du média quand elle a pu être retrouvée. */
  lien: string;
  date: string | null;
  /** Article venu d'une alerte Google Actualités. */
  alerte?: boolean;
  /** L'IA peut-elle le lire ? (robots.txt du média, vérifié pendant l'analyse ; rangs S, A, B) */
  lisible?: "oui" | "non" | "inconnu";
  /** Articles identiques fusionnés dans celui-ci (alerte Google qui reprend l'article du média). */
  doublons?: string[];
};

/** Tous les identifiants du fil couverts par un sujet (doublons fusionnés compris). */
export function idsDuSujet(sujet: SujetClasse): string[] {
  return sujet.articles.flatMap((a) => [a.id, ...(a.doublons ?? [])]);
}

/** Lien partageable vers le formulaire d'article pré-rempli depuis un sujet du Check IA. */
export function cheminRedactionSujet(analyseId: string, index: number, avecIA: boolean): string {
  return `/suivi-actions/articles/nouveau?analyse=${analyseId}&sujet=${index}${avecIA ? "&ia=1" : ""}`;
}

export type SujetClasse = {
  rang: Rang;
  sujet: string;
  pourquoi: string;
  angle: string;
  format: FormatSujet;
  articles: ArticleSujet[];
};

/** Contenu de site_veille_analyses.resultat. */
export type ResultatAnalyse = {
  synthese: string;
  avertissement: string;
  sujets: SujetClasse[];
  /** Articles soumis mais classés nulle part (sans intérêt pour la centrale). */
  non_retenus: number;
};

export type AnalyseEnregistree = {
  id: string;
  created_at: string;
  origine: "manuel" | "auto";
  nb_articles: number;
  resultat: ResultatAnalyse;
};

/** Le fil a-t-il été rafraîchi assez récemment pour lancer « Check IA » ? */
export function ramassageRecent(dernier: string | null | undefined, maintenant: number = Date.now()): boolean {
  if (!dernier) return false;
  const t = new Date(dernier).getTime();
  return !Number.isNaN(t) && maintenant - t < FRAICHEUR_RAMASSAGE_MS && t <= maintenant + 60_000;
}

/** Heure actuelle à Bruxelles (0-23). */
export function heureBruxelles(date: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Brussels", hour: "2-digit", hourCycle: "h23" }).format(date));
}
