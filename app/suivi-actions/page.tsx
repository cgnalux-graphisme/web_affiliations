import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import FormulaireAction from "../../FormulaireAction";
import { getSuperAdmin } from "../../lib/supabase-server";
import { deconnexion } from "../login/actions";

export const metadata: Metadata = {
  title: "Suivi des actions — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export default async function SuiviActionsPage() {
  // Double verrou : le proxy filtre déjà, la page revérifie côté serveur.
  const admin = await getSuperAdmin();
  if (!admin) redirect("/login?next=/suivi-actions");

  return (
    <FormulaireAction
      barreAdmin={
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
          <p className="flex min-w-0 items-center gap-2 text-sm text-gray-600">
            <ShieldCheck size={16} className="shrink-0 text-red-700" />
            <span className="truncate">
              Connecté : <span className="font-semibold text-gray-900">{admin.email}</span>
            </span>
          </p>
          <form action={deconnexion}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 transition-colors"
            >
              <LogOut size={15} /> Se déconnecter
            </button>
          </form>
        </div>
      }
    />
  );
}
