"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Bloc qui monte en fondu une seule fois à son entrée à l'écran (`delai` en secondes pour un
 * enchaînement). Mouvement réduit : affiché d'un coup, sans transition.
 * Même rendu serveur dans les deux cas (pas d'écart d'hydratation) : seule la durée change.
 */
export function Apparition({
  children,
  delai = 0,
  className,
}: {
  children: ReactNode;
  delai?: number;
  className?: string;
}) {
  const reduit = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={reduit ? { duration: 0 } : { duration: 0.8, delay: delai, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Grand chiffre qui sort de sa ligne (masque) à l'entrée à l'écran. */
export function Surgissement({ children, className }: { children: ReactNode; className?: string }) {
  const reduit = useReducedMotion();
  return (
    // Le masque observe l'écran (le chiffre, sous son masque, ne serait jamais « visible ») et
    // transmet l'état à son enfant.
    <motion.span
      className={`block overflow-hidden ${className ?? ""}`}
      initial="cache"
      whileInView="vu"
      viewport={{ once: true, amount: 0.5 }}
    >
      <motion.span
        className="block"
        variants={{ cache: { y: "100%" }, vu: { y: "0%" } }}
        transition={reduit ? { duration: 0 } : { duration: 1, ease: EASE }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

/** Filet qui se trace de gauche à droite à l'entrée à l'écran (hauteur et couleur par `className`). */
export function Filet({ className }: { className?: string }) {
  const reduit = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`origin-left ${className ?? ""}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 1 }}
      transition={reduit ? { duration: 0 } : { duration: 1.1, ease: EASE }}
    />
  );
}
