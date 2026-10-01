import type { Metadata } from "next";
import FormulaireC32 from "../../FormulaireC32";

export const metadata: Metadata = {
  title: "Formulaire C3.2 — Chômage temporaire — Centrale Générale FGTB Namur-Luxembourg",
  description: "Demande d'allocations de chômage temporaire (formulaire officiel ONEM).",
};

export default function FormulaireC32Page() {
  return (
    <main className="formulaire min-h-screen bg-white">
      <FormulaireC32 />
    </main>
  );
}
