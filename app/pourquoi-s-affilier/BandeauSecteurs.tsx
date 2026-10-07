"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { Fragment, useRef } from "react";

const SECTEURS = ["Construction", "Nettoyage", "Gardiennage", "Chimie", "Bois", "Verre", "Intérim"];

/**
 * Banderole des secteurs : bande rouge penchée, comme une banderole de manifestation, dont le
 * texte avance avec le défilement de la page, jamais tout seul (immobile en mouvement réduit :
 * règle CSS `.defile-secteurs`). Décorative : les secteurs sont repris dans le texte qui suit.
 */
export default function BandeauSecteurs() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // La piste contient deux fois la liste : on la fait glisser d'un quart de sa largeur pendant la traversée.
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);

  return (
    <div ref={ref} aria-hidden className="py-[clamp(24px,4vw,56px)]">
      {/* Plus large que l'écran pour que la pente ne découvre jamais les bords. */}
      <div className="-mx-[5vw] -rotate-[2.5deg] overflow-hidden bg-militant-rouge py-3 md:py-4">
        <motion.div style={{ x }} className="defile-secteurs flex w-max items-center will-change-transform">
          {[...SECTEURS, ...SECTEURS].map((s, i) => (
            <Fragment key={i}>
              <span className="whitespace-nowrap font-condensed text-[clamp(3rem,8vw,7rem)] font-extrabold uppercase leading-none text-white">
                {s}
              </span>
              {/* Séparateur : petit encart incliné, comme celui du logo. */}
              <span className="mx-[0.35em] h-[clamp(14px,2vw,26px)] w-[clamp(22px,3vw,40px)] shrink-0 -skew-x-[10deg] bg-militant-bordeaux" />
            </Fragment>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
