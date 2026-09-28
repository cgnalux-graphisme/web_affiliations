/**
 * Déclinaison d'un article pour les réseaux sociaux : constantes et utilitaires partagés
 * entre l'écran admin (navigateur) et la route serveur. Fichier sans dépendance.
 * Table site_publications_reseaux : article_id, reseau, contenu, statut (défaut « brouillon »).
 * Rien n'est publié automatiquement : Fred relit, corrige et copie-colle chaque version.
 */

export const RESEAUX = ["facebook", "instagram", "tiktok", "youtube"] as const;
export type Reseau = (typeof RESEAUX)[number];

export function estReseau(valeur: unknown): valeur is Reseau {
  return typeof valeur === "string" && (RESEAUX as readonly string[]).includes(valeur);
}

type InfoReseau = {
  nom: string;
  /** Ce qu'on attend de la version (affiché sous le titre de la carte). */
  aide: string;
  /** Longueur conseillée (texte, ou description pour YouTube). */
  conseil: string;
  /** Limite imposée par le réseau (texte, ou description pour YouTube). */
  max: number;
};

export const INFOS_RESEAUX: Record<Reseau, InfoReseau> = {
  facebook: {
    nom: "Facebook",
    aide: "Post développé et argumenté, appel à l'action, lien vers l'article.",
    conseil: "600 à 1 200 caractères conseillés",
    max: 63206,
  },
  instagram: {
    nom: "Instagram",
    aide: "Légende courte et percutante, hashtags, « lien en bio » (pas de lien cliquable).",
    conseil: "300 à 700 caractères conseillés, 30 hashtags maximum",
    max: 2200,
  },
  tiktok: {
    nom: "TikTok",
    aide: "Très court : une accroche qui interpelle, ton direct, quelques hashtags.",
    conseil: "100 à 300 caractères conseillés",
    max: 4000,
  },
  youtube: {
    nom: "YouTube",
    aide: "Titre de vidéo et description structurée, lien vers l'article.",
    conseil: "Titre : 70 caractères conseillés",
    max: 5000,
  },
};

export const YOUTUBE_TITRE_MAX = 100;
export const INSTAGRAM_HASHTAGS_MAX = 30;

/** Nombre de caractères tel que les réseaux le comptent à peu près (un emoji = un caractère). */
export function compterCaracteres(texte: string): number {
  return [...texte].length;
}

export function compterHashtags(texte: string): number {
  return texte.match(/(^|\s)#[\p{L}\p{N}_]+/gu)?.length ?? 0;
}

/**
 * YouTube tient dans une seule colonne `contenu` : le titre sur la première ligne,
 * une ligne vide, puis la description.
 */
export function composerYoutube(titre: string, description: string): string {
  return `${titre.replace(/\s+/g, " ").trim()}\n\n${description.trim()}`;
}

export function lireYoutube(contenu: string | null | undefined): { titre: string; description: string } {
  const texte = (contenu ?? "").replace(/\r\n/g, "\n");
  const i = texte.indexOf("\n");
  if (i === -1) return { titre: texte.trim(), description: "" };
  return { titre: texte.slice(0, i).trim(), description: texte.slice(i + 1).replace(/^\n+/, "").trimEnd() };
}

/** Une version telle que renvoyée par la route (id null : non enregistrée en base). */
export type VersionEnregistree = { id: string | null; contenu: string };

/** Réponse de POST /api/reseaux/declinaison. */
export type ReponseDeclinaison = {
  versions: Partial<Record<Reseau, VersionEnregistree>>;
  lien: string;
  avertissement: string;
  nonEnregistrees: boolean;
};
