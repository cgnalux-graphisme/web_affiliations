import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "../../lib/admin";
import { utilisateurConnecte } from "../../lib/espace/acces";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion — Espace CG Namur-Luxembourg",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string; deconnecte?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  // Déjà connecté : inutile de repasser par le formulaire (l'Espace CG décide ensuite des droits).
  if (await utilisateurConnecte()) redirect(next);

  return (
    <main className="flex-1 bg-white font-barlow text-militant-charbon lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="flex flex-col justify-between gap-10 bg-militant-bordeaux px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-16">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo PNG statique */}
        <img src="/logo-cg-blanc.png" width={1772} height={490} alt="Centrale Générale FGTB Namur-Luxembourg" className="h-14 w-auto self-start" />
        <div className="max-w-sm">
          <h1 className="font-condensed text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">Espace CG</h1>
          <div className="my-5 h-1.5 w-16 bg-white" aria-hidden />
          <p className="text-[17px] leading-relaxed">
            L'espace de travail de l'équipe de la Centrale Générale FGTB Namur-Luxembourg.
          </p>
        </div>
        <p className="hidden text-sm lg:block">Accès réservé à l'équipe de la Centrale.</p>
      </section>

      <section className="flex items-start lg:items-center justify-center px-4 py-10 sm:px-8">
        <LoginForm
          next={next}
          notice={
            params.erreur === "acces"
              ? "acces"
              : params.deconnecte
                ? "deconnecte"
                : undefined
          }
        />
      </section>
    </main>
  );
}
