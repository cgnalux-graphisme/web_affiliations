import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuperAdmin } from "../../../../lib/supabase-server";
import FormulaireArticle from "../../articles/FormulaireArticle";

export const metadata: Metadata = {
  title: "Importer une note — On vous explique — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

/** Nouvelle explication : import d'une note FGTB, vulgarisation par l'IA, puis formulaire d'article. */
export default async function NouvelleExplicationPage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/explications/nouvelle");
  return <FormulaireArticle categorie="explication" />;
}
