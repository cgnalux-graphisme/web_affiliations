"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, RotateCcw, Save } from "lucide-react";
import type { GenreCourrier } from "../../../../../lib/liberations/courriers";
import { enregistrerTexte } from "../../courriers-actions";
import { IconeChargement } from "../../../../Chargement";
import { PanneauLateral } from "../../../_partage/Fenetres";
import { AIDE, BTN, BTN_PETIT, BTN_PRINCIPAL, CHAMP } from "../../../_partage/ui";

/**
 * Retoucher le texte d'un courrier pour un seul participant, avant l'envoi. Le texte retouché ne suit plus le dossier
 * (dates, lieu…) : « Revenir au modèle » le recalcule.
 */
export default function TexteCourrier({ participantId, nom, genre, libelle, texte, retouche }: {
  participantId: string; nom: string; genre: GenreCourrier; libelle: string; texte: string; retouche: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [valeur, setValeur] = useState(texte);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function enregistrer(corps: string | null, fermer: () => void) {
    setEnCours(true);
    setErreur("");
    const r = await enregistrerTexte(participantId, genre, corps).catch(() => ({ ok: false as const, erreur: "Le serveur n'a pas répondu. Réessayez." }));
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    fermer();
    router.refresh();
  }

  return (
    <>
      <button type="button" className={`${BTN} ${BTN_PETIT}`} onClick={() => { setValeur(texte); setOuvert(true); }}>
        <PencilLine size={15} aria-hidden /> Texte{retouche ? " (retouché)" : ""}<span className="sr-only"> : {libelle}, {nom}</span>
      </button>
      <PanneauLateral ouvert={ouvert} onFermer={() => setOuvert(false)} titre={libelle} sousTitre={`Pour ${nom} seulement. Le reste de la mise en page ne change pas.`}
        pied={(fermer) => (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={BTN_PRINCIPAL} disabled={enCours || !valeur.trim()} onClick={() => enregistrer(valeur, fermer)}>
              {enCours ? <IconeChargement size={16} /> : <Save size={16} aria-hidden />} Enregistrer
            </button>
            {retouche && (
              <button type="button" className={BTN} disabled={enCours} onClick={() => enregistrer(null, fermer)}>
                <RotateCcw size={16} aria-hidden /> Revenir au modèle
              </button>
            )}
            {erreur && <p role="alert" className="ecg-erreur">{erreur}</p>}
          </div>
        )}>
        <div className="grid gap-2">
          <label htmlFor={`texte-${participantId}-${genre}`} className="sr-only">Texte du courrier</label>
          <textarea id={`texte-${participantId}-${genre}`} className={`${CHAMP} min-h-[420px] leading-relaxed`} value={valeur}
            onChange={(e) => setValeur(e.target.value)} data-focus-initial />
          <p className={AIDE}>Une ligne vide sépare deux paragraphes. Un texte retouché ne suit plus les changements du dossier (dates, lieu…).</p>
        </div>
      </PanneauLateral>
    </>
  );
}
