import type { Metadata } from "next";
import ChoixMotDePasse from "./ChoixMotDePasse";

export const metadata: Metadata = {
  title: "Choisir mon mot de passe — Espace CG Namur-Luxembourg",
  robots: { index: false, follow: false },
};

/**
 * Arrivée depuis l'e-mail d'invitation ou de réinitialisation (Supabase Auth) : la personne choisit son
 * mot de passe, le même pour l'Espace CG et CG Link, puis entre dans l'Espace.
 */
export default function NouveauMotDePassePage() {
  return (
    <main className="flex-1 bg-white font-barlow text-militant-charbon lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="flex flex-col justify-between gap-10 bg-militant-bordeaux px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-16">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo PNG statique */}
        <img src="/logo-cg-blanc.png" width={1772} height={490} alt="Centrale Générale FGTB Namur-Luxembourg" className="h-14 w-auto self-start" />
        <div className="max-w-sm">
          <h1 className="font-condensed text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">Espace CG</h1>
          <div className="my-5 h-1.5 w-16 bg-white" aria-hidden />
          <p className="text-[17px] leading-relaxed">Choisissez votre mot de passe. Il servira aussi dans CG Link.</p>
        </div>
        <p className="hidden text-sm lg:block">Accès réservé à l&apos;équipe de la Centrale.</p>
      </section>
      <section className="flex items-start justify-center px-4 py-10 sm:px-8 lg:items-center">
        <ChoixMotDePasse />
      </section>
    </main>
  );
}
