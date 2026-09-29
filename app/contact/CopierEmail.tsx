"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Bouton « Copier l'adresse » (sur fond bordeaux) ; confirmation visible 2 s, annoncée aux lecteurs d'écran. */
export default function CopierEmail({ adresse }: { adresse: string }) {
  const [etat, setEtat] = useState<"repos" | "copie" | "echec">("repos");

  useEffect(() => {
    if (etat === "repos") return;
    const t = setTimeout(() => setEtat("repos"), 2000);
    return () => clearTimeout(t);
  }, [etat]);

  async function copier() {
    try {
      await navigator.clipboard.writeText(adresse);
      setEtat("copie");
    } catch {
      setEtat("echec");
    }
  }

  return (
    <button
      type="button"
      onClick={copier}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-white/70 px-4 font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-militant-bordeaux"
    >
      {etat === "copie" ? <Check size={18} aria-hidden className="liste-fondu" /> : <Copy size={18} aria-hidden />}
      <span aria-live="polite">
        {etat === "copie" ? "Adresse copiée" : etat === "echec" ? "Copie impossible : sélectionnez l'adresse" : "Copier l'adresse"}
      </span>
    </button>
  );
}
