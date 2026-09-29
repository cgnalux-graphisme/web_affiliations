import type { Metadata } from "next";
import ListePublications from "../articles/ListePublications";

export const metadata: Metadata = {
  title: "On vous explique — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

/** « On vous explique » : notes FGTB vulgarisées (categorie = explication). */
export default async function ListeExplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string; supprime?: string }>;
}) {
  const { enregistre, supprime } = await searchParams;
  return <ListePublications categorie="explication" enregistre={enregistre} supprime={supprime} />;
}
