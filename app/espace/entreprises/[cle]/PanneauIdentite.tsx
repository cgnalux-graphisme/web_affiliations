"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { formaterNumeroBce } from "../../../../lib/bce/numero";
import type { Fiche } from "../../../../lib/entreprises/donnees-serveur";
import { enregistrerEntreprise, relierCgLink } from "../actions";
import { BTN, CHAMP, LIBELLE, Panneau } from "../../_partage/ui";
import { IconeChargement } from "../../../Chargement";
import ChampsEdition from "./ChampsEdition";

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

  return (
    <Panneau titre="Identité" sousTitre={fiche.company ? `Secteur : ${fiche.company.sector ?? "non renseigné"} (CG Link)` : "Entreprise hors CG Link"}>
      {e?.numero_bce && (
        <p className="mb-3 text-sm">
          <a className="ecg-lien inline-flex items-center gap-1" target="_blank" rel="noreferrer"
            href={`https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html?nummer=${e.numero_bce}&actionLu=Zoek&lang=fr`}>
            Voir {formaterNumeroBce(e.numero_bce)} à la BCE <ExternalLink size={14} aria-hidden />
          </a>
        </p>
      )}
      <ChampsEdition
        id="identite"
        valeurs={{
          nom: e?.nom ?? null,
          numero_bce: e?.numero_bce ? formaterNumeroBce(e.numero_bce) : null,
          notes: e?.notes ?? null,
        }}
        champs={[
          { nom: "nom", libelle: fiche.company ? `Nom usuel (sinon « ${fiche.company.name} »)` : "Nom de l'entreprise", largeur: "demi" },
          { nom: "numero_bce", libelle: "N° d'entreprise BCE", exemple: "0850.076.920", largeur: "demi" },
          { nom: "notes", libelle: "Notes internes", type: "zone" },
        ]}
        enregistrer={(v) => enregistrerEntreprise(fiche.cle, v)}
        onSucces={(d) => d?.cle && d.cle !== fiche.cle && router.replace(`/espace/entreprises/${d.cle}`)}
      />
      {e && !e.company_id && fiche.companiesLibres.length > 0 && (
        <div className="mt-5 border-t pt-4">
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
    </Panneau>
  );
}
