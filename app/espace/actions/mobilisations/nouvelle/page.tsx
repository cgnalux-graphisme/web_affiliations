import type { Metadata } from "next";
import { exigerApp } from "../../../../../lib/espace/acces";
import FormulaireMobilisation from "../FormulaireMobilisation";

export const metadata: Metadata = {
  title: "Nouvelle mobilisation — Espace CG",
  robots: { index: false, follow: false },
};

export default async function NouvelleMobilisationPage() {
  await exigerApp("actions");
  return <FormulaireMobilisation />;
}
