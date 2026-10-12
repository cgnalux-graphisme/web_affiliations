import type { Metadata } from "next";
import FormulaireAction from "../../../../FormulaireAction";
import { exigerApp } from "../../../../lib/espace/acces";

export const metadata: Metadata = {
  title: "Encoder une action — Espace CG",
  robots: { index: false, follow: false },
};

export default async function NouvelleActionPage() {
  await exigerApp("actions");
  return <FormulaireAction />;
}
