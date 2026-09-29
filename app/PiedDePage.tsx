import Link from "next/link";
import { Facebook, Instagram, Mail, MessageCircle, Phone, Youtube } from "lucide-react";

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

/** Logo TikTok (absent de lucide), monochrome comme les autres icônes. */
function IconeTikTok({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
    </svg>
  );
}

// Couleurs de la palette uniquement : pas de bleu Facebook ni de rose Instagram.
const RESEAUX = [
  { nom: "Facebook", href: "https://www.facebook.com/profile.php?id=100064837864775", icone: <Facebook size={20} aria-hidden /> },
  { nom: "Instagram", href: "https://www.instagram.com/centralegenerale_fgtb_nam_lux", icone: <Instagram size={20} aria-hidden /> },
  { nom: "YouTube", href: "https://www.youtube.com/@CentraleG%C3%A9n%C3%A9raleFGTBNamurLuxem", icone: <Youtube size={20} aria-hidden /> },
  { nom: "TikTok", href: "https://www.tiktok.com/@fgtb_cg_nalux", icone: <IconeTikTok /> },
];

const LIEN =
  "rounded-sm underline-offset-4 transition-colors hover:text-militant-bordeaux hover:underline hover:decoration-militant-rouge hover:decoration-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge";

function TitreColonne({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-condensed text-2xl font-extrabold leading-none">
      {children}
    </h2>
  );
}

/** Pied de page commun : fond blanc, filet rouge au-dessus, 4 colonnes et barre du bas. */
export default function PiedDePage() {
  return (
    <footer className="mt-auto border-t-4 border-militant-rouge bg-white font-barlow text-militant-charbon">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
        {/* ── Identité ── */}
        <div className="col-span-2 lg:col-span-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo PNG statique */}
          <img src="/logo-cg-rouge.png" width={1772} height={490} alt="" className="h-12 w-auto" />
          <p className="mt-4 font-condensed text-xl font-bold leading-tight">Centrale Générale FGTB Namur-Luxembourg</p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {BUREAUX.map((b) => (
              <address key={b.nom} className="not-italic">
                <p className="font-bold">{b.nom}</p>
                <p className="mt-1 text-[15px] leading-snug">
                  {b.adresse[0]}
                  <br />
                  {b.adresse[1]}
                </p>
                <a
                  href={`tel:${b.lien}`}
                  className={`mt-1.5 inline-flex min-h-[32px] items-center gap-1.5 text-[15px] font-semibold tabular-nums ${LIEN}`}
                >
                  <Phone size={15} className="text-militant-rouge" aria-hidden /> {b.tel}
                </a>
              </address>
            ))}
          </div>

          <ul className="mt-5 flex flex-col gap-1 text-[15px] font-semibold">
            <li>
              <a href="mailto:cg.nalux@accg.be" className={`inline-flex min-h-[32px] items-center gap-2 ${LIEN}`}>
                <Mail size={16} className="text-militant-rouge" aria-hidden /> cg.nalux@accg.be
              </a>
            </li>
            <li>
              <a
                href="https://wa.me/32478341179"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-[32px] items-center gap-2 tabular-nums ${LIEN}`}
              >
                <MessageCircle size={16} className="text-militant-rouge" aria-hidden /> WhatsApp : +32 (0)478 34 11 79
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            </li>
          </ul>
        </div>

        {/* ── Le site ── */}
        <nav aria-labelledby="pied-site" className="lg:col-span-2">
          <TitreColonne id="pied-site">Le site</TitreColonne>
          <ul className="mt-4 space-y-1 text-[16px] font-semibold">
            {SITE.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`inline-flex min-h-[36px] items-center ${LIEN}`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Démarches ── */}
        <nav aria-labelledby="pied-demarches" className="lg:col-span-2">
          <TitreColonne id="pied-demarches">Démarches</TitreColonne>
          <ul className="mt-4 space-y-1 text-[16px] font-semibold">
            {DEMARCHES.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`inline-flex min-h-[36px] items-center ${LIEN}`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Suivez-nous ── */}
        <div className="col-span-2 lg:col-span-3">
          <TitreColonne id="pied-reseaux">Suivez-nous</TitreColonne>
          <ul aria-labelledby="pied-reseaux" className="mt-4 flex flex-wrap gap-3">
            {RESEAUX.map((r) => (
              <li key={r.nom}>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${r.nom} (nouvel onglet)`}
                  title={r.nom}
                  className="grid h-12 w-12 place-items-center rounded-full border-2 border-militant-charbon transition-colors hover:border-militant-bordeaux hover:bg-militant-bordeaux hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
                >
                  {r.icone}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Barre du bas ── */}
      <div className="border-t border-militant-ardoise">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-[14px] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 Centrale Générale FGTB Namur-Luxembourg</p>
          <nav aria-label="Informations légales">
            <ul className="flex flex-wrap items-center gap-x-1 gap-y-1 font-semibold">
              {LEGAL.map((l, i) => (
                <li key={l.href} className="flex items-center">
                  {i > 0 && (
                    <span aria-hidden className="mx-2 text-militant-rouge">
                      ·
                    </span>
                  )}
                  <Link href={l.href} className={`inline-flex min-h-[32px] items-center ${LIEN}`}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
