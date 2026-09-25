import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { EMAIL_GENERAL } from "../../lib/bureaux";
import Bureaux from "./Bureaux";

export const metadata: Metadata = {
  title: "Contact — Centrale Générale FGTB Namur-Luxembourg",
  description:
    "Nos bureaux de Libramont, Namur, Arlon et Marche-en-Famenne : adresses, téléphones et horaires d'accueil.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
      <div className="border-b-[6px] border-militant-charbon pb-4">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">Nous contacter</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">
          Quatre bureaux vous accueillent dans les provinces de Namur et de Luxembourg. Passez nous voir, appelez-nous
          ou écrivez-nous.
        </p>
      </div>

      <section aria-labelledby="titre-ecrire" className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-militant-ardoise p-6">
        <h2 id="titre-ecrire" className="flex items-center gap-2 font-condensed text-2xl font-extrabold">
          <Mail size={22} className="text-militant-rouge" aria-hidden />
          Écrivez-nous
        </h2>
        <a
          href={`mailto:${EMAIL_GENERAL}`}
          className="text-xl font-bold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
        >
          {EMAIL_GENERAL}
        </a>
      </section>

      <section aria-labelledby="titre-bureaux" className="mt-14">
        <h2 id="titre-bureaux" className="mb-6 font-condensed text-4xl font-extrabold uppercase leading-none sm:text-5xl">
          Nos bureaux
        </h2>
        <Bureaux />
      </section>
    </main>
  );
}
