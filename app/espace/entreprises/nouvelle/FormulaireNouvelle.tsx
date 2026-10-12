"use client";

import { useRouter } from "next/navigation";
import ChampsEdition from "../[cle]/ChampsEdition";
import { creerEntreprise } from "../actions";

export default function FormulaireNouvelle() {
  const router = useRouter();
  return (
    <ChampsEdition
      id="nouvelle"
      valeurs={{}}
      champs={[
        { nom: "nom", libelle: "Nom de l'entreprise", largeur: "demi" },
        { nom: "numero_bce", libelle: "N° d'entreprise BCE (facultatif)", exemple: "0850.076.920", largeur: "demi",
          aide: "Avec le numéro, vous pourrez importer la dénomination et les unités depuis la BCE." },
      ]}
      enregistrer={creerEntreprise}
      libelleBouton="Créer la fiche"
      onSucces={(d) => d?.cle && router.push(`/espace/entreprises/${d.cle}`)}
    />
  );
}
