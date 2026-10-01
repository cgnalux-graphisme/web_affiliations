"use client";

import React from "react";
import { Check } from "lucide-react";

/**
 * Charte commune des formulaires du site (affiliation, mandat SEPA, C1, C3.2, préavis, parcours de transfert).
 * Uniformisation visuelle du 01/10/2026 : en-tête bordeaux et indicateur d'étapes identiques partout.
 * Les champs, eux, sont harmonisés par la feuille de style (.formulaire dans app/globals.css).
 */

/** En-tête de formulaire : bandeau bordeaux, surtitre, grand titre condensé, sous-titre. */
export function EnteteFormulaire({
  surtitre,
  titre,
  sousTitre,
  icone,
  as: Balise = "h1",
}: {
  surtitre?: React.ReactNode;
  titre: React.ReactNode;
  sousTitre?: React.ReactNode;
  icone?: React.ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <header className="etape-entree flex items-start gap-4 rounded-2xl bg-militant-bordeaux px-6 py-6 text-white sm:px-8">
      {icone && (
        <span aria-hidden className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-white/40">
          {icone}
        </span>
      )}
      <div className="min-w-0">
        {surtitre && (
          <p className="font-condensed text-[15px] font-bold uppercase tracking-[0.12em] text-white">{surtitre}</p>
        )}
        <Balise className="mt-1 text-balance font-condensed text-3xl font-extrabold uppercase leading-[0.95] sm:text-[40px]">
          {titre}
        </Balise>
        {sousTitre && <p className="mt-2 text-[15px] leading-snug text-white">{sousTitre}</p>}
      </div>
    </header>
  );
}

/**
 * Indicateur d'étapes : pastilles numérotées reliées par un filet qui se remplit, puis « Étape 2 sur 6 · Adresse ».
 * `courant` commence à 0. Avec `onRevenir`, les étapes déjà faites sont cliquables (retour en arrière).
 */
export function EtapesFormulaire({
  libelles,
  courant,
  onRevenir,
  className = "",
}: {
  libelles: string[];
  courant: number;
  onRevenir?: (index: number) => void;
  className?: string;
}) {
  const total = libelles.length;
  return (
    <nav aria-label="Étapes du formulaire" className={className}>
      <ol className="flex items-center">
        {libelles.map((libelle, i) => {
          const fait = i < courant;
          const actif = i === courant;
          const cliquable = fait && Boolean(onRevenir);
          const pastille = (
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 font-condensed text-[17px] font-bold transition-all duration-300 ${
                actif
                  ? "scale-110 border-militant-bordeaux bg-militant-bordeaux text-white shadow-[0_0_0_4px_rgb(227_33_25_/_0.22)]"
                  : fait
                    ? "border-militant-bordeaux bg-militant-bordeaux text-white"
                    : "border-militant-ardoise bg-white text-militant-charbon"
              }`}
            >
              {fait ? <Check size={17} strokeWidth={3} aria-hidden /> : i + 1}
            </span>
          );
          return (
            <React.Fragment key={i}>
              <li className="flex shrink-0">
                {cliquable ? (
                  <button
                    type="button"
                    onClick={() => onRevenir?.(i)}
                    aria-label={`Revenir à l'étape ${i + 1} : ${libelle}`}
                    className="rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
                  >
                    {pastille}
                  </button>
                ) : (
                  <span aria-current={actif ? "step" : undefined} aria-label={`Étape ${i + 1} : ${libelle}${fait ? " (faite)" : ""}`}>
                    {pastille}
                  </span>
                )}
              </li>
              {i < total - 1 && (
                <li aria-hidden className="mx-1.5 h-[3px] flex-1 overflow-hidden rounded-full bg-militant-ardoise/35 sm:mx-2">
                  <span
                    className="block h-full origin-left rounded-full bg-militant-bordeaux transition-transform duration-500 ease-out"
                    style={{ transform: `scaleX(${fait ? 1 : 0})` }}
                  />
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-[15px]" aria-live="polite">
        <span className="font-condensed font-bold uppercase tracking-wide text-militant-bordeaux">
          Étape {courant + 1} sur {total}
        </span>
        <span className="font-semibold">{libelles[courant]}</span>
      </p>
    </nav>
  );
}
