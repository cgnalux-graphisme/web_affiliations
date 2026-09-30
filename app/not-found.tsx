import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Page introuvable — Centrale Générale FGTB Namur-Luxembourg",
};

const PISTES = [
  { href: "/", label: "Accueil" },
  { href: "/actualites", label: "Actualités" },
  { href: "/actions", label: "Nos actions" },
  { href: "/demarches", label: "Démarches en ligne" },
  { href: "/contact", label: "Contact" },
];

/** Page 404 du site (adresse inconnue, article ou mobilisation introuvable), au style des autres pages. */
export default function PageIntrouvable() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 lg:px-8">
      <div className="border-b-[6px] border-militant-charbon pb-4">
        <p className="font-condensed text-7xl font-extrabold leading-none text-militant-rouge sm:text-9xl">404</p>
        <h1 className="mt-2 font-condensed text-5xl font-extrabold uppercase leading-[0.9] sm:text-7xl">
          Page introuvable
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">
          Cette page n&apos;existe pas ou plus. Elle a peut-être été déplacée, ou l&apos;adresse contient une faute de
          frappe.
        </p>
      </div>

      <nav aria-label="Pages du site" className="mt-10">
        <ul className="flex flex-wrap gap-3">
          {PISTES.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className="group inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-militant-charbon px-5 font-bold transition-colors hover:border-militant-bordeaux hover:bg-militant-bordeaux hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
              >
                {p.label}
                <ArrowRight
                  size={18}
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
