"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Photo « vous avez du poids » : noir et blanc, découverte de bas en haut à son entrée à l'écran
 * (rideau), puis immobile. Mouvement réduit : affichée d'emblée.
 */
export function PhotoPoids({ url, alt }: { url: string; alt: string }) {
  const reduit = useReducedMotion();
  // Le conteneur observe l'écran : la photo entièrement masquée ne serait jamais « visible ».
  return (
    <motion.div initial="cache" whileInView="vu" viewport={{ once: true, amount: 0.35 }}>
      <motion.figure
        className="relative aspect-[4/3] w-full overflow-hidden bg-militant-ardoise md:aspect-[4/5]"
        variants={{ cache: { clipPath: "inset(100% 0% 0% 0%)" }, vu: { clipPath: "inset(0% 0% 0% 0%)" } }}
        transition={reduit ? { duration: 0 } : { duration: 1.2, ease: EASE }}
      >
        <Image
          src={url}
          alt={alt}
          fill
          sizes="(min-width: 768px) 40vw, 100vw"
          className="object-cover object-[45%_75%] contrast-[1.15] grayscale"
        />
      </motion.figure>
    </motion.div>
  );
}

/**
 * Photo de fond du bloc « Ensemble, on décide » : bichromie rouge / noir obtenue en posant la
 * photo en noir et blanc sur le rouge en mode « produit » (blanc → rouge, ombres → noir).
 * Elle glisse légèrement pendant le défilement (profondeur), immobile en mouvement réduit
 * (règle CSS `.photo-ensemble`).
 * Le parent doit être `relative isolate` avec un fond rouge.
 */
export function PhotoEnsemble({ url, alt }: { url: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {/* Le mode de fusion est porté par le bloc qui bouge : un élément transformé forme son propre groupe. */}
      <motion.div style={{ y }} className="photo-ensemble absolute inset-x-0 -inset-y-[8%] mix-blend-multiply">
        <Image
          src={url}
          alt={alt}
          fill
          sizes="100vw"
          className="object-cover object-[50%_70%] brightness-110 contrast-125 grayscale"
        />
      </motion.div>
      {/* Rouge plein derrière le texte (en haut sur mobile, où la section garde une zone photo sous
          le texte ; à gauche sur grand écran) : la photo ne vit que du côté opposé et ne gêne
          jamais la lecture. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#E32119_0%,#E32119_52%,rgba(227,33,25,0.5)_68%,rgba(227,33,25,0)_86%)] md:bg-[linear-gradient(90deg,#E32119_0%,#E32119_34%,rgba(227,33,25,0.6)_58%,rgba(227,33,25,0)_82%)]" />
    </div>
  );
}
