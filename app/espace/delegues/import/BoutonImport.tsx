"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import type { RapportImport } from "../../../../lib/delegues/import-serveur";
import { lancerImport } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { Alerte, BTN_PRINCIPAL } from "../../_partage/ui";

export default function BoutonImport() {
  const [enCours, setEnCours] = useState(false);
  const [rapport, setRapport] = useState<RapportImport | null>(null);
  const [erreur, setErreur] = useState("");

  async function lancer() {
    setEnCours(true);
    setErreur("");
    try {
      const r = await lancerImport();
      if (!r.ok) setErreur(r.erreur);
      else setRapport(r.donnees ?? null);
    } catch {
      setErreur("L'import a été interrompu. Relancez-le : les délégués déjà importés ne seront pas recréés.");
    }
    setEnCours(false);
  }

  return (
    <div className="grid gap-4">
      <button type="button" onClick={lancer} disabled={enCours} className={`${BTN_PRINCIPAL} w-fit`}>
        {enCours ? <IconeChargement size={15} /> : <Upload size={15} aria-hidden />} Importer depuis CG Link
      </button>
      {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
      {rapport && (
        <Alerte ton={rapport.erreurs ? "attention" : "succes"} titre="Import terminé">
          <ul className="mt-1 list-disc pl-5">
            <li>{rapport.crees} délégué(s) créé(s), {rapport.mandats} mandat(s)</li>
            <li>{rapport.dejaPresents} déjà présent(s), non modifié(s)</li>
            {rapport.erreurs > 0 && <li>{rapport.erreurs} erreur(s) : relancez l'import</li>}
            {rapport.sansFiche.length > 0 && <li>Entreprises sans fiche (délégués non importés) : {rapport.sansFiche.join(", ")}</li>}
            {rapport.rejetes.length > 0 && (
              <li>Textes « Autre » non importés : {rapport.rejetes.map((r) => `${r.entreprise} : « ${r.texte} »`).join(" ; ")}</li>
            )}
          </ul>
          <p className="mt-2"><Link className="ecg-lien" href="/espace/delegues/a-verifier">Voir les éléments à vérifier</Link></p>
        </Alerte>
      )}
    </div>
  );
}
