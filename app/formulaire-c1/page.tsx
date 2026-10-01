import type { Metadata } from "next";
import FormulaireC1 from "../../FormulaireC1";

export const metadata: Metadata = {
  title: "Formulaire C1 — Déclaration de situation — Centrale Générale FGTB Namur-Luxembourg",
  description: "Déclaration de la situation personnelle et familiale (formulaire officiel ONEM).",
};

export default function FormulaireC1Page() {
  return (
    <main className="formulaire min-h-screen bg-white">
      <FormulaireC1 />
    </main>
  );
}
