import type { Metadata } from "next";
import "./globals.css";
import { barlow, condensed } from "./fonts";
import { forms, transferJourney } from "./forms";
import { chargerMobilisationActive } from "../lib/mobilisations-public";
import BandeauMobilisation from "./BandeauMobilisation";
import ConsentementCookies from "./ConsentementCookies";
import NavigationSite from "./NavigationSite";
import PiedDePage from "./PiedDePage";

export const metadata: Metadata = {
  title: "Centrale Générale FGTB Namur-Luxembourg",
  description:
    "Actions syndicales et démarches en ligne de la Centrale Générale FGTB Namur-Luxembourg : affiliation, formulaires ONEM, mandat SEPA, calcul de préavis.",
};

const liens = [
  { href: "/", label: "Accueil" },
  // Une seule entrée pour les actualités et « On vous explique » (pages de détail comprises).
  { href: "/actualites", label: "Actualités", aussi: ["/blog", "/on-vous-explique"] },
  { href: "/actions", label: "Nos actions" },
  // Les formulaires sont regroupés dans une seule rubrique.
  { href: "/demarches", label: "Démarches en ligne", aussi: [transferJourney.href, ...forms.map((f) => f.href)] },
  { href: "/contact", label: "Contact" },
];

// Le bandeau de mobilisation suit l'espace admin en moins d'une minute sur toutes les pages
// (et tout de suite grâce à revalidatePath après chaque changement).
export const revalidate = 60;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Bandeau seulement si la vue site_accueil_mobilisation renvoie une ligne (interrupteur on + mobilisation active).
  const mobilisation = await chargerMobilisationActive();
  return (
    <html lang="fr" className={`${condensed.variable} ${barlow.variable}`}>
      <body className="flex min-h-screen flex-col">
        {mobilisation && (
          <BandeauMobilisation
            m={{
              id: mobilisation.id,
              titre: mobilisation.titre,
              slug: mobilisation.slug,
              date_evenement: mobilisation.date_evenement,
              lien_inscription: mobilisation.lien_inscription,
            }}
          />
        )}
        <NavigationSite liens={liens} cta={{ href: "/affiliation", label: "S'affilier" }} />
        <div className="flex flex-1 flex-col">{children}</div>
        <PiedDePage />
        <ConsentementCookies />
      </body>
    </html>
  );
}
