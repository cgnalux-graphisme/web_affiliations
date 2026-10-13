"use client";

import { useRouter } from "next/navigation";
import { Mail, Phone, TriangleAlert } from "lucide-react";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { blocAdresse, REF_DEFAUT } from "../../../../lib/entreprises/regles";
import type { Entreprise } from "../../../../lib/entreprises/types";
import { enregistrerEntreprise } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";
import { Statut } from "../../_partage/ui";
import SectionEditable from "./SectionEditable";

const VIDE: Entreprise = {
  id: "", company_id: null, nom: null, numero_bce: null, denomination_bce: null, siege_rue: null, siege_numero: null,
  siege_boite: null, siege_code_postal: null, siege_localite: null, ref_nom: null, ref_fonction: null, ref_email: null,
  ref_telephone: null, bce_importe_le: null, notes: null, autres_company_ids: [],
};

/** Bloc adresse d'un courrier, présenté comme une enveloppe. */
export function ApercuBloc({ lignes, incomplet, titre = "Bloc adresse des courriers" }: { lignes: string[]; incomplet: boolean; titre?: string }) {
  return (
    <figure className="ecg-lettre">
      <figcaption className="ecg-libelle mb-2">{titre}</figcaption>
      <address>
        {lignes.map((l, i) => <div key={i} className={i === 0 ? "ecg-texte-doux text-sm" : ""}>{l}</div>)}
      </address>
      {incomplet && <div className="mt-3"><Statut ton="attente" icone={TriangleAlert}>Adresse incomplète</Statut></div>}
    </figure>
  );
}

export default function PanneauCourrier({ fiche }: { fiche: Fiche }) {
  const router = useRouter();
  const e = fiche.fiche ?? VIDE;
  const bloc = blocAdresse(e, fiche.company?.name ?? null);
  const siege = [[e.siege_rue, e.siege_numero].filter(Boolean).join(" ") + (e.siege_boite ? ` bte ${e.siege_boite}` : ""),
    [e.siege_code_postal, e.siege_localite].filter(Boolean).join(" ")].filter((x) => x.trim()).join(", ");

  return (
    <SectionEditable
      id="courrier"
      titre="Courrier"
      sousTitre="Siège social et personne de référence"
      lecture={
        <div className="grid gap-4">
          <ApercuBloc {...bloc} />
          <dl className="ecg-recap">
            <div><dt>Siège social</dt><dd>{siege || <span className="ecg-texte-doux">Non renseigné</span>}</dd></div>
            <div>
              <dt>Personne de référence</dt>
              <dd>
                {e.ref_nom ? <>{e.ref_nom}{e.ref_fonction && <span className="ecg-texte-doux font-normal"> · {e.ref_fonction}</span>}</> : <span className="ecg-texte-doux">{REF_DEFAUT} (par défaut)</span>}
              </dd>
            </div>
          </dl>
          {(e.ref_email || e.ref_telephone) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {e.ref_email && <a className="ecg-lien inline-flex items-center gap-1" href={`mailto:${e.ref_email}`}><Mail size={15} aria-hidden /> {e.ref_email}</a>}
              {e.ref_telephone && <a className="ecg-lien inline-flex items-center gap-1" href={`tel:${e.ref_telephone.replace(/\s/g, "")}`}><Phone size={15} aria-hidden /> {e.ref_telephone}</a>}
            </div>
          )}
        </div>
      }
      edition={(fermer) => (
        <ChampsEdition
          id="courrier"
          valeurs={e}
          champs={[
            { nom: "siege_rue", libelle: "Rue", largeur: "plein" },
            { nom: "siege_numero", libelle: "Numéro", largeur: "tiers" },
            { nom: "siege_boite", libelle: "Boîte", largeur: "tiers" },
            { nom: "siege_code_postal", libelle: "Code postal", largeur: "tiers" },
            { nom: "siege_localite", libelle: "Localité", largeur: "plein" },
            { nom: "ref_nom", libelle: "Personne de référence", exemple: "Mme Anne Martin", aide: `Vide : « ${REF_DEFAUT} ».`, largeur: "plein" },
            { nom: "ref_fonction", libelle: "Fonction", exemple: "Directrice RH", largeur: "plein" },
            { nom: "ref_email", libelle: "E-mail", type: "email", largeur: "plein" },
            { nom: "ref_telephone", libelle: "Téléphone", type: "tel", largeur: "plein" },
          ]}
          enregistrer={(v) => enregistrerEntreprise(fiche.cle, v)}
          onSucces={(d) => {
            fermer();
            if (d?.cle && d.cle !== fiche.cle) router.replace(`/espace/entreprises/${d.cle}`);
          }}
        />
      )}
    />
  );
}
