/**
 * Indicateur de chargement du site : cercle « loop out » (l'arc s'allonge, fait le tour et se rétracte).
 * Animations dans app/globals.css (.chargement-*), coupées si « réduire les animations » est actif.
 * Sans état ni effet : utilisable dans les composants serveur comme client.
 */

const R = 20; // circonférence ≈ 126 (valeurs des keyframes)

/**
 * Petite icône, à la place d'une icône dans un bouton ou devant un texte « … en cours ».
 * L'arc prend la couleur du texte (blanc sur un bouton bordeaux, rouge avec text-militant-rouge),
 * l'anneau de fond la même couleur, atténuée. Décorative : le texte à côté dit ce qui se passe.
 */
export function IconeChargement({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      aria-hidden
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <circle cx="25" cy="25" r={R} stroke="currentColor" strokeOpacity="0.25" strokeWidth="6" />
      <g className="chargement-tour">
        <circle
          className="chargement-arc"
          cx="25"
          cy="25"
          r={R}
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="90 126"
          transform="rotate(-90 25 25)"
        />
      </g>
    </svg>
  );
}

/**
 * Grand indicateur, pour une page ou un bloc entier qui se charge : anneau rouge atténué,
 * arc rouge « loop out » et arc bordeaux intérieur en sens inverse, avec un texte lisible.
 */
export function EcranChargement({ texte = "Chargement…", compact = false }: { texte?: string; compact?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-5 text-center font-barlow text-militant-charbon ${
        compact ? "py-10" : "min-h-[50vh] py-16"
      }`}
    >
      <svg width={compact ? 56 : 88} height={compact ? 56 : 88} viewBox="0 0 50 50" fill="none" aria-hidden focusable="false">
        <circle cx="25" cy="25" r={R} stroke="#E32119" strokeOpacity="0.18" strokeWidth="5" />
        <g className="chargement-tour">
          <circle
            className="chargement-arc"
            cx="25"
            cy="25"
            r={R}
            stroke="#E32119"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="90 126"
            transform="rotate(-90 25 25)"
          />
        </g>
        {/* Arc intérieur bordeaux, en sens inverse (r = 12 : mêmes proportions à l'échelle 0,6). */}
        <g className="chargement-tour-inverse">
          <circle
            className="chargement-arc-decale"
            cx="25"
            cy="25"
            r={R}
            stroke="#AA0F33"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="90 126"
            transform="translate(10 10) scale(0.6) rotate(-90 25 25)"
          />
        </g>
      </svg>
      <p className={`font-condensed font-extrabold ${compact ? "text-xl" : "text-2xl"}`}>{texte}</p>
    </div>
  );
}
