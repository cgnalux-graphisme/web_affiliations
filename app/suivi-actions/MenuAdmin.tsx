"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Newspaper,
  Radar,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { deconnexion } from "../login/actions";

type Lien = {
  href: string;
  label: string;
  /** Autres chemins où ce lien reste actif (sous-pages). */
  actifSur?: (chemin: string) => boolean;
};
type Section = { titre: string; Icon: LucideIcon; liens: Lien[] };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const TABLEAU_DE_BORD: Lien = { href: "/suivi-actions", label: "Tableau de bord" };

const SECTIONS: Section[] = [
  {
    titre: "Actions syndicales",
    Icon: Megaphone,
    liens: [
      // La modification d'une action (/suivi-actions/<id>/modifier) reste rattachée à la liste.
      { href: "/suivi-actions/actions", label: "Toutes les actions", actifSur: (c) => new RegExp(`^/suivi-actions/${UUID}/`, "i").test(c) },
      { href: "/suivi-actions/nouvelle", label: "Nouvelle action" },
      { href: "/suivi-actions/rapport", label: "Rapport d'activité" },
      {
        href: "/suivi-actions/mobilisations",
        label: "Mobilisations",
        actifSur: (c) => c.startsWith("/suivi-actions/mobilisations/"),
      },
    ],
  },
  {
    titre: "Publications",
    Icon: Newspaper,
    liens: [
      {
        href: "/suivi-actions/articles",
        label: "Articles",
        actifSur: (c) => c.startsWith("/suivi-actions/articles/") && c !== "/suivi-actions/articles/nouveau",
      },
      { href: "/suivi-actions/articles/nouveau", label: "Écrire un article" },
      { href: "/suivi-actions/explications", label: "On vous explique" },
      { href: "/suivi-actions/explications/nouvelle", label: "Importer une note" },
    ],
  },
  {
    titre: "Scan News",
    Icon: Radar,
    liens: [
      { href: "/suivi-actions/veille", label: "Le fil" },
      { href: "/suivi-actions/sources", label: "Sources" },
      { href: "/suivi-actions/themes", label: "Thématiques" },
    ],
  },
  {
    titre: "Démarches affiliés",
    Icon: FolderOpen,
    liens: [{ href: "/suivi-actions/demandes", label: "Demandes", actifSur: (c) => c.startsWith("/suivi-actions/demandes/") }],
  },
];

const PARAMETRES: Lien = { href: "/suivi-actions/parametres", label: "Paramètres des envois" };
const PARAMETRES_SITE: Lien = { href: "/suivi-actions/parametres-site", label: "Paramètres du site" };

function estActif(lien: Lien, chemin: string): boolean {
  return chemin === lien.href || Boolean(lien.actifSur?.(chemin));
}

/** Intitulé de la page courante (barre mobile). */
function pageCourante(chemin: string): string {
  for (const l of [TABLEAU_DE_BORD, ...SECTIONS.flatMap((s) => s.liens), PARAMETRES_SITE, PARAMETRES]) {
    if (estActif(l, chemin)) return l.label;
  }
  return "Espace admin";
}

function LienMenu({ lien, chemin, Icon }: { lien: Lien; chemin: string; Icon?: LucideIcon }) {
  const actif = estActif(lien, chemin);
  return (
    <Link
      href={lien.href}
      aria-current={actif ? "page" : undefined}
      className={`-ml-px flex min-h-[44px] items-center gap-2.5 border-l-4 py-2 pl-4 pr-3 text-[15px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-militant-rouge ${
        actif
          ? "border-militant-rouge font-bold"
          : "border-transparent font-semibold hover:border-militant-ardoise hover:text-militant-bordeaux"
      }`}
    >
      {Icon && <Icon size={17} className="shrink-0" aria-hidden />}
      {lien.label}
    </Link>
  );
}

/**
 * Menu de l'espace admin : liens regroupés par domaine, compte connecté et déconnexion en pied.
 * Grand écran : barre latérale fixe. Mobile : barre compacte avec bouton « Menu ».
 */
export default function MenuAdmin({ email }: { email: string }) {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);

  // Referme le menu mobile après chaque navigation.
  useEffect(() => setOuvert(false), [chemin]);

  return (
    <aside className="border-b border-militant-ardoise bg-white lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:flex-col lg:overflow-y-auto">
        {/* En-tête : titre de l'espace (+ bouton Menu sur mobile) */}
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-6 lg:pb-4 lg:pt-8">
          <Link
            href="/suivi-actions"
            className="flex min-h-[44px] items-center gap-2 font-condensed text-2xl font-extrabold leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
          >
            <ShieldCheck size={22} className="text-militant-rouge" aria-hidden />
            Espace admin
          </Link>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold lg:hidden">· {pageCourante(chemin)}</span>
          <button
            type="button"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
            aria-controls="menu-admin"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-militant-charbon px-3 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge lg:hidden"
          >
            {ouvert ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
            Menu
          </button>
        </div>
        <div className="mx-6 hidden h-1 bg-militant-rouge lg:block" aria-hidden />

        <div id="menu-admin" className={`${ouvert ? "flex" : "hidden"} flex-1 flex-col lg:flex`}>
          <nav aria-label="Espace admin" className="px-4 pb-4 pt-3 sm:px-6 lg:pt-5">
            <LienMenu lien={TABLEAU_DE_BORD} chemin={chemin} Icon={LayoutDashboard} />

            {SECTIONS.map((s) => (
              <div key={s.titre} className="mt-5">
                <p className="flex items-center gap-2 pb-1.5 font-condensed text-lg font-extrabold leading-none">
                  <s.Icon size={17} className="shrink-0 text-militant-rouge" aria-hidden />
                  {s.titre}
                </p>
                {/* Rail ardoise : la barre rouge du lien actif s'y pose. */}
                <ul className="ml-2 border-l border-militant-ardoise">
                  {s.liens.map((l) => (
                    <li key={l.href}>
                      <LienMenu lien={l} chemin={chemin} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Pied du menu : réglages et compte, séparés du reste */}
          <div className="mt-auto border-t-2 border-militant-charbon px-4 py-4 sm:px-6">
            <LienMenu lien={PARAMETRES_SITE} chemin={chemin} Icon={SlidersHorizontal} />
            <LienMenu lien={PARAMETRES} chemin={chemin} Icon={Settings} />
            <p className="mt-3 text-sm">Connecté</p>
            <p className="truncate text-sm font-bold" title={email}>
              {email}
            </p>
            <form action={deconnexion} className="mt-2">
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-militant-charbon px-3.5 text-sm font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
              >
                <LogOut size={15} aria-hidden /> Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
