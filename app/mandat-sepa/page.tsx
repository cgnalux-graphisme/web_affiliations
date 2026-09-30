import type { Metadata } from "next";
import FormulaireChangementCompte from "../../FormulaireChangementCompte";

export const metadata: Metadata = {
  title: "Mandat SEPA — Centrale Générale FGTB Namur-Luxembourg",
  description: "Créer un nouveau mandat ou signaler un changement de compte bancaire.",
};

export default function MandatSepaPage() {
  return (
    <main className="p-4 bg-gray-50 min-h-screen">
      <FormulaireChangementCompte />
    </main>
  );
}
