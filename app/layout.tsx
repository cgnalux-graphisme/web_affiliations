import type { Metadata } from "next";
import "./globals.css";
import { barlow, condensed } from "./fonts";
import { forms, transferJourney } from "./forms";
import NavigationSite from "./NavigationSite";
import PiedDePage from "./PiedDePage";

export const metadata: Metadata = {
  title: "Centrale Générale FGTB Namur-Luxembourg",
  description:
    "Actions syndicales et démarches en ligne de la Centrale Générale FGTB Namur-Luxembourg : affiliation, formulaires ONEM, mandat SEPA, calcul de préavis.",
};

const liens = [
  { href: "/", label: "Accueil" },
  { href: "/actions", label: "Nos actions" },
  // Les formulaires sont regroupés dans une seule rubrique.
  { href: "/demarches", label: "Démarches en ligne", aussi: [transferJourney.href, ...forms.map((f) => f.href)] },
  { href: "/contact", label: "Contact" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${condensed.variable} ${barlow.variable}`}>
      <body className="flex min-h-screen flex-col">
        <NavigationSite liens={liens} cta={{ href: "/affiliation", label: "S'affilier" }} />
        <div className="flex flex-1 flex-col">{children}</div>
        <PiedDePage />
      </body>
    </html>
  );
}
