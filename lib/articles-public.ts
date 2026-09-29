import { cache } from "react";
import type { Categorie } from "./articles";
import { getSupabase } from "./supabase";

/**
 * Lecture des articles publiés pour les pages publiques : uniquement via la vue
 * site_articles_public (jamais la table site_articles). Un article programmé
 * (date de publication future) n'apparaît qu'à partir de sa date.
 * Deux rubriques partagent la vue : le blog (categorie = article) et « On vous explique »
 * (categorie = explication). La page unifiée /actualites lit les deux (chargerPublications) ;
 * chaque page de détail ne lit que sa rubrique.
 */
export type ArticlePublic = {
  id: string;
  titre: string;
  slug: string;
  chapo: string | null;
  points_cles: string | null;
  contenu: string | null;
  image_couverture: string | null;
  sources: string | null;
  date_publication: string;
  /** « article » ou « explication » (lire avec categorieDe()). */
  categorie: string | null;
  /** Temps de lecture déjà calculé (listes allégées envoyées au navigateur, sans contenu). */
  minutes?: number;
};

const COLONNES = "id, titre, slug, chapo, points_cles, contenu, image_couverture, sources, date_publication, categorie";

/** Toutes les publications des deux rubriques, mélangées, de la plus récente à la plus ancienne. */
export async function chargerPublications(): Promise<{ articles: ArticlePublic[]; erreur: boolean }> {
  const { data, error } = await getSupabase()
    .from("site_articles_public")
    .select(COLONNES)
    .lte("date_publication", new Date().toISOString())
    .order("date_publication", { ascending: false });
  if (error) {
    console.error("site_articles_public:", error.message);
    return { articles: [], erreur: true };
  }
  return { articles: (data ?? []) as ArticlePublic[], erreur: false };
}

/** Une publication par son slug, dans sa rubrique (mis en cache pour la requête : métadonnées + page). */
export const chargerArticle = cache(async (slug: string, categorie: Categorie): Promise<ArticlePublic | null> => {
  const { data, error } = await getSupabase()
    .from("site_articles_public")
    .select(COLONNES)
    .eq("slug", slug)
    .eq("categorie", categorie)
    .lte("date_publication", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`Chargement de l'article impossible : ${error.message}`);
  return (data as ArticlePublic | null) ?? null;
});
