import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { safeNext } from "../../lib/admin";
import { getSuperAdmin } from "../../lib/supabase-server";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string; deconnecte?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  // Déjà connecté en super admin : inutile de repasser par le formulaire.
  if (await getSuperAdmin()) redirect(next);

  return (
    <main className="min-h-[calc(100vh-52px)] bg-gray-50 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="relative overflow-hidden bg-red-700 text-white px-6 py-10 sm:px-10 lg:px-14 lg:py-16 flex flex-col justify-between">
        {/* Filigrane : un grand cercle discret, rappel du poing levé/de la rondeur du logo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full border-[40px] border-white/[0.06] lg:h-[28rem] lg:w-[28rem]"
        />
        <img src="/Logo CG Blanc.png" alt="Centrale Générale FGTB" className="h-6 w-auto self-start" />
        <div className="relative mt-10 lg:mt-0 max-w-sm">
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
            Espace admin
          </h1>
          <p className="mt-4 text-red-100 text-[15px] leading-relaxed">
            Encodage et suivi des actions syndicales de la Centrale Générale FGTB
            Namur – Luxembourg.
          </p>
        </div>
        <p className="relative hidden lg:block text-xs text-red-200/80">
          Accès réservé aux super administrateurs.
        </p>
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
