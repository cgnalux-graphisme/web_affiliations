import type { Metadata } from "next";
import { exigerApp } from "../../../../lib/espace/acces";
import { EnteteEcran, Panneau } from "../../_partage/ui";
import FormulaireNouvelle from "./FormulaireNouvelle";

export const metadata: Metadata = { title: "Nouvelle entreprise — Espace CG", robots: { index: false, follow: false } };

export default async function NouvellePage() {
  await exigerApp("entreprises");
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="plus" titre="Nouvelle entreprise"
        description="Pour une entreprise absente de CG Link. Les entreprises de CG Link sont déjà dans la liste." />
      <Panneau>
        <FormulaireNouvelle />
      </Panneau>
    </div>
  );
}
