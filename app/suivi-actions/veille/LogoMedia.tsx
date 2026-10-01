"use client";

import { useEffect, useRef, useState } from "react";
import { domaineDe } from "../../../lib/logo-media-domaine";

/** Initiales d'un média (« RTBF Info » → « RT », « L'Avenir Belgique » → « LA »), si son logo manque. */
function initiales(nom: string): string {
  const mots = nom.replace(/[’']/g, " ").split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m));
  // Sigle en tête (« RTBF Info », « RTL ») : ses deux premières lettres.
  if (mots[0] && mots[0].length >= 2 && mots[0] === mots[0].toUpperCase()) return mots[0].slice(0, 2);
  if (mots.length >= 2) return (mots[0][0] + mots[1][0]).toUpperCase();
  return (mots[0] ?? "?").slice(0, 2).toUpperCase();
}

/**
 * Logo d'un média (icône de son site, servie par /api/logo-media), en pastille ronde.
 * Sans logo (site injoignable, pas d'icône) : les initiales du média. Décoratif : le nom est toujours écrit à côté.
 */
export default function LogoMedia({ lien, nom, taille = 24 }: { lien: string; nom: string | null; taille?: number }) {
  const domaine = domaineDe(lien);
  const [echec, setEchec] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // Une image en échec avant l'hydratation ne déclenche pas onError : on vérifie au montage.
  useEffect(() => {
    const i = img.current;
    if (i && i.complete && i.naturalWidth === 0) setEchec(true);
  }, []);
  const style = { width: taille, height: taille };
  if (!domaine || echec) {
    return (
      <span
        aria-hidden
        style={{ ...style, fontSize: Math.round(taille * 0.42) }}
        className="inline-flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-militant-ardoise font-bold leading-none"
      >
        {initiales(nom ?? domaine ?? "?")}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- petite icône servie par notre route, pas d'optimisation utile
    <img
      ref={img}
      src={`/api/logo-media?domaine=${encodeURIComponent(domaine)}`}
      alt=""
      aria-hidden
      width={taille}
      height={taille}
      loading="lazy"
      onError={() => setEchec(true)}
      style={style}
      className="shrink-0 rounded-full border border-militant-ardoise/60 bg-white object-contain"
    />
  );
}
