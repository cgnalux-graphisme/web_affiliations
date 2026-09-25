import type { Metadata } from "next";
import TuilesDemarches from "../TuilesDemarches";

export const metadata: Metadata = {
  title: "Démarches en ligne — Centrale Générale FGTB Namur-Luxembourg",
  description:
    "Affiliation, changement de syndicat, mandat SEPA, formulaires ONEM C1 et C3.2, calcul de préavis : toutes vos démarches en ligne.",
};

export default function DemarchesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
      <div className="border-b-[6px] border-militant-charbon pb-4">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">Démarches en ligne</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">
          Faites vos démarches en quelques minutes, sans vous déplacer. Chaque formulaire vous guide pas à pas.
        </p>
      </div>
      <div className="mt-10">
        <TuilesDemarches />
      </div>
    </main>
  );
}
