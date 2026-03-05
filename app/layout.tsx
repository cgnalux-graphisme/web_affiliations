import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FGTB — Affiliation en ligne",
  description: "Formulaire de demande d'affiliation à la FGTB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
