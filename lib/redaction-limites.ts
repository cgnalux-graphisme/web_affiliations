/** Limites de la rédaction assistée, partagées avec le navigateur (fichier sans dépendance). */

/** Taille maximale du texte collé par l'éditeur (environ 12 000 mots). */
export const EXTRAIT_MAX = 60000;

/** Taille maximale des consignes de rédaction données à l'IA. */
export const CONSIGNES_MAX = 2000;

/** Nombre maximal de sources d'un brouillon (articles d'un même sujet). */
export const SOURCES_MAX = 6;

/** Nombre maximal de sources lues en ligne par l'IA pour un brouillon (chaque lecture coûte environ 8 c.). */
export const LECTURES_MAX = 2;
