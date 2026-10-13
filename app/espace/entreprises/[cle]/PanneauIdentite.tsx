"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { formaterNumeroBce } from "../../../../lib/bce/numero";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { enregistrerEntreprise, relierCgLink } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";
import { BTN, CHAMP, LIBELLE } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import SectionEditable from "./SectionEditable";

export default function PanneauIdentite({ fiche }: { fiche: Fiche }) {
  const router = useRouter();
  const e = fiche.fiche;
  const [cible, setCible] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function relier() {
    if (!e || !cible) return;
    setEnCours(true);
    setErreur("");
    const r = await relierCgLink(e.id, cible);
    setEnCours(false);
    if (!r.ok) setErreur(r.erreur);
    else router.refresh();
  }

  const vide = <span className="ecg-texte-doux font-normal">Non renseigné</span>;

  return (
    <SectionEditable
      id="identite"
      titre="Identité"
      lecture={
        <div className="grid gap-4">
          <dl className="ecg-recap">
            <div><dt>Nom usuel</dt><dd>{e?.nom ?? (fiche.company ? <>{fiche.company.name} <span className="ecg-texte-doux font-normal">(CG Link)</span></> : vide)}</dd></div>
            <div><dt>Dénomination BCE</dt><dd>{e?.denomination_bce ?? vide}</dd></div>
            <div><dt>N° d'entreprise</dt><dd>{e?.numero_bce ? formaterNumeroBce(e.numero_bce) : vide}</dd></div>
            <div>
              <dt>Secteur</dt>
              <dd>
                {fiche.secteur ?? <span className="ecg-texte-doux font-normal">À choisir</span>}
                {fiche.company?.sector && fiche.company.sector !== fiche.secteur && (
                  <span className="ecg-texte-doux block text-sm font-normal">CG Link : {fiche.company.sector}</span>
                )}
              </dd>
            </div>
          </dl>
          {e?.notes && (
            <div>
              <p className="ecg-libelle">Notes internes</p>
              <p className="whitespace-pre-line">{e.notes}</p>
            </div>
          )}
          {e && !e.company_id && fiche.companiesLibres.length > 0 && (
            <div className="border-t pt-4">
              <label htmlFor="relier" className={LIBELLE}>Relier à une entreprise CG Link</label>
              <div className="flex flex-wrap gap-2">
                <select id="relier" value={cible} onChange={(ev) => setCible(ev.target.value)} className={`${CHAMP} w-auto flex-1`}>
                  <option value="">Choisir une entreprise…</option>
                  {fiche.companiesLibres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={relier} disabled={!cible || enCours} className={BTN}>
                  {enCours ? <IconeChargement size={15} /> : <Link2 size={15} aria-hidden />} Relier
                </button>
              </div>
              {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
            </div>
          )}
        </div>
      }
      edition={(fermer) => (
        <ChampsEdition
          id="identite"
          valeurs={{ nom: e?.nom ?? null, numero_bce: e?.numero_bce ? formaterNumeroBce(e.numero_bce) : null, secteur_id: e?.secteur_id ?? "", notes: e?.notes ?? null }}
          champs={[
            { nom: "nom", libelle: fiche.company ? `Nom usuel (sinon « ${fiche.company.name} »)` : "Nom de l'entreprise", largeur: "demi" },
            { nom: "numero_bce", libelle: "N° d'entreprise BCE", exemple: "0850.076.920", largeur: "demi" },
            { nom: "secteur_id", libelle: "Secteur", type: "choix", largeur: "demi",
              aide: fiche.company?.sector ? `Dans CG Link : ${fiche.company.sector}.` : undefined,
              options: [{ valeur: "", libelle: "À choisir" }, ...fiche.secteurs.map((s) => ({ valeur: s.id, libelle: s.nom }))] },
            { nom: "notes", libelle: "Notes internes", type: "zone" },
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
