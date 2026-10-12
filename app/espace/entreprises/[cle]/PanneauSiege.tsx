"use client";

import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { blocAdresse, REF_DEFAUT } from "../../../../lib/entreprises/regles";
import type { Entreprise } from "../../../../lib/entreprises/types";
import { enregistrerEntreprise } from "../actions";
import { Panneau, Statut } from "../../_partage/ui";
import ChampsEdition from "./ChampsEdition";

const VIDE: Entreprise = {
  id: "", company_id: null, nom: null, numero_bce: null, denomination_bce: null, siege_rue: null, siege_numero: null,
  siege_boite: null, siege_code_postal: null, siege_localite: null, ref_nom: null, ref_fonction: null, ref_email: null,
  ref_telephone: null, bce_importe_le: null, notes: null,
};

export function ApercuBloc({ lignes, incomplet }: { lignes: string[]; incomplet: boolean }) {
  return (
    <figure className="rounded-lg border bg-white p-4">
      <figcaption className="ecg-libelle mb-2">Bloc adresse d'un courrier</figcaption>
      <address className="not-italic leading-relaxed">
        {lignes.map((l, i) => <div key={i}>{l}</div>)}
      </address>
      {incomplet && <div className="mt-2"><Statut ton="attente" icone={TriangleAlert}>Adresse incomplète</Statut></div>}
    </figure>
  );
}

export default function PanneauSiege({ fiche }: { fiche: Fiche }) {
  const router = useRouter();
  const e = fiche.fiche ?? VIDE;
  const bloc = blocAdresse(e, fiche.company?.name ?? null);

  return (
    <Panneau titre="Siège social et personne de référence" sousTitre={`Sans nom, les courriers portent « ${REF_DEFAUT} ».`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <ChampsEdition
          id="siege"
          valeurs={e}
          champs={[
            { nom: "siege_rue", libelle: "Rue", largeur: "demi" },
            { nom: "siege_numero", libelle: "Numéro", largeur: "tiers" },
            { nom: "siege_boite", libelle: "Boîte", largeur: "tiers" },
            { nom: "siege_code_postal", libelle: "Code postal", largeur: "tiers" },
            { nom: "siege_localite", libelle: "Localité", largeur: "demi" },
            { nom: "ref_nom", libelle: "Personne de référence", exemple: "Mme Anne Martin", largeur: "demi" },
            { nom: "ref_fonction", libelle: "Fonction", exemple: "Directrice des ressources humaines", largeur: "demi" },
            { nom: "ref_email", libelle: "E-mail", type: "email", largeur: "demi" },
            { nom: "ref_telephone", libelle: "Téléphone", type: "tel", largeur: "demi" },
          ]}
          enregistrer={(v) => enregistrerEntreprise(fiche.cle, v)}
          onSucces={(d) => d?.cle && d.cle !== fiche.cle && router.replace(`/espace/entreprises/${d.cle}`)}
        />
        <ApercuBloc {...bloc} />
      </div>
    </Panneau>
  );
}
