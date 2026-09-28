import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lignes, slugValide } from "../../../lib/articles";
import { chargerArticle } from "../../../lib/articles-public";
import VueArticle from "../VueArticle";

// Une modification depuis l'espace admin est visible en moins d'une minute.
export const revalidate = 60;

// Aucune page générée à la compilation : chaque article est rendu à la première visite puis mis en cache.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = slugValide(slug) ? await chargerArticle(slug) : null;
  if (!article) return { title: "Article introuvable — Centrale Générale FGTB Namur – Luxembourg" };
  const description = article.chapo ?? lignes(article.points_cles).join(" ");
  return {
    title: `${article.titre} — Centrale Générale FGTB Namur – Luxembourg`,
    description: description || undefined,
    openGraph: {
      type: "article",
      title: article.titre,
      description: description || undefined,
      publishedTime: article.date_publication,
      images: article.image_couverture ? [article.image_couverture] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  if (!slugValide(slug)) notFound();
  const article = await chargerArticle(slug);
  if (!article) notFound();

  return <VueArticle article={article} />;
}
