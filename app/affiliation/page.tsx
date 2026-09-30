import type { Metadata } from "next";
import FormulaireWebIndependant from "../../FormulaireWebIndependant";

export const metadata: Metadata = {
  title: "Affiliation — Centrale Générale FGTB Namur-Luxembourg",
  description: "Nouvelle demande d'affiliation à la Centrale Générale FGTB Namur-Luxembourg.",
};

export default function AffiliationPage() {
  return (
    <main className="bg-gray-50 min-h-screen py-4">
      <FormulaireWebIndependant />
    </main>
  );
}
