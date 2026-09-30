"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cookie } from "lucide-react";
import { TOUT_ACCEPTE, TOUT_REFUSE } from "../lib/consentement";
import { enregistrerChoix, useConsentement } from "./useConsentement";

/**
 * Pop-up de consentement réduit au strict minimum (demande de Fred, 29/09/2026) : « Vos cookies, vos choix »
 * avec l'icône, un petit lien « En savoir plus » vers les réglages détaillés de /cookies, « Refuser » et
 * « Tout accepter » (toutes les catégories d'un coup), même bouton pour les deux.
 * À l'ouverture du site tant que le visiteur n'a pas choisi (ou après 6 mois) ; non bloquant.
 * Masqué sur /cookies (les réglages y sont), dans l'admin et sur la connexion.
 */
export default function ConsentementCookies() {
  const chemin = usePathname();
  const { pret, choix } = useConsentement();

  const masque = chemin === "/cookies" || chemin.startsWith("/suivi-actions") || chemin.startsWith("/login");
  if (!pret || choix !== null || masque) return null;

  const bouton =
    "inline-flex min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-xl bg-militant-bordeaux px-2 text-[15px] font-bold sm:px-4 sm:text-base text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2";

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="consentement-titre"
      className="consentement-entree fixed inset-x-3 bottom-3 z-[60] rounded-2xl border-2 border-militant-charbon bg-white p-4 font-barlow text-militant-charbon shadow-[0_24px_60px_-20px_rgba(34,34,34,0.45)] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[380px]"
    >
      <div className="flex items-center justify-between gap-3">
        <p
          id="consentement-titre"
          className="flex items-center gap-2 font-condensed text-[22px] font-extrabold uppercase leading-none"
        >
          <Cookie size={20} className="shrink-0 text-militant-rouge" aria-hidden />
          Vos cookies, vos choix
        </p>
        <Link
          href="/cookies#reglages"
          className="shrink-0 text-[13px] font-semibold underline decoration-militant-rouge underline-offset-4 hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
        >
          En savoir plus
        </Link>
      </div>
      <div className="mt-3 flex gap-2.5">
        <button type="button" onClick={() => enregistrerChoix(TOUT_REFUSE)} className={bouton}>
          Refuser
        </button>
        <button type="button" onClick={() => enregistrerChoix(TOUT_ACCEPTE)} className={bouton}>
          Tout accepter
        </button>
      </div>
    </section>
  );
}
