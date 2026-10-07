import type { Metadata } from "next";
import FormulaireModification from "../../FormulaireModification";

export const metadata: Metadata = {
  title: "Signaler un changement — Centrale Générale FGTB Namur-Luxembourg",
  description: "Nouvelle adresse, nouvel employeur, régime de travail ou situation professionnelle : prévenez-nous en ligne.",
};

export default function ChangementSituationPage() {
  return (
    <main className="formulaire min-h-screen bg-white px-4 py-8">
      <FormulaireModification />
    </main>
  );
}
