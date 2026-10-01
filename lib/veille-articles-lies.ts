import { cleUrl } from "./lien-reel";
import type { SujetClasse } from "./veille-tri";

/**
 * Check IA : relie chaque sujet à l'article déjà enregistré qui le traite (brouillon ou publié).
 * Il n'y a pas de lien en base entre un sujet et un article : on reconnaît l'article à ses sources,
 * qui reprennent les liens des articles du sujet (pré-remplissage et brouillon IA). Côté serveur.
 */

export type ArticleLie = { id: string; titre: string; statut: string };
type ArticleEnregistre = ArticleLie & { sources: string | null };

const URL_RE = /https?:\/\/[^\s)\]]+/gi;

/** Index du sujet → article enregistré le plus récent qui cite un de ses liens (la liste est du plus récent au plus ancien). */
export function articlesLiesAuxSujets(
  sujets: SujetClasse[],
  articles: ArticleEnregistre[],
  liensDuFil: Record<string, string> = {}
): Record<number, ArticleLie> {
  const parArticle = articles.map((a) => ({ a, cles: new Set((a.sources?.match(URL_RE) ?? []).map(cleUrl)) }));
  const lies: Record<number, ArticleLie> = {};
  sujets.forEach((s, index) => {
    const cles = new Set(
      s.articles.flatMap((art) => [art.lien, liensDuFil[art.id]].filter((l): l is string => Boolean(l)).map(cleUrl))
    );
    const trouve = parArticle.find(({ cles: c }) => [...cles].some((k) => c.has(k)));
    if (trouve) lies[index] = { id: trouve.a.id, titre: trouve.a.titre, statut: trouve.a.statut };
  });
  return lies;
}
