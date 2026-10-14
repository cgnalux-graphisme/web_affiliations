import type { Metadata } from "next";
import { exigerAdminLiberations } from "../../../../../lib/liberations/donnees-serveur";
import { textesActuels } from "../../../../../lib/liberations/courriers-serveur";
import { MODELES, VARIABLES } from "../../../../../lib/liberations/courriers";
import { EnteteEcran } from "../../../_partage/ui";
import Modeles from "./Modeles";

export const metadata: Metadata = { title: "Modèles de courriers — Espace CG", robots: { index: false, follow: false } };

/** Textes des courriers de libération : proposés par le code, modifiables ici (admins). */
export default async function ModelesPage() {
  await exigerAdminLiberations();
  const textes = await textesActuels();
  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="mail" titre="Modèles de courriers"
        description="Les textes des lettres, convocations, attestations et e-mails. Les mots entre doubles accolades sont remplacés pour chaque participant." />
      <Modeles modeles={MODELES.map((m) => ({ ...m, actuel: textes[m.code] }))} variables={VARIABLES} />
    </div>
  );
}
