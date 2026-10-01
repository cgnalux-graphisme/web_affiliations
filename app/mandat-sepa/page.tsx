import type { Metadata } from "next";
import FormulaireChangementCompte from "../../FormulaireChangementCompte";

export const metadata: Metadata = {
  title: "Mandat SEPA — Centrale Générale FGTB Namur-Luxembourg",
  description: "Créer un nouveau mandat ou signaler un changement de compte bancaire.",
};

export default function MandatSepaPage() {
  return (
    <main className="formulaire min-h-screen bg-white px-4 py-8">
      <FormulaireChangementCompte />
    </main>
  );
}
