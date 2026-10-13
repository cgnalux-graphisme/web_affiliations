import type { Metadata } from "next";
import { exigerAccesDelegues } from "../../../../lib/permanents/perimetre-serveur";
import { chargerListeDelegues } from "../../../../lib/delegues/donnees-serveur";
import { EnteteEcran, Panneau } from "../../_partage/ui";
import FormulaireNouveau from "./FormulaireNouveau";

export const metadata: Metadata = { title: "Nouveau délégué — Espace CG", robots: { index: false, follow: false } };

export default async function NouveauPage() {
  const r = await chargerListeDelegues(await exigerAccesDelegues());
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="plus" titre="Nouveau délégué" description="Les mandats et l'unité de rattachement se complètent ensuite sur sa carte." />
      <Panneau><FormulaireNouveau entreprises={r.ok ? r.entreprises : []} /></Panneau>
    </div>
  );
}
