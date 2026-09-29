import type { Metadata } from "next";
import ListePublications from "./ListePublications";

export const metadata: Metadata = {
  title: "Articles — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

/** Articles du blog (« Actualités ») : categorie = article. */
export default async function ListeArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string; supprime?: string }>;
}) {
  const { enregistre, supprime } = await searchParams;
  return <ListePublications categorie="article" enregistre={enregistre} supprime={supprime} />;
}
