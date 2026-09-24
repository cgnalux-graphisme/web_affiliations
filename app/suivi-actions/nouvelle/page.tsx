import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FormulaireAction from "../../../FormulaireAction";
import { getSuperAdmin } from "../../../lib/supabase-server";

export const metadata: Metadata = {
  title: "Encoder une action — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export default async function NouvelleActionPage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/nouvelle");
  return <FormulaireAction />;
}
