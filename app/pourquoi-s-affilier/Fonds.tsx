"use client";

import { motion, useMotionTemplate, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/*
 * Fonds animés de la page « Pourquoi s’affilier ». Tous suivent le défilement (rien ne bouge tout
 * seul) et reprennent l'inclinaison de 10° de l'encart « FGTB » du logo. Mouvement réduit : état
 * final d'emblée, par des règles CSS (`.biseau-lumiere`, `.rayures-prime`), même rendu serveur.
 */

/**
 * La lumière entre : sous l'ouverture sombre, un biais charbon dont le bord bascule pendant le
 * défilement, de l'horizontale à 10°. La suite de la page est sur fond blanc.
 * Hauteur = tan(10°) × largeur, pour un angle juste à toutes les largeurs.
 */
export function BiseauLumiere() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end 0.35"] });
  // Coin bas droit : de 100 % (rectangle sombre plein) à 0 % (triangle, bord à 10°).
  const coin = useTransform(scrollYProgress, [0, 1], [100, 0]);
  const forme = useMotionTemplate`polygon(0 0, 100% 0, 100% ${coin}%, 0 100%)`;
  return (
    <motion.div
      ref={ref}
      aria-hidden
      style={{ clipPath: forme }}
      className="biseau-lumiere h-[17.63vw] w-full bg-militant-charbon"
    />
  );
}

/**
 * Bande bordeaux en biais (bords haut et bas à 10°) traversée de fines rayures claires qui
 * glissent avec le défilement. Contenu en blanc.
 */
export function BandePrime({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const decalage = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const position = useMotionTemplate`${decalage}px 0`;
  return (
    <div
      ref={ref}
      className="relative isolate bg-militant-bordeaux text-white [clip-path:polygon(0_8.8vw,100%_0,100%_calc(100%-8.8vw),0_100%)]"
    >
      <motion.div
        aria-hidden
        style={{ backgroundPosition: position }}
        className="rayures-prime absolute inset-0 -z-10 bg-[repeating-linear-gradient(100deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_2px,transparent_2px,transparent_44px)]"
      />
      {children}
    </div>
  );
}
