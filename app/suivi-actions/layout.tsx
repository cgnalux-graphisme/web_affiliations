import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { getSuperAdmin } from "../../lib/supabase-server";
import { deconnexion } from "../login/actions";
import LiensAdmin from "./LiensAdmin";

export const metadata: Metadata = {
  title: "Suivi des actions — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

/** Espace admin du suivi des actions : réservé aux SUPER_ADMIN (verrou aussi dans le proxy et chaque page). */
export default async function SuiviActionsLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/login?next=/suivi-actions");

  return (
    <div className="flex flex-1 flex-col bg-white font-barlow text-militant-charbon lg:flex-row">
      {/* Barre latérale claire (ligne horizontale sur mobile) */}
      <aside className="border-b border-militant-ardoise lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:sticky lg:top-0 lg:flex-col lg:flex-nowrap lg:items-stretch lg:gap-0 lg:px-0 lg:py-8">
          <p className="flex items-center gap-2 font-condensed text-xl font-extrabold lg:mx-6 lg:mb-4 lg:border-b-4 lg:border-militant-rouge lg:pb-3">
            <ShieldCheck size={20} className="text-militant-rouge" aria-hidden />
            Espace admin
          </p>
          <LiensAdmin />
          <div className="ml-auto flex min-w-0 items-center gap-3 lg:ml-0 lg:mt-8 lg:flex-col lg:items-start lg:gap-1 lg:px-6">
            <p className="hidden min-w-0 truncate text-sm sm:block lg:max-w-full">
              Connecté : <span className="font-bold">{admin.email}</span>
            </p>
            <form action={deconnexion}>
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-bold hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge lg:-ml-3"
              >
                <LogOut size={15} aria-hidden /> Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</div>
    </div>
  );
}
