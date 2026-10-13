"use client";

import { useState } from "react";
import { UserPen } from "lucide-react";
import type { FicheDelegue } from "../../../../lib/liberations/donnees-serveur";
import { completerDelegue } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";
import { PanneauLateral } from "../../_partage/Fenetres";
import { BTN, BTN_PETIT } from "../../_partage/ui";

/** Compléter ou corriger genre, registre national et domicile d'un participant (enregistré sur sa carte de délégué). */
export default function CompleterDelegue({ participantId, nom, fiche }: { participantId: string; nom: string; fiche: FicheDelegue }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => setOuvert(true)}>
        <UserPen size={15} aria-hidden /> Compléter<span className="sr-only"> la carte de {nom}</span>
      </button>
      <PanneauLateral ouvert={ouvert} onFermer={() => setOuvert(false)} titre={nom}
        sousTitre="Enregistré sur la carte du délégué (app Délégués), pour ce dossier et les suivants.">
        {(fermer) => (
          <ChampsEdition
            id={`completer-${participantId}`}
            valeurs={{ ...fiche, adresse_pays: fiche.adresse_pays ?? "Belgique" }}
            champs={[
              { nom: "genre", libelle: "Genre (accord des courriers)", type: "choix", largeur: "demi",
                options: [{ valeur: "", libelle: "Non précisé" }, { valeur: "M", libelle: "Délégué" }, { valeur: "F", libelle: "Déléguée" }] },
              { nom: "registre_national", libelle: "N° de registre national", type: "registre", exemple: "85.07.30-033.28", largeur: "demi" },
              { nom: "adresse_rue", libelle: "Rue du domicile", type: "rue",
                aide: "Tapez 3 lettres : choisissez l'adresse proposée, le reste se remplit.",
                cibles: { numero: "adresse_numero", code_postal: "adresse_code_postal", localite: "adresse_localite", pays: "adresse_pays" } },
              { nom: "adresse_numero", libelle: "Numéro", largeur: "tiers" },
              { nom: "adresse_boite", libelle: "Boîte", largeur: "tiers" },
              { nom: "adresse_code_postal", libelle: "Code postal", largeur: "tiers" },
              { nom: "adresse_localite", libelle: "Localité", largeur: "demi" },
              { nom: "adresse_pays", libelle: "Pays", largeur: "demi" },
            ]}
            enregistrer={(v) => completerDelegue(participantId, v)}
            onSucces={() => fermer()}
          />
        )}
      </PanneauLateral>
    </>
  );
}
