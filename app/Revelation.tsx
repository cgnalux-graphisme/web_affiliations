"use client";

import { useEffect, useRef } from "react";

/**
 * Révélation à l'entrée à l'écran, une seule fois : pose data-revelation="attente" puis "visible" sur
 * son conteneur ; les règles CSS de chaque section décident de ce qui bouge (pied de page : .pied-col ;
 * démarches : .demarche-entree, .demarche-bande).
 * Rendu serveur : tout est visible. Le masquage n'est posé que dans le navigateur, et seulement si le
 * bloc est encore hors de l'écran (pas de clignotement) et si le mouvement n'est pas réduit.
 */
export default function Revelation({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // déjà visible : pas d'animation

    el.dataset.revelation = "attente";
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting) return;
        el.dataset.revelation = "visible";
        observateur.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
