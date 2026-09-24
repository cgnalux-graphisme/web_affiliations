"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export type LienNav = { href: string; label: string };

/** Barre de navigation commune à tout le site (palette militante). */
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

  const actif = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="relative z-40 border-b-4 border-militant-rouge bg-militant-charbon font-barlow text-white">
      <nav aria-label="Navigation principale" className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-militant-charbon"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- logo PNG statique */}
          <img src="/Logo CG Blanc.png" alt="Centrale Générale FGTB Namur – Luxembourg — accueil" className="h-6 w-auto" />
        </Link>

        {/* Écrans larges : liens en ligne */}
        <ul className="ml-auto hidden items-center gap-1 xl:flex">
          {liens.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={actif(l.href) ? "page" : undefined}
                className={`relative block px-3 py-2 text-[15px] font-semibold transition-colors after:absolute after:inset-x-3 after:-bottom-[2px] after:h-[3px] after:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  actif(l.href)
                    ? "text-white after:bg-militant-rouge"
                    : "text-white after:bg-transparent hover:after:bg-militant-ardoise"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={cta.href}
          aria-current={actif(cta.href) ? "page" : undefined}
          className="hidden shrink-0 bg-militant-bordeaux px-4 py-2 text-[15px] font-bold text-white transition-shadow hover:ring-2 hover:ring-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white xl:block"
        >
          {cta.label}
        </Link>

        {/* Écrans étroits : bouton menu */}
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-controls="menu-mobile"
          className="ml-auto inline-flex items-center gap-2 px-2 py-2 text-[15px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white xl:hidden"
        >
          {ouvert ? <X size={24} aria-hidden /> : <Menu size={24} aria-hidden />}
          Menu
        </button>
      </nav>

      {ouvert && (
        <div id="menu-mobile" className="absolute inset-x-0 top-full border-b-4 border-militant-rouge bg-militant-charbon xl:hidden">
          <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            {liens.map((l) => (
              <li key={l.href} className="border-b border-militant-ardoise last:border-b-0">
                <Link
                  href={l.href}
                  aria-current={actif(l.href) ? "page" : undefined}
                  className={`flex items-center border-l-4 py-3.5 pl-3 text-lg font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    actif(l.href) ? "border-militant-rouge" : "border-transparent"
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
              className="block bg-militant-bordeaux px-4 py-3.5 text-center text-lg font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {cta.label}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
