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
    <div className="min-h-[calc(100vh-68px)] bg-white font-barlow text-militant-charbon">
      <div className="border-b-2 border-militant-charbon bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
          <p className="flex items-center gap-2 font-condensed text-lg font-bold">
            <ShieldCheck size={18} className="text-militant-rouge" aria-hidden />
            Espace admin
          </p>
          <LiensAdmin />
          <div className="ml-auto flex min-w-0 items-center gap-3">
            <p className="hidden min-w-0 truncate text-sm sm:block">
              Connecté : <span className="font-bold">{admin.email}</span>
            </p>
            <form action={deconnexion}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
              >
                <LogOut size={15} aria-hidden /> Se déconnecter
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
