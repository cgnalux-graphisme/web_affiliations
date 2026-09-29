import Link from "next/link";

const PAGES = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/vie-privee", label: "Vie privée" },
  { href: "/cookies", label: "Cookies" },
];

/** Date de rédaction des textes (PAGES-LEGALES.md). */
export const MISE_A_JOUR = "29/09/2026";

/**
 * Mise en page commune des pages légales : grand titre, liens entre les trois pages, colonne de lecture
 * étroite et aérée. Le texte vient tel quel de PAGES-LEGALES.md.
 */
export default function PageLegale({
  chemin,
  titre,
  intro,
  children,
}: {
  chemin: string;
  titre: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-white font-barlow text-militant-charbon">
      <header className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <h1 className="font-condensed text-5xl font-extrabold uppercase leading-[0.88] tracking-tight sm:text-7xl">{titre}</h1>
        <div className="mt-6 h-2 w-24 bg-militant-rouge" aria-hidden />
        <nav aria-label="Informations légales" className="mt-8">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[16px] font-semibold">
            {PAGES.map((p) => {
              const actif = p.href === chemin;
              return (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    aria-current={actif ? "page" : undefined}
                    className={`inline-flex min-h-[44px] items-center border-b-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
                      actif ? "border-militant-rouge" : "border-transparent hover:border-militant-ardoise hover:text-militant-bordeaux"
                    }`}
                  >
                    {p.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="max-w-[68ch] border-t-[6px] border-militant-charbon pt-8">
          {intro && <div className="text-xl leading-relaxed">{intro}</div>}
          <div className={intro ? "mt-10 space-y-12" : "space-y-12"}>{children}</div>
          <p className="mt-16 text-[15px]">Dernière mise à jour : {MISE_A_JOUR}</p>
        </div>
      </div>
    </main>
  );
}

export function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-condensed text-3xl font-extrabold leading-tight sm:text-[34px]">{titre}</h2>
      <div className="mt-3 space-y-3 text-lg leading-relaxed">{children}</div>
    </section>
  );
}

/** Liste à puces carrées rouges, comme ailleurs sur le site. */
export function Liste({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="mt-[0.6em] h-2 w-2 shrink-0 bg-militant-rouge" />
          <span className="min-w-0 break-words">{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function Encadre({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <aside className="rounded-2xl border-l-[6px] border-militant-bordeaux bg-white p-5 ring-1 ring-militant-ardoise">
      <p className="font-bold text-militant-bordeaux">{titre}</p>
      <p className="mt-1 text-lg leading-relaxed">{children}</p>
    </aside>
  );
}

const LIEN =
  "font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge";

export function Courriel({ adresse }: { adresse: string }) {
  return (
    <a href={`mailto:${adresse}`} className={`break-all ${LIEN}`}>
      {adresse}
    </a>
  );
}

export function Tel({ numero, lien }: { numero: string; lien: string }) {
  return (
    <a href={`tel:${lien}`} className={`whitespace-nowrap tabular-nums ${LIEN}`}>
      {numero}
    </a>
  );
}

export function LienExterne({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`break-words ${LIEN}`}>
      {children}
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  );
}
