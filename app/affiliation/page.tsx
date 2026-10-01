import type { Metadata } from "next";
import FormulaireWebIndependant from "../../FormulaireWebIndependant";

export const metadata: Metadata = {
  title: "Affiliation — Centrale Générale FGTB Namur-Luxembourg",
  description: "Nouvelle demande d'affiliation à la Centrale Générale FGTB Namur-Luxembourg.",
};

export default function AffiliationPage() {
  return (
    <main className="formulaire min-h-screen bg-white px-4 py-8">
      <FormulaireWebIndependant />
    </main>
  );
}
