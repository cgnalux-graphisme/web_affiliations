import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuperAdmin } from "../../../lib/supabase-server";
import GenerateurRapport from "./GenerateurRapport";

export const metadata: Metadata = {
  title: "Rapport d'activité — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export default async function RapportPage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/rapport");
  return <GenerateurRapport />;
}
