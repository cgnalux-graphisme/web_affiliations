"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";

/**
 * Phrase de transition : ses mots s'allument un à un au fil du défilement, comme le poids
 * qui s'ajoute. Les mots `accent` finissent en rouge. Mouvement réduit : phrase allumée d'emblée
 * (règle CSS `.pivot-mot`, même rendu serveur dans tous les cas).
 */
export default function PhrasePivot({ texte, accent, id }: { texte: string; accent: string[]; id: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "start 0.35"] });
  const mots = texte.split(" ");

  return (
    <h2
      ref={ref}
      id={id}
      className="max-w-[16ch] font-condensed text-[clamp(2.6rem,5.6vw,5rem)] font-extrabold uppercase leading-[0.95] [text-wrap:balance]"
    >
      {mots.map((mot, i) => (
        <Mot
          key={i}
          mot={mot}
          progression={scrollYProgress}
          debut={i / mots.length}
          fin={(i + 1) / mots.length}
          rouge={accent.includes(mot.replace(/[.,]/g, ""))}
          dernier={i === mots.length - 1}
        />
      ))}
    </h2>
  );
}

function Mot({
  mot,
  progression,
  debut,
  fin,
  rouge,
  dernier,
}: {
  mot: string;
  progression: MotionValue<number>;
  debut: number;
  fin: number;
  rouge: boolean;
  dernier: boolean;
}) {
  // Pâle (éteint) → couleur finale ; opacité seulement, rien ne se déplace.
  const opacite = useTransform(progression, [debut, fin], [0.18, 1]);
  return (
    <>
      <motion.span style={{ opacity: opacite }} className={`pivot-mot ${rouge ? "text-militant-rouge" : "text-militant-charbon"}`}>
        {mot}
      </motion.span>
      {!dernier && " "}
    </>
  );
}
