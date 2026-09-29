import type { Metadata } from "next";
import { ArrowDown, ArrowUpRight, Mail, MessageCircle } from "lucide-react";
import { BUREAUX, EMAIL_GENERAL, WHATSAPP } from "../../lib/bureaux";
import { RESEAUX } from "../ReseauxSociaux";
import Bureaux from "./Bureaux";
import CopierEmail from "./CopierEmail";
import FormulaireContact from "./FormulaireContact";

export const metadata: Metadata = {
  title: "Contact — Centrale Générale FGTB Namur-Luxembourg",
  description:
    "Nos bureaux de Libramont, Namur, Arlon et Marche-en-Famenne : adresses, téléphones, horaires d'accueil. Écrivez-nous par e-mail, WhatsApp ou via le formulaire.",
};

const ANCRES = [
  { href: "#bureaux", label: "Nos bureaux" },
  { href: "#joindre", label: "Nous joindre" },
  { href: "#ecrire", label: "Écrire un message" },
];

/** Grand titre de section posé sur le filet charbon de 6 px (charte « direction D »). */
function TitreSection({ id, surtitre, children }: { id: string; surtitre: string; children: React.ReactNode }) {
  return (
    <div className="border-b-[6px] border-militant-charbon pb-3">
      <p className="font-condensed text-lg font-bold uppercase tracking-[0.12em] text-militant-bordeaux">{surtitre}</p>
      <h2 id={id} className="font-condensed text-4xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
        {children}
      </h2>
    </div>
  );
}

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      {/* En-tête : seule animation à l'ouverture, une cascade (.contact-entree, --i = rang). */}
      <header className="border-b-[6px] border-militant-charbon pb-6">
        <p
          className="contact-entree font-condensed text-lg font-bold uppercase tracking-[0.12em] text-militant-bordeaux"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          {BUREAUX.length} bureaux · Namur et Luxembourg
        </p>
        <h1
          className="contact-entree font-condensed text-6xl font-extrabold uppercase leading-[0.85] sm:text-8xl"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Nous
          <br className="sm:hidden" /> contacter
        </h1>
        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <p
            className="contact-entree max-w-2xl text-lg leading-relaxed sm:text-xl"
            style={{ "--i": 2 } as React.CSSProperties}
          >
            Une question sur votre affiliation, vos droits ou une démarche ? Passez dans l&apos;un de nos bureaux,
            appelez-nous ou écrivez-nous.
          </p>
          <nav aria-label="Sur cette page" className="contact-entree" style={{ "--i": 3 } as React.CSSProperties}>
            <ul className="flex flex-wrap gap-2">
              {ANCRES.map((a) => (
                <li key={a.href}>
                  <a
                    href={a.href}
                    className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-militant-charbon px-4 font-bold transition-colors hover:border-militant-bordeaux hover:bg-militant-bordeaux hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
                  >
                    {a.label}
                    <ArrowDown
                      size={17}
                      aria-hidden
                      className="transition-transform duration-200 group-hover:translate-y-0.5 motion-reduce:transition-none"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <section
        aria-labelledby="titre-bureaux"
        id="bureaux"
        className="contact-entree mt-14 scroll-mt-24"
        style={{ "--i": 4 } as React.CSSProperties}
      >
        <TitreSection id="titre-bureaux" surtitre="Passer nous voir">
          Nos bureaux
        </TitreSection>
        <div className="mt-8">
          <Bureaux />
        </div>
      </section>

      <section aria-labelledby="titre-joindre" id="joindre" className="mt-20 scroll-mt-24">
        <TitreSection id="titre-joindre" surtitre="À distance">
          Nous joindre
        </TitreSection>

        <div className="mt-10 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="flex flex-col gap-5 lg:col-span-5">
            {/* E-mail : canal principal, tuile bordeaux. */}
            <div className="relative overflow-hidden rounded-2xl bg-militant-bordeaux p-6 text-white sm:p-7">
              <Mail aria-hidden size={140} strokeWidth={1.25} className="pointer-events-none absolute -right-6 -top-6 opacity-10" />
              <p className="flex items-center gap-2 font-condensed text-2xl font-extrabold uppercase">
                <Mail size={22} aria-hidden />
                Par e-mail
              </p>
              <a
                href={`mailto:${EMAIL_GENERAL}`}
                className="mt-3 block break-all font-condensed text-3xl font-extrabold leading-tight underline decoration-white/40 decoration-2 underline-offset-[6px] transition-colors hover:decoration-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:text-4xl"
              >
                {EMAIL_GENERAL}
              </a>
              <div className="mt-5">
                <CopierEmail adresse={EMAIL_GENERAL} />
              </div>
            </div>

            <a
              href={WHATSAPP.lien}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-militant-ardoise bg-white p-6 transition-[border-color,box-shadow] duration-300 hover:border-militant-charbon hover:shadow-[0_14px_40px_-18px_rgba(34,34,34,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-militant-charbon transition-colors group-hover:border-militant-bordeaux group-hover:bg-militant-bordeaux group-hover:text-white">
                <MessageCircle size={26} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-condensed text-2xl font-extrabold uppercase leading-none">WhatsApp</span>
                <span className="mt-1.5 block text-[17px] font-semibold tabular-nums">{WHATSAPP.affichage}</span>
              </span>
              <ArrowUpRight
                size={24}
                aria-hidden
                className="shrink-0 text-militant-rouge transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
              <span className="sr-only">(ouvre WhatsApp dans un nouvel onglet)</span>
            </a>

            <div className="rounded-2xl border border-militant-ardoise bg-white p-6">
              <p className="font-condensed text-2xl font-extrabold uppercase leading-none">Suivez-nous</p>
              <p className="mt-2 text-[16px]">Nos actions, nos analyses et les mobilisations à venir.</p>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {RESEAUX.map((r) => (
                  <li key={r.nom}>
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex min-h-[48px] items-center gap-3 rounded-xl px-2 font-bold transition-colors hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-militant-charbon text-militant-charbon transition-colors group-hover:border-militant-rouge group-hover:bg-militant-rouge group-hover:text-white">
                        {r.icone}
                      </span>
                      {r.nom}
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div id="ecrire" className="scroll-mt-24 lg:col-span-7">
            <div className="h-full rounded-2xl border-2 border-militant-charbon bg-white p-6 sm:p-8">
              <h3 className="font-condensed text-3xl font-extrabold uppercase leading-none sm:text-4xl">
                Écrire un message
              </h3>
              <p className="mb-7 mt-2 text-[17px] leading-relaxed">
                Tous les champs sont obligatoires. Nous vous répondons par e-mail.
              </p>
              <FormulaireContact />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
