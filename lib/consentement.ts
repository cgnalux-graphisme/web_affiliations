/**
 * Consentement aux cookies (pop-up à l'ouverture du site, app/ConsentementCookies.tsx).
 * Une seule catégorie soumise à l'accord : les cartes Google Maps de la page Contact.
 * Le choix est gardé dans le stockage local du navigateur, 6 mois, puis redemandé.
 * Fichier sans dépendance, importable côté navigateur. Texte de référence : PAGES-LEGALES.md, section 3.
 */

export const CLE_CONSENTEMENT = "accg-consentement";
/** À augmenter si la liste des catégories change : chacun revoit alors le pop-up. */
export const VERSION_CONSENTEMENT = 1;
export const DUREE_CONSENTEMENT_JOURS = 180;

/** Émis quand le choix change (même onglet). */
export const EVENEMENT_CHOIX = "accg:consentement";
/** Émis pour rouvrir le pop-up (« Gérer les cookies »). */
export const EVENEMENT_REGLAGES = "accg:reglages-cookies";

export type ChoixCookies = { version: number; cartes: boolean; date: string };

export function creerChoix(cartes: boolean, maintenant = new Date()): ChoixCookies {
  return { version: VERSION_CONSENTEMENT, cartes, date: maintenant.toISOString() };
}

/** Choix enregistré et encore valable, sinon null (absent, illisible, d'une autre version ou expiré). */
export function lireChoix(brut: string | null, maintenant = new Date()): ChoixCookies | null {
  if (!brut) return null;
  try {
    const c = JSON.parse(brut) as Partial<ChoixCookies>;
    if (c.version !== VERSION_CONSENTEMENT || typeof c.cartes !== "boolean" || typeof c.date !== "string") return null;
    const date = new Date(c.date).getTime();
    if (Number.isNaN(date) || date > maintenant.getTime()) return null;
    if (maintenant.getTime() - date > DUREE_CONSENTEMENT_JOURS * 86_400_000) return null;
    return { version: c.version, cartes: c.cartes, date: c.date };
  } catch {
    return null;
  }
}
