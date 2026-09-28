import { cache } from "react";
import { getSupabase } from "./supabase";

/**
 * Lecture des articles publiés pour les pages publiques : uniquement via la vue
 * site_articles_public (jamais la table site_articles). Un article programmé
 * (date de publication future) n'apparaît qu'à partir de sa date.
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
};

const COLONNES = "id, titre, slug, chapo, points_cles, contenu, image_couverture, sources, date_publication";

export async function chargerArticles(): Promise<{ articles: ArticlePublic[]; erreur: boolean }> {
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

/** Un article publié par son slug (mis en cache pour la requête : métadonnées + page). */
export const chargerArticle = cache(async (slug: string): Promise<ArticlePublic | null> => {
  const { data, error } = await getSupabase()
    .from("site_articles_public")
    .select(COLONNES)
    .eq("slug", slug)
    .lte("date_publication", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(`Chargement de l'article impossible : ${error.message}`);
  return (data as ArticlePublic | null) ?? null;
});
