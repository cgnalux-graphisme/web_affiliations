"use client";

import { IconeChargement } from "../../Chargement";

/**
 * Interrupteur marche / arrêt (vrai bouton role="switch"). Le libellé d'état est toujours écrit à côté :
 * la couleur n'est jamais le seul signal.
 */
export default function Interrupteur({
  actif,
  onChange,
  label,
  etatOn = "Oui",
  etatOff = "Non",
  enCours = false,
  disabled = false,
}: {
  actif: boolean;
  onChange: (actif: boolean) => void;
  /** Nom accessible (ex. « Mettre en avant : Grève du 14/10/2026 »). */
  label: string;
  etatOn?: string;
  etatOff?: string;
  enCours?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={label}
      onClick={() => onChange(!actif)}
      disabled={disabled || enCours}
      className="ecg-interrupteur"
    >
      <span aria-hidden className="ecg-interrupteur-piste">
        <span className="ecg-interrupteur-bille">{enCours && <IconeChargement size={12} className="text-militant-charbon" />}</span>
      </span>
      <span>{actif ? etatOn : etatOff}</span>
    </button>
  );
}
