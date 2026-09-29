import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSuperAdmin } from "../../../../lib/supabase-server";
import FormulaireMobilisation from "../FormulaireMobilisation";

export const metadata: Metadata = {
  title: "Nouvelle mobilisation — Espace admin ACCG Nalux",
  robots: { index: false, follow: false },
};

export default async function NouvelleMobilisationPage() {
  if (!(await getSuperAdmin())) redirect("/login?next=/suivi-actions/mobilisations/nouvelle");
  return <FormulaireMobilisation />;
}
