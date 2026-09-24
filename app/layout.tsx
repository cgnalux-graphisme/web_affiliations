import type { Metadata } from "next";
import "./globals.css";
import { barlow, condensed } from "./fonts";
import { forms, transferJourney } from "./forms";
import NavigationSite from "./NavigationSite";

export const metadata: Metadata = {
  title: "FGTB — Formulaires en ligne",
  description: "Formulaires en ligne — Centrale Générale FGTB Namur Luxembourg",
};

const liens = [
  { href: "/", label: "Accueil" },
  { href: "/actions", label: "Nos actions" },
  ...forms.map((f) => ({ href: f.href, label: f.shortTitle })),
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${condensed.variable} ${barlow.variable}`}>
      <body>
        <NavigationSite
          liens={liens}
          cta={{ href: transferJourney.href, label: transferJourney.shortTitle }}
        />
        {children}
      </body>
    </html>
  );
}
