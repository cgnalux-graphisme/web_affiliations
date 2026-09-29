"use client";

import { isoToDateFr } from "../../lib/dates";
import { ouvrirReglagesCookies, useConsentement } from "../useConsentement";

/**
 * Page /cookies : le choix en cours (mis à jour en direct) et le bouton qui rouvre le pop-up,
 * en bas à gauche de l'écran — le texte le dit, sinon on croit que le bouton ne fait rien.
 */
export default function ChoixActuel() {
  const { pret, choix } = useConsentement();
  const date = choix ? isoToDateFr(choix.date.slice(0, 10)) : "";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-militant-ardoise p-5 sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite" className="text-lg leading-snug">
        <span className="block text-[15px] font-semibold uppercase tracking-wide">Votre choix actuel</span>
        <strong className="text-militant-bordeaux">
          {!pret
            ? "…"
            : !choix
              ? "Pas encore choisi"
              : choix.cartes
                ? `Tout accepté le ${date}`
                : `Refusé le ${date}`}
        </strong>
      </p>
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <button
          type="button"
          onClick={ouvrirReglagesCookies}
          className="inline-flex min-h-[48px] items-center rounded-xl bg-militant-bordeaux px-6 font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
        >
          Gérer mes cookies
        </button>
        <span className="text-[14px]">La fenêtre s&apos;ouvre en bas de l&apos;écran.</span>
      </div>
    </div>
  );
}
