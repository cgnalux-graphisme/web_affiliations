import type { Metadata } from "next";
import { exigerApp } from "../../../../lib/espace/acces";
import { entreprisesChoix, secteursListe } from "../../../../lib/fiches-suivi/donnees-serveur";
import { listePermanents } from "../../../../lib/permanents/perimetre-serveur";
import GenerateurRapport from "./GenerateurRapport";

export const metadata: Metadata = {
  title: "Rapport d'activité — Espace CG",
  robots: { index: false, follow: false },
};

export default async function RapportPage() {
  await exigerApp("actions");
  const [entreprises, secteurs, permanents] = await Promise.all([entreprisesChoix(), secteursListe(), listePermanents()]);
  return (
    <GenerateurRapport
      entreprises={entreprises.map((e) => ({ id: e.id, nom: e.nom }))}
      secteurs={secteurs}
      permanents={permanents.map((p) => ({ id: p.id, nom: p.nom }))}
    />
  );
}
