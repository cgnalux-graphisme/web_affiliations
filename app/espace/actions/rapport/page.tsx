import type { Metadata } from "next";
import { exigerApp } from "../../../../lib/espace/acces";
import GenerateurRapport from "./GenerateurRapport";

export const metadata: Metadata = {
  title: "Rapport d'activité — Espace CG",
  robots: { index: false, follow: false },
};

export default async function RapportPage() {
  await exigerApp("actions");
  return <GenerateurRapport />;
}
