/**
 * Blog (rubrique « Actualités ») : utilitaires partagés entre l'espace admin et les pages publiques.
 * Table site_articles (écriture super admin) ; vue site_articles_public (lecture publique).
 */

export const BUCKET_BLOG = "blog-images";
/** Notes FGTB d'origine de « On vous explique » (bucket PRIVÉ, lecture et écriture côté serveur uniquement). */
export const BUCKET_NOTES = "notes-sources";

/** Valeurs de site_articles.statut. */
export const STATUT_BROUILLON = "brouillon";
export const STATUT_PUBLIE = "publie";
export type StatutArticle = typeof STATUT_BROUILLON | typeof STATUT_PUBLIE;

const FUSEAU = "Europe/Brussels";

/** Slug d'URL depuis un titre : « Grève du 14/10 : on y va ! » → « greve-du-14-10-on-y-va ». */
export function slugifier(titre: string): string {
  return titre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export function slugValide(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Texte « une ligne = un élément » → liste (lignes vides et puces de début retirées). */
export function lignes(texte: string | null | undefined): string[] {
  return (texte ?? "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-–—•*·]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

export type Source = { url: string; libelle: string };

/** Nom de domaine lisible d'une URL (sans « www. »). */
export function domaine(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Une ligne de source : un lien, précédé éventuellement d'un libellé.
 * « Le Soir – https://www.lesoir.be/… » → { libelle: "Le Soir", url } ;
 * « https://www.rtbf.be/… » → { libelle: "rtbf.be", url }. Null si la ligne ne contient pas de lien http(s).
 */
export function lireSource(ligne: string): Source | null {
  const m = ligne.match(/https?:\/\/\S+/i);
  if (!m) return null;
  const url = m[0].replace(/[),.;]+$/, "");
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  } catch {
    return null;
  }
  const libelle = ligne
    .slice(0, m.index)
    .replace(/[\s:–—|-]+$/, "")
    .trim();
  return { url, libelle: libelle || domaine(url) };
}

export function lireSources(texte: string | null | undefined): Source[] {
  return lignes(texte).flatMap((l) => lireSource(l) ?? []);
}

/** Numéros (à partir de 1) des lignes non vides qui ne contiennent pas de lien valide. */
export function lignesSourcesInvalides(texte: string): number[] {
  return texte
    .split(/\r?\n/)
    .flatMap((l, i) => (l.trim() && !lireSource(l) ? [i + 1] : []));
}

/** Texte brut d'un contenu HTML (pour compter les mots). */
export function texteBrut(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, "x")
    .replace(/\s+/g, " ")
    .trim();
}

const MOTS_PAR_MINUTE = 220;

/** Temps de lecture estimé, en minutes (au moins 1). */
export function tempsLecture(...textes: (string | null | undefined)[]): number {
  const mots = textes
    .map((t) => texteBrut(t))
    .join(" ")
    .split(" ")
    .filter(Boolean).length;
  return Math.max(1, Math.round(mots / MOTS_PAR_MINUTE));
}

/** Date d'un horodatage (timestamptz) au format jj/mm/aaaa, à l'heure de Bruxelles. */
export function dateArticle(horodatage: string | null | undefined): string {
  if (!horodatage) return "";
  const d = new Date(horodatage);
  if (Number.isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("fr-BE", {
    timeZone: FUSEAU,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${v("day")}/${v("month")}/${v("year")}`;
}

/** Date du jour à Bruxelles, au format jj/mm/aaaa. */
export function aujourdhui(): string {
  return dateArticle(new Date().toISOString());
}

/** Chemin de l'image de couverture dans le bucket : "<article_id>/couverture-<uuid>.jpg". */
export function cheminCouverture(articleId: string, id: string): string {
  return `${articleId}/couverture-${id}.jpg`;
}

/** Chemin du fichier dans le bucket blog-images à partir de son URL publique, ou null. */
export function cheminImageDepuisUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marqueur = `/storage/v1/object/public/${BUCKET_BLOG}/`;
  const i = url.indexOf(marqueur);
  if (i === -1) return null;
  const chemin = url.slice(i + marqueur.length).split(/[?#]/)[0];
  return chemin ? decodeURIComponent(chemin) : null;
}

// ── Rubriques : le blog (« Actualités ») et « On vous explique » partagent site_articles ──

/** Valeurs de site_articles.categorie (défaut en base : « article »). */
export const CATEGORIE_ARTICLE = "article";
export const CATEGORIE_EXPLICATION = "explication";
export type Categorie = typeof CATEGORIE_ARTICLE | typeof CATEGORIE_EXPLICATION;

export function categorieDe(valeur: unknown): Categorie {
  return valeur === CATEGORIE_EXPLICATION ? CATEGORIE_EXPLICATION : CATEGORIE_ARTICLE;
}

type Rubrique = {
  /** Chemin public de la rubrique (liste) ; une publication est à `${chemin}/<slug>`. */
  chemin: string;
  nom: string;
  /** Écran admin de la rubrique. */
  admin: string;
  /** Libellés au singulier (« l'article », « l'explication »). */
  singulier: string;
  nouveau: string;
  tous: string;
  lire: string;
  /** Pastille des cartes et de la page de détail (texte toujours présent, la couleur n'est qu'un renfort). */
  pastille: string;
  /** Lien de retour vers la page unifiée, filtrée sur la rubrique. */
  retour: string;
};

export const RUBRIQUES: Record<Categorie, Rubrique> = {
  article: {
    chemin: "/blog",
    nom: "Actualités",
    admin: "/suivi-actions/articles",
    singulier: "article",
    nouveau: "Nouvel article",
    tous: "Tous les articles",
    lire: "Lire l'article",
    pastille: "Actualité",
    retour: "Toutes les actualités",
  },
  explication: {
    chemin: "/on-vous-explique",
    nom: "On vous explique",
    admin: "/suivi-actions/explications",
    singulier: "explication",
    nouveau: "Nouvelle explication",
    tous: "Toutes les explications",
    lire: "Lire l'explication",
    pastille: "On vous explique",
    retour: "Toutes les explications",
  },
};

export function cheminPublic(categorie: Categorie, slug: string): string {
  return `${RUBRIQUES[categorie].chemin}/${slug}`;
}

// ── Page publique unifiée /actualites : les deux rubriques mélangées, filtrables ──

export const CHEMIN_ACTUALITES = "/actualites";

/** Filtre de la page unifiée ; `param` = valeur de `?rubrique=` (absente pour « Tout »). */
export type FiltrePublications = "tout" | Categorie;
export const FILTRES_PUBLICATIONS: { valeur: FiltrePublications; label: string; param: string | null }[] = [
  { valeur: "tout", label: "Tout", param: null },
  { valeur: CATEGORIE_ARTICLE, label: "Actualités", param: "actualites" },
  { valeur: CATEGORIE_EXPLICATION, label: "On vous explique", param: "on-vous-explique" },
];

/** `?rubrique=on-vous-explique` → « explication » ; valeur absente ou inconnue → « tout ». */
export function filtreDepuisParam(param: string | null | undefined): FiltrePublications {
  return FILTRES_PUBLICATIONS.find((f) => f.param !== null && f.param === param)?.valeur ?? "tout";
}

/** Adresse de la page unifiée, filtre pré-appliqué (ex. « /actualites?rubrique=actualites »). */
export function cheminActualites(filtre: FiltrePublications = "tout"): string {
  const param = FILTRES_PUBLICATIONS.find((f) => f.valeur === filtre)?.param;
  return param ? `${CHEMIN_ACTUALITES}?rubrique=${param}` : CHEMIN_ACTUALITES;
}

/** Source affichée : un lien, ou (« On vous explique ») une simple référence, ex. « Note FGTB 26I107F ». */
export type Reference = { libelle: string; url: string | null };

/** Chaque ligne devient une source : avec lien si elle en contient un, sinon référence en texte. */
export function lireReferences(texte: string | null | undefined): Reference[] {
  return lignes(texte).map((l) => lireSource(l) ?? { libelle: l, url: null });
}
