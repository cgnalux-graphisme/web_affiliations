"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie } from "lucide-react";
import { EVENEMENT_REGLAGES } from "../lib/consentement";
import { enregistrerChoix, useConsentement } from "./useConsentement";

/**
 * Pop-up de consentement réduit au strict minimum (demande de Fred, 29/09/2026) : « Vos cookies, vos choix »
 * avec l'icône, un petit lien « En savoir plus », « Refuser »
 * et « Tout accepter » (valide d'un coup toutes les catégories soumises à l'accord), même bouton pour les deux.
 * À l'ouverture du site tant que le visiteur n'a pas choisi (ou après 6 mois) ; non bloquant.
 * Rouvert par « Gérer les cookies » (pied de page, page /cookies). Masqué dans l'admin et sur la connexion.
 */
export default function ConsentementCookies() {
  const chemin = usePathname();
  const { pret, choix } = useConsentement();
  const [reglages, setReglages] = useState(false);
  const texte = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const ouvrir = () => setReglages(true);
    window.addEventListener(EVENEMENT_REGLAGES, ouvrir);
    return () => window.removeEventListener(EVENEMENT_REGLAGES, ouvrir);
  }, []);

  useEffect(() => {
    if (reglages) texte.current?.focus();
  }, [reglages]);

  const zonePrivee = chemin.startsWith("/suivi-actions") || chemin.startsWith("/login");
  if (!pret || !(reglages || (choix === null && !zonePrivee))) return null;

  function choisir(tout: boolean) {
    enregistrerChoix(tout);
    setReglages(false);
  }

  const bouton =
    "inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-militant-bordeaux px-4 font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2";

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-label="Cookies"
      className={`${reglages ? "consentement-rappel" : "consentement-entree"} fixed inset-x-3 bottom-3 z-[60] rounded-2xl border-2 border-militant-charbon bg-white p-4 font-barlow text-militant-charbon shadow-[0_24px_60px_-20px_rgba(34,34,34,0.45)] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[380px]`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          ref={texte}
          tabIndex={-1}
          className="flex items-center gap-2 font-condensed text-[22px] font-extrabold uppercase leading-none focus:outline-none"
        >
          <Cookie size={20} className="shrink-0 self-center text-militant-rouge" aria-hidden />
          Vos cookies, vos choix
        </p>
        <Link
          href="/cookies"
          className="shrink-0 text-[13px] font-semibold underline decoration-militant-rouge underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          En savoir plus
        </Link>
      </div>
      <div className="mt-3 flex gap-2.5">
        <button type="button" onClick={() => choisir(false)} className={bouton}>
          Refuser
        </button>
        <button type="button" onClick={() => choisir(true)} className={bouton}>
          Tout accepter
        </button>
      </div>
    </section>
  );
}
