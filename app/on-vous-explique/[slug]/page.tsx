import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lignes, slugValide } from "../../../lib/articles";
import { chargerArticle } from "../../../lib/articles-public";
import VueArticle from "../../blog/VueArticle";

// Une modification depuis l'espace admin est visible en moins d'une minute.
export const revalidate = 60;

// Aucune page générée à la compilation : chaque explication est rendue à la première visite puis mise en cache.
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = slugValide(slug) ? await chargerArticle(slug, "explication") : null;
  if (!article) return { title: "Explication introuvable — Centrale Générale FGTB Namur – Luxembourg" };
  const description = article.chapo ?? lignes(article.points_cles).join(" ");
  return {
    title: `${article.titre} — On vous explique — Centrale Générale FGTB Namur – Luxembourg`,
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

/** Une explication : même mise en page que le blog, encart « En bref » en haut. */
export default async function ExplicationPage({ params }: Props) {
  const { slug } = await params;
  if (!slugValide(slug)) notFound();
  const article = await chargerArticle(slug, "explication");
  if (!article) notFound();

  return <VueArticle article={article} categorie="explication" />;
}
