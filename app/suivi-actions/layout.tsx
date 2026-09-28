import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuperAdmin } from "../../lib/supabase-server";
import MenuAdmin from "./MenuAdmin";

export const metadata: Metadata = {
  title: "Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

/** Espace admin : réservé aux SUPER_ADMIN (verrou aussi dans le proxy et chaque page). */
export default async function SuiviActionsLayout({ children }: { children: React.ReactNode }) {
  const admin = await getSuperAdmin();
  if (!admin) redirect("/login?next=/suivi-actions");

  return (
    <div className="flex flex-1 flex-col bg-white font-barlow text-militant-charbon lg:flex-row">
      <MenuAdmin email={admin.email ?? ""} />
      <div className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</div>
    </div>
  );
}
