"use client";

import { useRouter } from "next/navigation";
import type { EntrepriseChoix } from "../../../../lib/delegues/donnees-serveur";
import { creerDelegue } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";

export default function FormulaireNouveau({ entreprises }: { entreprises: EntrepriseChoix[] }) {
  const router = useRouter();
  return (
    <ChampsEdition
      id="nouveau"
      valeurs={{}}
      toujoursActif
      champs={[
        { nom: "entreprise_id", libelle: "Entreprise", type: "choix", options: [{ valeur: "", libelle: "Choisir…" }, ...entreprises.map((e) => ({ valeur: e.id, libelle: e.nom }))] },
        { nom: "prenom", libelle: "Prénom", largeur: "demi" },
        { nom: "nom", libelle: "Nom", largeur: "demi" },
        { nom: "email", libelle: "E-mail", type: "email", largeur: "demi" },
        { nom: "telephone", libelle: "Téléphone", type: "tel", largeur: "demi" },
      ]}
      enregistrer={async (v) => {
        const r = await creerDelegue(v);
        return r.ok ? { ok: true, donnees: { cle: r.donnees?.id } } : r;
      }}
      libelleBouton="Créer le délégué"
      onSucces={(d) => d?.cle && router.push(`/espace/delegues/${d.cle}`)}
    />
  );
}
