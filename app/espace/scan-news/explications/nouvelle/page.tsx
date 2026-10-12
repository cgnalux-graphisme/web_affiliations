import type { Metadata } from "next";
import { exigerApp } from "../../../../../lib/espace/acces";
import FormulaireArticle from "../../articles/FormulaireArticle";

export const metadata: Metadata = {
  title: "Importer une note — On vous explique — Espace CG",
  robots: { index: false, follow: false },
};

/** Nouvelle explication : import d'une note FGTB, vulgarisation par l'IA, puis formulaire d'article. */
export default async function NouvelleExplicationPage() {
  await exigerApp("scan-news");
  return <FormulaireArticle categorie="explication" />;
}
