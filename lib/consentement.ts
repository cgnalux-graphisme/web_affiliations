/**
 * Consentement aux cookies : pop-up à l'ouverture du site (app/ConsentementCookies.tsx) et réglages
 * détaillés, élément par élément, sur /cookies (app/cookies/ReglagesCookies.tsx).
 * Deux catégories soumises à l'accord : les cartes Google Maps (page Contact) et les vidéos YouTube
 * (page Nos actions). Le choix est gardé dans le stockage local du navigateur, 6 mois, puis redemandé.
 * Fichier sans dépendance, importable côté navigateur. Texte de référence : PAGES-LEGALES.md, section 3.
 */

export const CLE_CONSENTEMENT = "accg-consentement";
/** À augmenter si la liste des catégories change : chacun revoit alors le pop-up. */
export const VERSION_CONSENTEMENT = 2;
export const DUREE_CONSENTEMENT_JOURS = 180;

/** Émis quand le choix change (même onglet). */
export const EVENEMENT_CHOIX = "accg:consentement";

export type Categorie = "cartes" | "videos";
export type Autorisations = Record<Categorie, boolean>;
export type ChoixCookies = Autorisations & { version: number; date: string };

export const CATEGORIES: Categorie[] = ["cartes", "videos"];
export const TOUT_ACCEPTE: Autorisations = { cartes: true, videos: true };
export const TOUT_REFUSE: Autorisations = { cartes: false, videos: false };

/** Un élément stocké sur l'appareil du visiteur, tel que décrit sur /cookies. */
export type ElementCookie = {
  nom: string;
  fournisseur: string;
  type: string;
  duree: string;
  role: string;
  /** null = indispensable, toujours actif. */
  categorie: Categorie | null;
};

/** Liste complète, affichée sur /cookies. Toute nouvelle entrée = mettre à jour PAGES-LEGALES.md. */
export const ELEMENTS_COOKIES: ElementCookie[] = [
  {
    nom: "accg-consentement",
    fournisseur: "Ce site",
    type: "Stockage local",
    duree: "6 mois",
    role: "Retenir vos choix de cookies pour ne pas vous les redemander à chaque page.",
    categorie: null,
  },
  {
    nom: "bandeau-mobilisation-ferme",
    fournisseur: "Ce site",
    type: "Stockage de session",
    duree: "Jusqu'à la fermeture de l'onglet",
    role: "Ne plus afficher le bandeau de mobilisation que vous avez fermé.",
    categorie: null,
  },
  {
    nom: "fgtb_transfer_journey",
    fournisseur: "Ce site",
    type: "Stockage de session",
    duree: "Jusqu'à la fermeture de l'onglet",
    role: "Garder votre progression d'une étape à l'autre du parcours de transfert.",
    categorie: null,
  },
  {
    nom: "sb-…-auth-token",
    fournisseur: "Ce site (Supabase)",
    type: "Cookie",
    duree: "Jusqu'à la déconnexion, au plus 400 jours",
    role: "Garder connectés les membres de l'équipe à l'espace réservé. Jamais déposé pour les visiteurs.",
    categorie: null,
  },
  {
    nom: "Cookies Google Maps",
    fournisseur: "Google",
    type: "Cookies et stockage de Google",
    duree: "Fixée par Google",
    role: "Afficher les cartes de nos 4 bureaux sur la page Contact.",
    categorie: "cartes",
  },
  {
    nom: "Cookies YouTube",
    fournisseur: "Google (YouTube)",
    type: "Cookies et stockage de YouTube",
    duree: "Fixée par Google",
    role: "Lire les vidéos de nos actions sur la page Nos actions (lecteur « sans cookie » jusqu'à la lecture).",
    categorie: "videos",
  },
];

export function creerChoix(autorisations: Autorisations, maintenant = new Date()): ChoixCookies {
  return {
    version: VERSION_CONSENTEMENT,
    cartes: autorisations.cartes,
    videos: autorisations.videos,
    date: maintenant.toISOString(),
  };
}

/** Choix enregistré et encore valable, sinon null (absent, illisible, d'une autre version ou expiré). */
export function lireChoix(brut: string | null, maintenant = new Date()): ChoixCookies | null {
  if (!brut) return null;
  try {
    const c = JSON.parse(brut) as Partial<ChoixCookies>;
    if (c.version !== VERSION_CONSENTEMENT || typeof c.date !== "string") return null;
    if (CATEGORIES.some((k) => typeof c[k] !== "boolean")) return null;
    const date = new Date(c.date).getTime();
    if (Number.isNaN(date) || date > maintenant.getTime()) return null;
    if (maintenant.getTime() - date > DUREE_CONSENTEMENT_JOURS * 86_400_000) return null;
    return { version: c.version, cartes: c.cartes!, videos: c.videos!, date: c.date };
  } catch {
    return null;
  }
}
