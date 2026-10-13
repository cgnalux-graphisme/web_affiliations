"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { supprimerFiche } from "../../actions";
import { IconeChargement } from "../../../../Chargement";
import { BTN, BTN_PETIT } from "../../../_partage/ui";

/** Suppression d'une fiche (documents et photos compris), après confirmation. */
export default function SupprimerFiche({ id }: { id: string }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function supprimer() {
    setEnCours(true);
    const r = await supprimerFiche(id).catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    router.push("/espace/permanents/fiches");
  }

  return (
    <div className="grid gap-2">
      {confirmer ? (
        <div role="alertdialog" aria-labelledby="confirmer-suppression" className="grid gap-2 rounded-xl bg-[var(--ecg-fond)] p-3">
          <b id="confirmer-suppression">Supprimer cette fiche, ses documents et ses photos ? C&apos;est définitif.</b>
          <div className="flex flex-wrap gap-2">
            <button type="button" autoFocus onClick={supprimer} disabled={enCours} className={`${BTN} ${BTN_PETIT} ecg-btn-danger`}>
              {enCours ? <IconeChargement size={15} /> : <Trash2 size={15} aria-hidden />} Supprimer
            </button>
            <button type="button" onClick={() => setConfirmer(false)} className={`${BTN} ${BTN_PETIT}`}>Annuler</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmer(true)} className={`${BTN} ecg-btn-fantome ecg-btn-fantome-danger`}>
          <Trash2 size={16} aria-hidden /> Supprimer la fiche
        </button>
      )}
      {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
    </div>
  );
}
