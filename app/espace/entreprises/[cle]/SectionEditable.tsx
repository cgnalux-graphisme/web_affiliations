"use client";

import { useState, type ReactNode } from "react";
import { Pencil, X } from "lucide-react";
import { BTN, BTN_PETIT, Panneau } from "../../_partage/ui";

/**
 * Section de la fiche : lecture d'abord, formulaire seulement à la demande (« Modifier »).
 * `edition` reçoit `fermer`, à appeler après un enregistrement réussi.
 */
export default function SectionEditable({
  id,
  titre,
  sousTitre,
  actions,
  lecture,
  edition,
  corps = true,
  libelleModifier = "Modifier",
}: {
  id?: string;
  titre: ReactNode;
  sousTitre?: ReactNode;
  actions?: ReactNode;
  lecture: ReactNode;
  edition?: (fermer: () => void) => ReactNode;
  corps?: boolean;
  libelleModifier?: string;
}) {
  const [edite, setEdite] = useState(false);
  return (
    <Panneau
      id={id}
      className="ecg-section"
      titre={titre}
      sousTitre={sousTitre}
      corps={corps}
      actions={
        <>
          {actions}
          {edition && (
            <button type="button" className={`${BTN} ${BTN_PETIT}`} aria-expanded={edite} onClick={() => setEdite(!edite)}>
              {edite ? <X size={15} aria-hidden /> : <Pencil size={15} aria-hidden />}
              {edite ? "Fermer" : libelleModifier}
            </button>
          )}
        </>
      }
    >
      {edite && edition ? <div className={corps ? "" : "px-5 py-4"}>{edition(() => setEdite(false))}</div> : lecture}
    </Panneau>
  );
}
