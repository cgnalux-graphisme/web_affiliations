import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { forms, transferJourney } from "./forms";
import Revelation from "./Revelation";

type Demarche = { href: string; titre: string; description: string; cta: string; Icon: LucideIcon };

const parHref = (href: string): Demarche => {
  const f = forms.find((x) => x.href === href)!;
  return { href: f.href, titre: f.shortTitle, description: f.description, cta: f.cta, Icon: f.Icon };
};

/** À côté de l'affiliation (2 × 2 sur grand écran) : changer de syndicat, puis la vie du dossier. */
const CARREES: Demarche[] = [
  {
    href: transferJourney.href,
    titre: "Changer de syndicat",
    description: "Parcours guidé en 3 étapes : affiliation, C1 et C3.2, dans l'ordre.",
    cta: transferJourney.cta,
    Icon: transferJourney.Icon,
  },
  parHref("/changement-situation"),
  parHref("/mandat-sepa"),
  parHref("/preavis"),
];

/** Dernière ligne : les deux formulaires ONEM, côte à côte en tuiles larges. */
const LARGES: Demarche[] = [parHref("/formulaire-c1"), parHref("/formulaire-c3-2")];

function Tuile({ d, rang, large = false }: { d: Demarche; rang: number; large?: boolean }) {
  return (
    <Link
      href={d.href}
      style={{ "--rang": rang } as React.CSSProperties}
      className={`demarche-tuile demarche-entree group flex rounded-2xl border border-militant-ardoise bg-white p-6 focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge ${
        large ? "flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 md:flex-col md:items-start md:gap-3 lg:col-span-2 lg:flex-row lg:items-center lg:gap-6" : "flex-col gap-3"
      }`}
    >
      <span aria-hidden className="demarche-icone">
        <d.Icon size={22} strokeWidth={2.25} />
      </span>
      <span className={`flex flex-col gap-2 ${large ? "min-w-0 flex-1" : "flex-1"}`}>
        <span className="font-condensed text-3xl font-extrabold leading-none">{d.titre}</span>
        <span className="text-base leading-relaxed">{d.description}</span>
      </span>
      <span className={`demarche-cta font-bold ${large ? "shrink-0 md:mt-auto md:pt-2 lg:mt-0 lg:pt-0" : "mt-auto pt-2"}`}>{d.cta}</span>
      <span aria-hidden className="demarche-filet" />
    </Link>
  );
}

/**
 * Grille des démarches en ligne (accueil et /demarches). L'affiliation est la démarche principale :
 * grande tuile bordeaux (2 × 2 sur grand écran), traversée par la bande rouge à 10° du logo.
 * Grand écran (4 colonnes) : affiliation + 4 tuiles carrées, puis C1 et C3.2 en tuiles larges ;
 * aucune tuile seule sur sa ligne.
 *
 * Animation (app/globals.css, « Démarches en ligne ») : la bande glisse en place, les tuiles montent en
 * cascade, une seule fois. `entree="chargement"` quand la grille est visible dès l'ouverture de la page
 * (/demarches : animation CSS dès le premier affichage, sans clignotement), sinon à l'entrée à l'écran.
 */
export default function TuilesDemarches({ entree = "defilement" }: { entree?: "defilement" | "chargement" }) {
  const affiliation = forms.find((f) => f.href === "/affiliation")!;

  const grille = (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      <div
        style={{ "--rang": 0 } as React.CSSProperties}
        className="demarche-affiliation demarche-entree relative isolate flex flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-militant-bordeaux p-8 pb-44 text-white md:col-span-2 lg:row-span-2 lg:p-10 lg:pb-44"
      >
        {/* Le biais du logo : décor seul, jamais sous le texte courant. */}
        <span aria-hidden className="demarche-bande" />
        <div className="relative">
          <h3 className="font-condensed text-5xl font-extrabold uppercase leading-[0.9] sm:text-6xl">S&apos;affilier à la FGTB</h3>
          <div className="my-5 h-1.5 w-16 bg-white" aria-hidden />
          <p className="max-w-md text-lg leading-relaxed">
            Rejoignez la Centrale Générale FGTB Namur-Luxembourg. La demande se fait entièrement en ligne, en quelques
            minutes : identité, situation professionnelle, cotisation et signature.
          </p>
        </div>
        <div className="relative flex flex-col items-start gap-4">
          <Link
            href={affiliation.href}
            className="w-full rounded-xl bg-white px-6 py-4 text-center text-[17px] font-bold sm:w-auto text-militant-bordeaux transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-white"
          >
            Remplir le formulaire d&apos;affiliation
          </Link>
          <Link
            href={transferJourney.href}
            className="font-semibold underline decoration-white decoration-2 underline-offset-4 hover:decoration-militant-rouge"
          >
            Vous venez d&apos;un autre syndicat ?
          </Link>
        </div>
      </div>

      {CARREES.map((d, i) => (
        <Tuile key={d.href} d={d} rang={i + 1} />
      ))}
      {LARGES.map((d, i) => (
        <Tuile key={d.href} d={d} rang={CARREES.length + i + 1} large />
      ))}
    </div>
  );

  return entree === "chargement" ? <div data-revelation="chargement">{grille}</div> : <Revelation>{grille}</Revelation>;
}
