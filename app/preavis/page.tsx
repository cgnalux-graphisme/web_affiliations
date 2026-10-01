import type { Metadata } from "next";
import FormulairePreavis from "../../FormulairePreavis";

export const metadata: Metadata = {
  title: "Calcul de préavis — Centrale Générale FGTB Namur-Luxembourg",
  description: "Calculez la durée de votre préavis et générez votre courrier de démission ou de commun accord.",
};

export default function PreavisPage() {
  return (
    <div className="formulaire">
      <FormulairePreavis />
    </div>
  );
}
