import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { forms } from "./forms";

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
            <img
              src="/Logo CG Blanc.png"
              alt="FGTB"
              className="h-[18px] w-auto object-contain shrink-0 mr-8"
            />
            <div className="flex gap-1">
              <Link
                href="/"
                className="text-red-200 hover:text-white hover:bg-white/20 text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
              >
                Accueil
              </Link>
              {forms.map((form) => (
                <Link
                  key={form.href}
                  href={form.href}
                  className="text-red-200 hover:text-white hover:bg-white/20 text-[13px] font-medium px-4 py-2 rounded-md transition-colors"
                >
                  {form.shortTitle}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
