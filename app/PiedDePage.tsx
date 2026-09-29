import Link from "next/link";
import { ArrowRight, Mail, MessageCircle, Phone } from "lucide-react";
import RevelationPied from "./RevelationPied";
import { RESEAUX } from "./ReseauxSociaux";

/** Bureaux affichés dans le pied de page (les 4 bureaux et leurs horaires sont sur /contact). */
const BUREAUX = [
  { nom: "Libramont", adresse: ["Rue Fonteny Maroy 13", "6800 Libramont-Chevigny"], tel: "+32 (0)61 530 160", lien: "+3261530160" },
  { nom: "Namur", adresse: ["Rue Dewez 40-42 (2e étage)", "5000 Namur"], tel: "+32 (0)81 64 99 61", lien: "+3281649961" },
];

const SITE = [
  { href: "/", label: "Accueil" },
  { href: "/actualites", label: "Actualités" },
  { href: "/actions", label: "Nos actions" },
  { href: "/contact", label: "Contact" },
];

const DEMARCHES = [
  { href: "/affiliation", label: "S'affilier" },
  { href: "/mandat-sepa", label: "Mandat SEPA" },
  { href: "/formulaire-c1", label: "Formulaire C1" },
  { href: "/formulaire-c3-2", label: "Formulaire C3.2" },
  { href: "/preavis", label: "Calcul préavis" },
];

const LEGAL = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/vie-privee", label: "Vie privée" },
  { href: "/cookies", label: "Cookies" },
  { href: "/login", label: "Espace admin" },
];


/**
 * Liens sur fond charbon : le texte reste blanc au survol (le rouge sur charbon ne fait que 3,4:1,
 * insuffisant pour du petit texte) ; le rouge vient en accent, par un soulignement qui se trace.
 */
const LIEN =
  "pied-lien rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 focus-visible:ring-offset-militant-charbon";

function TitreColonne({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 id={id} className="font-condensed text-[22px] font-extrabold leading-none text-white">
        {children}
      </h2>
      <span aria-hidden className="mt-3 block h-[3px] w-8 bg-militant-rouge" />
    </div>
  );
}

function ListeLiens({ liens }: { liens: { href: string; label: string }[] }) {
  return (
    <ul className="mt-5 space-y-1 text-[16px] font-medium text-white">
      {liens.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className={`inline-flex min-h-[40px] items-center ${LIEN}`}>
            <span className="pied-lien-texte">{l.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Pied de page commun, fond charbon (choix de Fred du 29/09/2026, seule grande surface charbon du site) :
 * filet rouge en haut, 4 colonnes alignées en haut, barre du bas. Les colonnes apparaissent en cascade
 * quand le pied de page entre à l'écran (RevelationPied).
 */
export default function PiedDePage() {
  return (
    <footer className="pied-de-page mt-auto border-t-[3px] border-militant-rouge bg-militant-charbon font-barlow text-white">
      <RevelationPied>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-12 px-5 pb-14 pt-14 sm:px-8 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-x-12 lg:px-10 lg:pt-16">
          {/* ── Identité ── */}
          <div className="pied-col col-span-2 lg:col-span-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- logo PNG statique */}
            <img src="/logo-cg-blanc.png" width={1772} height={490} alt="" className="h-12 w-auto" />
            <p className="mt-4 text-[15px] font-bold leading-snug">Centrale Générale FGTB Namur-Luxembourg</p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {BUREAUX.map((b) => (
                <address key={b.nom} className="border-l-2 border-militant-ardoise/50 pl-3.5 not-italic">
                  <p className="text-[15px] font-bold">{b.nom}</p>
                  <p className="mt-1 text-[14px] leading-snug text-militant-ardoise">
                    {b.adresse[0]}
                    <br />
                    {b.adresse[1]}
                  </p>
                  <a
                    href={`tel:${b.lien}`}
                    className={`mt-1.5 inline-flex min-h-[36px] items-center gap-1.5 text-[14px] font-semibold tabular-nums ${LIEN}`}
                  >
                    <Phone size={14} className="shrink-0 text-militant-rouge" aria-hidden />
                    <span className="pied-lien-texte">{b.tel}</span>
                  </a>
                </address>
              ))}
            </div>

            <ul className="mt-5 space-y-0.5 text-[15px] font-semibold">
              <li>
                <a href="mailto:cg.nalux@accg.be" className={`inline-flex min-h-[40px] items-center gap-2.5 ${LIEN}`}>
                  <Mail size={17} className="shrink-0 text-militant-rouge" aria-hidden />
                  <span className="pied-lien-texte">cg.nalux@accg.be</span>
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/32478341179"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex min-h-[40px] items-center gap-2.5 tabular-nums ${LIEN}`}
                >
                  <MessageCircle size={17} className="shrink-0 text-militant-rouge" aria-hidden />
                  <span className="pied-lien-texte">WhatsApp +32 (0)478 34 11 79</span>
                  <span className="sr-only"> (nouvel onglet)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* ── Le site ── */}
          <nav aria-labelledby="pied-site" className="pied-col">
            <TitreColonne id="pied-site">Le site</TitreColonne>
            <ListeLiens liens={SITE} />
          </nav>

          {/* ── Démarches ── */}
          <nav aria-labelledby="pied-demarches" className="pied-col">
            <TitreColonne id="pied-demarches">Démarches</TitreColonne>
            <ListeLiens liens={DEMARCHES} />
          </nav>

          {/* ── Suivez-nous (+ affiliation, toujours mise en avant) ── */}
          <div className="pied-col col-span-2 lg:col-span-1">
            <Link
              href="/affiliation"
              className="group inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-militant-rouge px-6 text-[17px] font-bold text-white shadow-[0_6px_20px_rgba(227,33,25,0.28)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-militant-bordeaux hover:shadow-[0_10px_26px_rgba(227,33,25,0.32)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-militant-charbon motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto lg:w-full"
            >
              S&apos;affilier
              <ArrowRight
                size={19}
                className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                aria-hidden
              />
            </Link>

            <div className="mt-9">
              <TitreColonne id="pied-reseaux">Suivez-nous</TitreColonne>
              <ul aria-labelledby="pied-reseaux" className="mt-5 flex flex-wrap gap-3">
                {RESEAUX.map((r) => (
                  <li key={r.nom}>
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${r.nom} (nouvel onglet)`}
                      title={r.nom}
                      className="grid h-12 w-12 place-items-center rounded-full border-2 border-white/85 text-white transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-militant-rouge hover:bg-militant-rouge focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 focus-visible:ring-offset-militant-charbon motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      {r.icone}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── Barre du bas ── */}
        <div className="pied-col border-t border-militant-ardoise/35">
          <div
            className={`mx-auto flex max-w-7xl flex-col gap-3 px-5 pt-6 text-[14px] text-militant-ardoise sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10 ${
              // En développement seulement : place pour l'indicateur flottant de Next.js (absent en production).
              process.env.NODE_ENV === "development" ? "pb-20" : "pb-6"
            }`}
          >
            <p>© 2026 Centrale Générale FGTB Namur-Luxembourg</p>
            <nav aria-label="Informations légales">
              <ul className="flex flex-wrap items-center gap-y-1">
                {LEGAL.map((l, i) => (
                  <li key={l.href} className="flex items-center">
                    {i > 0 && (
                      <span aria-hidden className="mx-2.5 h-1 w-1 rounded-full bg-militant-ardoise/60" />
                    )}
                    <Link
                      href={l.href}
                      className="inline-flex min-h-[36px] items-center rounded-sm transition-colors duration-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 focus-visible:ring-offset-militant-charbon"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li className="flex items-center">
                  <span aria-hidden className="mx-2.5 h-1 w-1 rounded-full bg-militant-ardoise/60" />
                  <Link
                    href="/cookies#reglages"
                    className="inline-flex min-h-[36px] items-center rounded-sm transition-colors duration-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 focus-visible:ring-offset-militant-charbon"
                  >
                    Gérer les cookies
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </RevelationPied>
    </footer>
  );
}
