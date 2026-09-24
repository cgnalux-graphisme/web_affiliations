"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ancreUne } from "../../lib/actions";
import { isoToDateFr } from "../../lib/dates";

export type JalonFrise = { id: string; date: string; titre: string; type: string };

const MARGE = 48; // espace à gauche/droite de l'axe (px)
const ECART_MIN = 40; // distance minimale entre deux dates voisines (px)
const EMPILEMENT = 20; // décalage vertical entre actions du même jour (px)
const AXE_Y = 80; // position verticale de l'axe dans la frise (px)
const HAUTEUR = 124;
const JOUR = 86_400_000;

const jours = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / JOUR;


function prefereMoinsDAnimations() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Fait défiler jusqu'à la une et la met brièvement en avant. */
function allerALaUne(id: string, mettreAJourUrl = true) {
  const el = document.getElementById(ancreUne(id));
  if (!el) return;
  el.scrollIntoView({ behavior: prefereMoinsDAnimations() ? "auto" : "smooth", block: "start" });
  el.classList.remove("une-en-avant");
  void el.offsetWidth; // relance l'animation si on clique deux fois
  el.classList.add("une-en-avant");
  if (mettreAJourUrl) history.replaceState(null, "", `#${ancreUne(id)}`);
}

/**
 * Frise chronologique horizontale : un jalon par action, placé selon sa date
 * (avec un écart minimal pour rester lisible quand les dates sont proches).
 * Survol / focus = nom de l'action ; clic = défilement jusqu'à la une.
 */
export default function FriseActions({ jalons }: { jalons: JalonFrise[] }) {
  const defileur = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState<number | null>(null);
  const [debordeGauche, setDebordeGauche] = useState(false);
  const [debordeDroite, setDebordeDroite] = useState(false);

  // Largeur visible, suivie au redimensionnement.
  useEffect(() => {
    const el = defileur.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargeur(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plan = useMemo(() => {
    if (largeur === null || jalons.length === 0) return null;

    // Dates distinctes, de la plus ancienne à la plus récente.
    const dates = [...new Set(jalons.map((j) => j.date))].sort();
    const t = dates.map(jours);
    // Échelle proportionnelle au temps, élargie quand il y a beaucoup d'actions ;
    // l'écart minimal ne sert alors qu'aux dates très rapprochées.
    const utile = Math.max(largeur - 2 * MARGE, (dates.length - 1) * 64, 1);
    const etendue = t[t.length - 1] - t[0];

    const x: number[] = [];
    t.forEach((ti, i) => {
      const lineaire = etendue === 0 ? largeur / 2 : MARGE + ((ti - t[0]) / etendue) * utile;
      x.push(i === 0 ? lineaire : Math.max(lineaire, x[i - 1] + ECART_MIN));
    });
    const total = Math.max(largeur, x[x.length - 1] + MARGE);

    // Position d'une date quelconque : interpolation entre les jalons voisins.
    const position = (j: number): number | null => {
      if (j < t[0] || j > t[t.length - 1]) return null;
      const i = t.findIndex((ti, k) => ti <= j && j <= (t[k + 1] ?? ti));
      if (t[i + 1] === undefined || t[i + 1] === t[i]) return x[i];
      return x[i] + ((j - t[i]) / (t[i + 1] - t[i])) * (x[i + 1] - x[i]);
    };

    // Graduations : 1er janvier (années) et 1er du mois (mm/aaaa) quand il y a la place.
    const graduations: { x: number; libelle: string; annee: boolean }[] = [];
    const [a0, m0] = [+dates[0].slice(0, 4), +dates[0].slice(5, 7)];
    // Repère de départ : le mois de la première action, sous son jalon.
    graduations.push({ x: x[0], libelle: `${String(m0).padStart(2, "0")}/${a0}`, annee: false });
    let derniereEtiquette = x[0];
    for (let a = a0, m = m0 + 1; ; m++) {
      if (m > 12) {
        a++;
        m = 1;
      }
      const iso = `${a}-${String(m).padStart(2, "0")}-01`;
      if (jours(iso) > t[t.length - 1]) break;
      const px = position(jours(iso));
      if (px === null) continue;
      const annee = m === 1;
      if (annee || px - derniereEtiquette >= 72) {
        graduations.push({ x: px, libelle: annee ? String(a) : `${String(m).padStart(2, "0")}/${a}`, annee });
        derniereEtiquette = px;
      }
    }

    const parDate = new Map(dates.map((d, i) => [d, x[i]]));
    const rangDuJour = new Map<string, number>();
    const points = [...jalons]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((j) => {
        const rang = rangDuJour.get(j.date) ?? 0;
        rangDuJour.set(j.date, rang + 1);
        return { ...j, x: parDate.get(j.date)!, y: AXE_Y - rang * EMPILEMENT };
      });

    return { total, graduations, points };
  }, [largeur, jalons]);

  const majDebordements = useCallback(() => {
    const el = defileur.current;
    if (!el) return;
    setDebordeGauche(el.scrollLeft > 4);
    setDebordeDroite(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // Au premier affichage : on montre les actions les plus récentes (à droite).
  const premierCalage = useRef(false);
  useLayoutEffect(() => {
    const el = defileur.current;
    if (!el || !plan) return;
    if (!premierCalage.current) {
      el.scrollLeft = el.scrollWidth;
      premierCalage.current = true;
    }
    majDebordements();
  }, [plan, majDebordements]);

  // Lien direct vers une une (#une-…) : on la met en avant à l'arrivée.
  useEffect(() => {
    const ancre = window.location.hash.slice(1);
    if (ancre.startsWith("une-")) allerALaUne(ancre.slice(4), false);
  }, []);

  function defiler(sens: -1 | 1) {
    const el = defileur.current;
    if (!el) return;
    el.scrollBy({ left: sens * el.clientWidth * 0.7, behavior: prefereMoinsDAnimations() ? "auto" : "smooth" });
  }

  if (jalons.length === 0) return null;

  return (
    <nav aria-label="Frise chronologique des actions" className="relative mt-6">
      <div
        ref={defileur}
        onScroll={majDebordements}
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-color:#7C90A0_transparent] [scrollbar-width:thin]"
      >
        <div className="relative" style={{ width: plan?.total ?? "100%", height: HAUTEUR }}>
          {plan && (
            <>
              {/* Axe */}
              <div
                aria-hidden
                className="frise-anim absolute h-[3px] origin-left bg-militant-ardoise"
                style={{ left: MARGE / 2, width: plan.total - MARGE, top: AXE_Y - 1, animation: "frise-trace 700ms ease-out both" }}
              />
              {/* Graduations */}
              {plan.graduations.map((g) => (
                <div key={g.libelle} aria-hidden className="absolute" style={{ left: g.x, top: AXE_Y }}>
                  <span className={`absolute -translate-x-1/2 bg-militant-ardoise ${g.annee ? "h-3 w-[3px]" : "h-2 w-px"}`} />
                  <span
                    className={`absolute top-4 -translate-x-1/2 whitespace-nowrap font-condensed ${
                      g.annee ? "text-lg font-bold text-white" : "text-sm font-semibold text-militant-ardoise"
                    }`}
                  >
                    {g.libelle}
                  </span>
                </div>
              ))}
              {/* Jalons */}
              {plan.points.map((p, i) => {
                const bord = p.x < 130 ? "gauche" : p.x > plan.total - 130 ? "droite" : "centre";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => allerALaUne(p.id)}
                    aria-label={`${p.titre}, ${isoToDateFr(p.date)} : aller à l'action`}
                    className="frise-anim group absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus:outline-none"
                    style={{
                      left: p.x,
                      top: p.y,
                      animation: `frise-jalon 380ms ease-out ${250 + Math.min(i, 20) * 40}ms both`,
                    }}
                  >
                    <span className="block h-3.5 w-3.5 rounded-full bg-militant-rouge ring-[3px] ring-militant-charbon transition-transform duration-200 group-hover:scale-150 group-focus-visible:scale-150 group-focus-visible:ring-white motion-reduce:transition-none" />
                    <span
                      role="tooltip"
                      className={`pointer-events-none absolute bottom-full mb-1 w-max max-w-[15rem] bg-white px-3 py-2 text-left text-militant-charbon opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 ${
                        bord === "gauche" ? "left-0" : bord === "droite" ? "right-0" : "left-1/2 -translate-x-1/2"
                      }`}
                    >
                      <span className="block font-condensed text-base font-bold tabular-nums">{isoToDateFr(p.date)}</span>
                      <span className="block whitespace-normal text-sm font-semibold leading-snug">{p.titre}</span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Flèches de défilement (quand la frise déborde) */}
      {debordeGauche && (
        <BoutonDefilement sens={-1} onClick={() => defiler(-1)} />
      )}
      {debordeDroite && (
        <BoutonDefilement sens={1} onClick={() => defiler(1)} />
      )}
    </nav>
  );
}

function BoutonDefilement({ sens, onClick }: { sens: -1 | 1; onClick: () => void }) {
  const gauche = sens === -1;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={gauche ? "Actions plus anciennes" : "Actions plus récentes"}
      className={`absolute top-[80px] hidden -translate-y-1/2 bg-militant-charbon p-1.5 text-white ring-2 ring-militant-ardoise transition-colors hover:bg-militant-bordeaux focus:outline-none focus-visible:ring-white sm:block ${
        gauche ? "left-0" : "right-0"
      }`}
    >
      {gauche ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
    </button>
  );
}
