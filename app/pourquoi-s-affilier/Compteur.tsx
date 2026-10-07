"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";
import { formatNombre, mouvementReduit } from "../../lib/pourquoi-s-affilier";

/**
 * Chiffre qui monte de 0 à sa valeur une seule fois, à son entrée à l'écran.
 * Rendu serveur = valeur finale (sans JavaScript ou en mouvement réduit, rien ne bouge).
 * Le chiffre est décoratif (aria-hidden) : la page donne la valeur en texte à côté.
 */
export default function Compteur({ valeur, className }: { valeur: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const arme = useRef(false);
  const vu = useInView(ref, { once: true, amount: 0.6 });

  // Remise à zéro seulement si le chiffre est encore sous la ligne de flottaison : jamais de saut visible.
  useEffect(() => {
    const el = ref.current;
    if (!el || mouvementReduit()) return;
    if (el.getBoundingClientRect().top > window.innerHeight) {
      el.textContent = "0";
      arme.current = true;
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!vu || !el || !arme.current) return;
    arme.current = false;
    const controle = animate(0, valeur, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = formatNombre(Math.round(v));
      },
    });
    return () => {
      controle.stop();
      el.textContent = formatNombre(valeur);
    };
  }, [vu, valeur]);

  return (
    <span ref={ref} aria-hidden className={className}>
      {formatNombre(valeur)}
    </span>
  );
}
