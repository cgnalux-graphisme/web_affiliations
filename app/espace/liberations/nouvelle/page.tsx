import type { Metadata } from "next";
import { exigerLiberations } from "../../../../lib/liberations/donnees-serveur";
import { EnteteEcran } from "../../_partage/ui";
import ChoixType from "./ChoixType";

export const metadata: Metadata = { title: "Nouvelle demande de libération — Espace CG", robots: { index: false, follow: false } };

export default async function NouvellePage() {
  await exigerLiberations();
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="plus" titre="Nouvelle demande de libération"
        description="Choisissez le type de libération : la demande est créée en brouillon, vous la complétez puis vous l'envoyez." />
      <ChoixType />
    </div>
  );
}
