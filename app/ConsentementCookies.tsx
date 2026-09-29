"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Cookie } from "lucide-react";
import { EVENEMENT_REGLAGES } from "../lib/consentement";
import { enregistrerChoix, useConsentement } from "./useConsentement";

/**
 * Pop-up de consentement, à l'ouverture du site tant que le visiteur n'a pas choisi (ou après 6 mois).
 * Non bloquant (le site reste utilisable, pas de voile sombre) ; « Refuser » aussi visible et aussi simple
 * qu'« Accepter » (même bouton). Rouvert par « Gérer les cookies » (pied de page, page /cookies).
 * Masqué dans l'espace admin et sur la connexion (aucun contenu tiers).
 */
export default function ConsentementCookies() {
  const chemin = usePathname();
  const { pret, choix } = useConsentement();
  const [reglages, setReglages] = useState(false); // rouvert à la demande
  const [details, setDetails] = useState(false);
  const [cartes, setCartes] = useState(false);
  const titre = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const ouvrir = () => {
      setReglages(true);
      setDetails(true);
    };
    window.addEventListener(EVENEMENT_REGLAGES, ouvrir);
    return () => window.removeEventListener(EVENEMENT_REGLAGES, ouvrir);
  }, []);

  // À la réouverture : l'interrupteur reprend le choix en cours, le focus va au pop-up.
  useEffect(() => {
    if (!reglages) return;
    setCartes(choix?.cartes ?? false);
    titre.current?.focus();
  }, [reglages, choix]);

  const zonePrivee = chemin.startsWith("/suivi-actions") || chemin.startsWith("/login");
  const visible = pret && (reglages || (choix === null && !zonePrivee));
  if (!visible) return null;

  function choisir(valeur: boolean) {
    enregistrerChoix(valeur);
    setReglages(false);
    setDetails(false);
  }

  const bouton =
    "inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-militant-bordeaux px-5 font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2";

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="consentement-titre"
      aria-describedby="consentement-texte"
      className="consentement-entree fixed inset-x-3 bottom-3 z-[60] max-h-[calc(100vh-24px)] overflow-y-auto rounded-2xl border-2 border-militant-charbon bg-white font-barlow text-militant-charbon shadow-[0_24px_60px_-20px_rgba(34,34,34,0.45)] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[440px]"
    >
      <div aria-hidden className="h-1 bg-militant-rouge" />
      <div className="p-5 sm:p-6">
        <h2
          id="consentement-titre"
          ref={titre}
          tabIndex={-1}
          className="flex items-center gap-2.5 font-condensed text-[26px] font-extrabold uppercase leading-none focus:outline-none"
        >
          <Cookie size={24} className="shrink-0 text-militant-rouge" aria-hidden />
          Vos cookies, votre choix
        </h2>
        <p id="consentement-texte" className="mt-3 text-[16px] leading-relaxed">
          Ce site n&apos;utilise que les cookies indispensables à son fonctionnement. Avec votre accord, nous affichons
          aussi les <strong>cartes Google Maps</strong> de nos bureaux : Google peut alors déposer ses propres cookies.
          Pas de publicité, pas de mesure d&apos;audience.
        </p>

        <button
          type="button"
          aria-expanded={details}
          aria-controls="consentement-details"
          onClick={() => setDetails((d) => !d)}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 font-bold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          Personnaliser
          <ChevronDown
            size={18}
            aria-hidden
            className={`transition-transform duration-200 motion-reduce:transition-none ${details ? "rotate-180" : ""}`}
          />
        </button>

        {details && (
          <div id="consentement-details" className="liste-fondu mt-2 divide-y divide-militant-ardoise border-y border-militant-ardoise">
            <Ligne
              titre="Indispensables"
              texte="Mémoriser votre choix, garder la session des administrateurs. Toujours actifs."
            >
              <Interrupteur actif desactive libelle="Cookies indispensables, toujours actifs" />
            </Ligne>
            <Ligne titre="Cartes Google Maps" texte="Page Contact : les cartes de nos 4 bureaux s'affichent directement.">
              <Interrupteur actif={cartes} onChange={setCartes} libelle="Autoriser les cartes Google Maps" />
            </Ligne>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          {details ? (
            <button type="button" onClick={() => choisir(cartes)} className={bouton}>
              Enregistrer mes choix
            </button>
          ) : (
            <>
              <button type="button" onClick={() => choisir(false)} className={bouton}>
                Refuser
              </button>
              <button type="button" onClick={() => choisir(true)} className={bouton}>
                Accepter
              </button>
            </>
          )}
        </div>
        <p className="mt-3 text-[14px]">
          Modifiable à tout moment via « Gérer les cookies » en bas de page.{" "}
          <Link
            href="/cookies"
            className="font-semibold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
          >
            Politique cookies
          </Link>
        </p>
      </div>
    </section>
  );
}

function Ligne({ titre, texte, children }: { titre: string; texte: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="font-bold">{titre}</p>
        <p className="text-[14px] leading-snug">{texte}</p>
      </div>
      {children}
    </div>
  );
}

/** Interrupteur accessible (role="switch"), 44 px de cible. */
function Interrupteur({
  actif,
  desactive = false,
  libelle,
  onChange,
}: {
  actif: boolean;
  desactive?: boolean;
  libelle: string;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      disabled={desactive}
      onClick={() => onChange?.(!actif)}
      className="grid min-h-[44px] min-w-[56px] shrink-0 place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:cursor-not-allowed"
    >
      <span
        aria-hidden
        className={`relative h-7 w-12 rounded-full border-2 transition-colors duration-200 motion-reduce:transition-none ${
          actif ? "border-militant-bordeaux bg-militant-bordeaux" : "border-militant-charbon bg-white"
        } ${desactive ? "opacity-60" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full transition-transform duration-200 motion-reduce:transition-none ${
            actif ? "left-0.5 translate-x-5 bg-white" : "left-0.5 bg-militant-charbon"
          }`}
        />
      </span>
    </button>
  );
}
