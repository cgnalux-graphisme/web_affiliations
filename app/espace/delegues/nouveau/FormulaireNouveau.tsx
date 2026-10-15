"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import type { EntrepriseChoix } from "../../../../lib/delegues/donnees-serveur";
import type { Travailleur } from "../../../../lib/entreprises/travailleurs";
import { creerDelegue } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";
import ChoixTravailleur from "../ChoixTravailleur";
import { AIDE, BTN, CHAMP, LIBELLE } from "../../_partage/ui";

/**
 * Créer un délégué : choisir l'entreprise, puis soit taper son identité, soit la reprendre de la liste des
 * travailleurs de l'entreprise (CG Link) : prénom, nom et registre national se remplissent.
 */
export default function FormulaireNouveau({ entreprises }: { entreprises: EntrepriseChoix[] }) {
  const router = useRouter();
  const [entrepriseId, setEntrepriseId] = useState("");
  const [choix, setChoix] = useState(false);
  const [repris, setRepris] = useState<Travailleur | null>(null);

  // Les champs se rechargent quand un travailleur est choisi (ChampsEdition ne relit ses valeurs qu'à sa création).
  const valeurs = repris ? { prenom: repris.prenom, nom: repris.nom, registre_national: repris.niss ?? "" } : {};

  return (
    <div className="grid gap-4">
      <div>
        <label htmlFor="nouveau-entreprise" className={LIBELLE}>Entreprise</label>
        <select id="nouveau-entreprise" name="nouveau-entreprise" className={CHAMP} value={entrepriseId}
          onChange={(e) => { setEntrepriseId(e.target.value); setRepris(null); }}>
          <option value="">Choisir…</option>
          {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </select>
      </div>

      {entrepriseId && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={BTN} onClick={() => setChoix(true)}>
            <Users size={16} aria-hidden /> Choisir parmi les travailleurs
          </button>
          <p className={`${AIDE} mt-0`}>
            {repris ? `Repris de CG Link : ${repris.prenom} ${repris.nom}.` : "Prénom, nom et registre national se remplissent tout seuls."}
          </p>
        </div>
      )}

      <ChampsEdition
        key={`${entrepriseId}-${repris?.id ?? "main"}`}
        id="nouveau"
        valeurs={valeurs}
        toujoursActif
        champs={[
          { nom: "prenom", libelle: "Prénom", largeur: "demi" },
          { nom: "nom", libelle: "Nom", largeur: "demi" },
          { nom: "registre_national", libelle: "N° de registre national", type: "registre", exemple: "85.07.30-033.28", largeur: "demi" },
          { nom: "email", libelle: "E-mail", type: "email", largeur: "demi" },
          { nom: "telephone", libelle: "Téléphone", type: "tel", largeur: "demi" },
        ]}
        enregistrer={async (v) => {
          if (!entrepriseId) return { ok: false, erreur: "Choisissez l'entreprise du délégué." };
          const r = await creerDelegue({ ...v, entreprise_id: entrepriseId });
          return r.ok ? { ok: true, donnees: { cle: r.donnees?.id } } : r;
        }}
        libelleBouton="Créer le délégué"
        onSucces={(d) => d?.cle && router.push(`/espace/delegues/${d.cle}`)}
      />

      {choix && entrepriseId && (
        <ChoixTravailleur entrepriseId={entrepriseId} onChoisir={setRepris} onFermer={() => setChoix(false)} />
      )}
    </div>
  );
}
