"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Euro, Save } from "lucide-react";
import { COLONNES_MONTANT, euros, lireMontant, montantSaisie, totalGeneral } from "../../../../../lib/liberations/montants";
import type { VueParticipantCourriers } from "../../../../../lib/liberations/courriers-serveur";
import { enregistrerPaiement } from "../../courriers-actions";
import { IconeChargement } from "../../../../Chargement";
import { PanneauLateral } from "../../../_partage/Fenetres";
import { Alerte, BTN, BTN_PETIT, BTN_PRINCIPAL, CHAMP, LIBELLE } from "../../../_partage/ui";

/** Attestation de perte de salaire reçue, montants par date (fiche de paiement) et remarques. */
export default function PaiementParticipant({ participant: p, dates }: { participant: VueParticipantCourriers; dates: { id: string; libelle: string }[] }) {
  const router = useRouter();
  const depart = () => Object.fromEntries(dates.map((d) => [d.id, Object.fromEntries(COLONNES_MONTANT.map((c) => [c.cle, montantSaisie(p.paiement?.montants[d.id]?.[c.cle])]))]));
  const [ouvert, setOuvert] = useState(false);
  const [recue, setRecue] = useState(Boolean(p.paiement?.recue));
  const [remarques, setRemarques] = useState(p.paiement?.remarques ?? "");
  const [lignes, setLignes] = useState<Record<string, Record<string, string>>>(depart);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  const total = totalGeneral(Object.values(lignes).map((l) => Object.fromEntries(Object.entries(l).map(([k, v]) => [k, lireMontant(v) ?? 0]))));

  async function enregistrer(fermer: () => void) {
    setEnCours(true);
    setErreur("");
    const r = await enregistrerPaiement(p.id, { attestationRecue: recue, remarques, lignes })
      .catch(() => ({ ok: false as const, erreur: "Le serveur n'a pas répondu. Réessayez." }));
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    fermer();
    router.refresh();
  }

  return (
    <>
      <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => {
        setRecue(Boolean(p.paiement?.recue)); setRemarques(p.paiement?.remarques ?? ""); setLignes(depart()); setOuvert(true);
      }}>
        <Euro size={15} aria-hidden /> Paiement<span className="sr-only"> de {p.nom}</span>
      </button>
      <PanneauLateral ouvert={ouvert} onFermer={() => setOuvert(false)} titre={`Paiement : ${p.nom}`}
        sousTitre="Les montants de l'attestation renvoyée par l'employeur, repris sur la fiche de paiement."
        pied={(fermer) => (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={BTN_PRINCIPAL} disabled={enCours} onClick={() => enregistrer(fermer)}>
              {enCours ? <IconeChargement size={16} /> : <Save size={16} aria-hidden />} Enregistrer
            </button>
            <span className="font-semibold tabular-nums">Total : {euros(total)}</span>
            {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
          </div>
        )}>
        <div className="grid gap-4">
          {!p.paiement?.iban && <Alerte ton="attention">Le n° de compte du délégué manque : ajoutez-le avec « Compléter » (participants).</Alerte>}
          <label className={`ecg-choix${recue ? " ecg-choix-actif" : ""}`}>
            <input type="checkbox" checked={recue} onChange={(e) => setRecue(e.target.checked)} data-focus-initial />
            Attestation de perte de salaire reçue
          </label>
          {dates.map((d) => (
            <fieldset key={d.id} className="grid gap-2 rounded-xl border border-[var(--ecg-trait)] p-3">
              <legend className="px-1 font-semibold tabular-nums">{d.libelle}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {COLONNES_MONTANT.map((c) => (
                  <div key={c.cle}>
                    <label htmlFor={`m-${p.id}-${d.id}-${c.cle}`} className={LIBELLE}>{c.libelle} (€)</label>
                    <input id={`m-${p.id}-${d.id}-${c.cle}`} className={`${CHAMP} ecg-chiffre`} inputMode="decimal" autoComplete="off" placeholder="0,00"
                      value={lignes[d.id]?.[c.cle] ?? ""}
                      onChange={(e) => setLignes((x) => ({ ...x, [d.id]: { ...x[d.id], [c.cle]: e.target.value } }))} />
                  </div>
                ))}
              </div>
            </fieldset>
          ))}
          <div>
            <label htmlFor={`remarques-${p.id}`} className={LIBELLE}>Remarques (fiche de paiement)</label>
            <textarea id={`remarques-${p.id}`} className={CHAMP} rows={3} maxLength={1000} value={remarques} onChange={(e) => setRemarques(e.target.value)} />
          </div>
        </div>
      </PanneauLateral>
    </>
  );
}
