import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "FGTB — Formulaires en ligne",
  description: "Formulaires en ligne — Centrale Générale FGTB Namur Luxembourg",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <nav className="bg-red-700 shadow-md">
          <div className="flex items-center gap-0 px-6 min-h-[52px]">
            <span className="text-white font-bold text-[15px] mr-8 whitespace-nowrap tracking-tight">
              CG FGTB Namur–Luxembourg
            </span>
            <div className="flex gap-1">
              <Link
                href="/affiliation"
                className="text-red-200 hover:text-white hover:bg-white/20 text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
              >
                Affiliation
              </Link>
              <Link
                href="/mandat-sepa"
                className="text-red-200 hover:text-white hover:bg-white/20 text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
              >
                Changement de compte
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
