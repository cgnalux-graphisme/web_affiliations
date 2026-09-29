"use client";

import { IconeChargement } from "../Chargement";

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
      className="group inline-flex min-h-[44px] items-center gap-2.5 rounded-xl pr-1 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:opacity-60"
    >
      <span
        aria-hidden
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
          actif ? "bg-militant-bordeaux" : "bg-militant-ardoise"
        }`}
      >
        <span
          className={`absolute left-1 grid h-5 w-5 place-items-center rounded-full bg-white shadow-[0_1px_3px_rgba(34,34,34,0.35)] transition-transform duration-200 motion-reduce:transition-none ${
            actif ? "translate-x-5" : "translate-x-0"
          }`}
        >
          {enCours && <IconeChargement size={12} className="text-militant-rouge" />}
        </span>
      </span>
      <span className={actif ? "text-militant-bordeaux" : ""}>{actif ? etatOn : etatOff}</span>
    </button>
  );
}
