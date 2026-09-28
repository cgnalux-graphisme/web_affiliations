import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuperAdmin } from "../../../../lib/supabase-server";
import FormulaireArticle from "../FormulaireArticle";

export const metadata: Metadata = {
  title: "Nouvel article — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export default async function NouvelArticlePage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/articles/nouveau");
  return <FormulaireArticle />;
}
