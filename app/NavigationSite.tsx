"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

/** Un lien de navigation ; `aussi` = autres chemins qui le rendent actif (ex. les formulaires d'une rubrique). */
export type LienNav = { href: string; label: string; aussi?: string[] };

/** Barre de navigation commune à tout le site : fond blanc, logo rouge, filet rouge. */
export default function NavigationSite({ liens, cta }: { liens: LienNav[]; cta: LienNav }) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  // Referme le menu mobile à chaque changement de page.
  useEffect(() => setOuvert(false), [pathname]);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouvert]);

  const sous = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const actif = (l: LienNav) =>
    l.href === "/" ? pathname === "/" : sous(l.href) || (l.aussi ?? []).some(sous);

  return (
    <header className="relative z-40 border-b-4 border-militant-rouge bg-white font-barlow text-militant-charbon">
      <nav aria-label="Navigation principale" className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-24 lg:px-8">
        <Link
          href="/"
          className="mr-auto shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- logo PNG statique */}
          <img
            src="/logo-cg-rouge.png"
            width={1772}
            height={490}
            alt="Centrale Générale FGTB Namur-Luxembourg, accueil"
            className="h-11 w-auto lg:h-14"
          />
        </Link>

        {/* Écrans larges : liens en ligne */}
        <ul className="hidden items-center gap-1 lg:flex">
          {liens.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={actif(l) ? "page" : undefined}
                className={`block border-b-[3px] px-3 py-2 text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
                  actif(l) ? "border-militant-rouge" : "border-transparent hover:border-militant-ardoise"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={cta.href}
          aria-current={actif(cta) ? "page" : undefined}
          className="hidden shrink-0 rounded-xl bg-militant-bordeaux px-5 py-3 text-base font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 lg:block"
        >
          {cta.label}
        </Link>

        {/* Écrans étroits : bouton menu */}
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-controls="menu-mobile"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-militant-charbon px-3 text-[15px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge lg:hidden"
        >
          {ouvert ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          Menu
        </button>
      </nav>

      {ouvert && (
        <div id="menu-mobile" className="absolute inset-x-0 top-full border-b-4 border-militant-rouge bg-white lg:hidden">
          <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            {liens.map((l) => (
              <li key={l.href} className="border-b border-militant-ardoise last:border-b-0">
                <Link
                  href={l.href}
                  aria-current={actif(l) ? "page" : undefined}
                  className={`flex items-center border-l-4 py-3.5 pl-3 text-lg font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
                    actif(l) ? "border-militant-rouge" : "border-transparent"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mx-auto max-w-7xl px-4 pb-5 pt-2 sm:px-6">
            <Link
              href={cta.href}
              className="block rounded-xl bg-militant-bordeaux px-4 py-3.5 text-center text-lg font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
            >
              {cta.label}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
