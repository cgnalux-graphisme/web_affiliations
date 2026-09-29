"use client";

import { ouvrirReglagesCookies } from "./useConsentement";

/** « Gérer les cookies » : rouvre le pop-up de consentement. Le style vient de la page qui l'utilise. */
export default function BoutonReglagesCookies({ className, children = "Gérer les cookies" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={ouvrirReglagesCookies} className={className}>
      {children}
    </button>
  );
}
