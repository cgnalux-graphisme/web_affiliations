import type { Metadata } from "next";
import { exigerSuperAdmin } from "../../../../lib/espace/acces";
import { chargerListeDelegues } from "../../../../lib/delegues/donnees-serveur";
import { EnteteEcran, Panneau } from "../../_partage/ui";
import FormulaireNouveau from "./FormulaireNouveau";

export const metadata: Metadata = { title: "Nouveau délégué — Espace CG", robots: { index: false, follow: false } };

export default async function NouveauPage() {
  await exigerSuperAdmin();
  const r = await chargerListeDelegues();
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="plus" titre="Nouveau délégué" description="Les mandats et l'unité de rattachement se complètent ensuite sur sa carte." />
      <Panneau><FormulaireNouveau entreprises={r.ok ? r.entreprises : []} /></Panneau>
    </div>
  );
}
