"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Info, Trash2 } from "lucide-react";
import { isoToDateFr } from "../../../../lib/dates";
import { tauxAuJour, tauxFr } from "../../../../lib/liberations/regles";
import { TAUX_LEGAL } from "../../../../lib/liberations/taux-legal";
import type { TauxKm as Taux } from "../../../../lib/liberations/types";
import { ajouterTaux, supprimerTaux } from "../actions";
import ChampsEdition from "../../_partage/ChampsEdition";
import { IconeChargement } from "../../../Chargement";
import { Alerte, BTN, BTN_PETIT, Panneau, Statut } from "../../_partage/ui";

/**
 * Taux kilométrique, avec sa date de début : un trajet est remboursé au taux en vigueur le jour de la réunion
 * (un changement de taux ne modifie pas les anciens dossiers).
 */
export default function TauxKm({ taux }: { taux: Taux[] }) {
  const router = useRouter();
  const [nouveau, setNouveau] = useState(0);
  const [prerempli, setPrerempli] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const aujourdhui = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  const enVigueur = tauxAuJour(taux, aujourdhui);

  async function supprimer(id: string) {
    setEnCours(id);
    const r = await supprimerTaux(id).catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(null);
    setErreur(r.ok ? "" : r.erreur);
    router.refresh();
  }

  return (
    <Panneau titre="Taux kilométrique" sousTitre="Euros par kilomètre. Chaque taux vaut à partir de sa date de début.">
      <div className="grid gap-4">
        {!enVigueur && <Alerte ton="attention">Aucun taux en vigueur aujourd&apos;hui : ajoutez-en un pour le calcul des frais.</Alerte>}
        {taux.length > 0 && (
          <ul className="ecg-lignes">
            {taux.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="flex flex-wrap items-center gap-3">
                  <b className="tabular-nums">{tauxFr(t.taux)}</b>
                  <span className="ecg-texte-doux tabular-nums">à partir du {isoToDateFr(t.valable_du)}</span>
                  {enVigueur?.id === t.id && <Statut ton="ok" icone={CircleCheck}>En vigueur</Statut>}
                </span>
                <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`} disabled={enCours !== null} onClick={() => supprimer(t.id)}>
                  {enCours === t.id ? <IconeChargement size={15} /> : <Trash2 size={15} aria-hidden />} Supprimer
                  <span className="sr-only"> le taux du {isoToDateFr(t.valable_du)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-[var(--ecg-trait)] p-3 text-sm">
          <Info size={18} aria-hidden className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p>
              <b>Taux légal, à titre informatif : {tauxFr(TAUX_LEGAL.taux)}</b> du {isoToDateFr(TAUX_LEGAL.du)} au{" "}
              {isoToDateFr(TAUX_LEGAL.au)} (indemnité kilométrique des fonctionnaires fédéraux, système trimestriel ;{" "}
              {TAUX_LEGAL.texte}). C&apos;est aussi le plafond admis par l&apos;ONSS sans justificatif.
            </p>
            <p className="ecg-texte-doux mt-1">
              Système annuel : {tauxFr(TAUX_LEGAL.annuel.taux)} du {isoToDateFr(TAUX_LEGAL.annuel.du)} au{" "}
              {isoToDateFr(TAUX_LEGAL.annuel.au)}. Relevé le {isoToDateFr(TAUX_LEGAL.releveLe)} ; il change chaque trimestre.
            </p>
          </div>
          <button type="button" className={`${BTN} ${BTN_PETIT}`}
            onClick={() => {
              setPrerempli({ taux: String(TAUX_LEGAL.taux).replace(".", ","), valable_du: TAUX_LEGAL.du });
              setNouveau((n) => n + 1);
            }}>
            Reprendre ce taux
          </button>
        </div>
        <div className="rounded-xl bg-[var(--ecg-fond)] p-3">
          <ChampsEdition key={nouveau} id={`taux-${nouveau}`} libelleBouton="Ajouter le taux" valeurs={prerempli}
            champs={[
              { nom: "taux", libelle: "Taux (€ / km)", exemple: "0,4280", largeur: "tiers" },
              { nom: "valable_du", libelle: "À partir du", type: "date", largeur: "tiers" },
            ]}
            enregistrer={ajouterTaux} onSucces={() => { setPrerempli({}); setNouveau((n) => n + 1); }} />
        </div>
      </div>
    </Panneau>
  );
}
