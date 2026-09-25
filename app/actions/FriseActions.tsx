"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ancreUne } from "../../lib/actions";
import { isoToDateFr } from "../../lib/dates";

export type JalonFrise = { id: string; date: string; titre: string; type: string };

const ECART_MIN = 20; // en dessous de cet écart (px), deux jalons s'empilent
const PALIER = 20; // hauteur d'un étage d'empilement (px)
const HAUT = 24; // marge au-dessus du premier étage (px)
const MOIS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

const estBissextile = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const joursDansAnnee = (a: number) => (estBissextile(a) ? 366 : 365);
/** Jour de l'année (0 = 1er janvier) d'une date ISO. */
const jourDeLAnnee = (iso: string) => {
  const a = +iso.slice(0, 4);
  return (Date.UTC(a, +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(a, 0, 1)) / 86_400_000;
};
/** Position (en % de la ligne) d'un jour de l'année. */
const pourcent = (jour: number, annee: number) => (jour / joursDansAnnee(annee)) * 100;

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
 * Frise chronologique : une ligne = une année (janvier à décembre), un jalon par
 * action placé selon sa date. Curseurs pour changer d'année ; survol / focus =
 * nom de l'action ; clic = défilement jusqu'à la une.
 */
export default function FriseActions({ jalons }: { jalons: JalonFrise[] }) {
  const annees = useMemo(
    () => [...new Set(jalons.map((j) => +j.date.slice(0, 4)))].sort((a, b) => a - b),
    [jalons]
  );
  const [annee, setAnnee] = useState(() => annees[annees.length - 1]);
  const ligne = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(900);

  useEffect(() => {
    const el = ligne.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargeur(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lien direct vers une une (#une-…) : on affiche son année et on la met en avant.
  useEffect(() => {
    const ancre = window.location.hash.slice(1);
    if (!ancre.startsWith("une-")) return;
    const cible = jalons.find((j) => j.id === ancre.slice(4));
    if (cible) setAnnee(+cible.date.slice(0, 4));
    allerALaUne(ancre.slice(4), false);
  }, [jalons]);

  // Jalons de l'année affichée, avec leur étage d'empilement.
  const points = useMemo(() => {
    const occupes: number[][] = []; // positions (px) déjà prises, par étage
    return jalons
      .filter((j) => +j.date.slice(0, 4) === annee)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((j) => {
        const pct = pourcent(jourDeLAnnee(j.date) + 0.5, annee);
        const px = (pct / 100) * largeur;
        let etage = 0;
        while (occupes[etage]?.some((x) => Math.abs(x - px) < ECART_MIN)) etage++;
        (occupes[etage] ??= []).push(px);
        return { ...j, pct, etage };
      });
  }, [jalons, annee, largeur]);

  if (jalons.length === 0) return null;

  const i = annees.indexOf(annee);
  const etages = Math.max(1, ...points.map((p) => p.etage + 1));
  const axeY = HAUT + (etages - 1) * PALIER; // l'axe descend quand les jalons s'empilent

  return (
    <section aria-labelledby="titre-frise" className="border-b-[3px] border-militant-charbon bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* En-tête : titre + curseurs d'année */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h2 id="titre-frise" className="font-condensed text-3xl font-extrabold leading-none">
            Chronologie
            <span className="ml-3 text-xl font-semibold">
              {points.length} action{points.length > 1 ? "s" : ""} en {annee}
            </span>
          </h2>
          <div className="flex min-w-0 items-center gap-1" role="group" aria-label="Choisir l'année">
            <BoutonAnnee
              sens={-1}
              desactive={i <= 0}
              onClick={() => setAnnee(annees[i - 1])}
              libelle={i > 0 ? `Année précédente : ${annees[i - 1]}` : "Pas d'année précédente"}
            />
            <ul className="flex min-w-0 items-center gap-1 overflow-x-auto">
              {annees.map((a) => (
                <li key={a}>
                  <button
                    type="button"
                    onClick={() => setAnnee(a)}
                    aria-pressed={a === annee}
                    className={`rounded-lg px-3 py-1 font-condensed text-xl font-bold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
                      a === annee
                        ? "bg-militant-bordeaux text-white"
                        : "text-militant-charbon hover:bg-militant-bordeaux hover:text-white"
                    }`}
                  >
                    {a}
                  </button>
                </li>
              ))}
            </ul>
            <BoutonAnnee
              sens={1}
              desactive={i >= annees.length - 1}
              onClick={() => setAnnee(annees[i + 1])}
              libelle={i < annees.length - 1 ? `Année suivante : ${annees[i + 1]}` : "Pas d'année suivante"}
            />
          </div>
        </div>

        {/* La ligne de l'année : 12 mois, de janvier à décembre */}
        <div className="mt-6 px-3 sm:px-4">
          <div ref={ligne} className="relative" style={{ height: axeY + 40 }}>
            {/* Axe */}
            <div
              aria-hidden
              className="frise-anim absolute inset-x-0 h-[3px] origin-left bg-militant-charbon"
              style={{ top: axeY - 1, animation: "frise-trace 600ms ease-out both" }}
            />
            {/* Mois : repère au début de chaque mois, numéro au milieu */}
            {MOIS.map((m, k) => {
              const debut = pourcent(jourDeLAnnee(`${annee}-${m}-01`), annee);
              const fin = k === 11 ? 100 : pourcent(jourDeLAnnee(`${annee}-${MOIS[k + 1]}-01`), annee);
              return (
                <div key={m} aria-hidden>
                  <span
                    className="absolute h-[15px] w-px bg-militant-ardoise"
                    style={{ left: `${debut}%`, top: axeY - 7 }}
                  />
                  <span
                    className="absolute -translate-x-1/2 font-condensed text-sm font-semibold tabular-nums text-militant-charbon"
                    style={{ left: `${(debut + fin) / 2}%`, top: axeY + 12 }}
                  >
                    {m}
                  </span>
                </div>
              );
            })}
            {/* Jalons (leur apparition se rejoue à chaque changement d'année) */}
            <div key={annee}>
              {points.map((p, n) => {
                const bord = p.pct < 15 ? "gauche" : p.pct > 85 ? "droite" : "centre";
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => allerALaUne(p.id)}
                    aria-label={`${p.titre}, ${isoToDateFr(p.date)} : aller à l'action`}
                    className="frise-anim group absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full hover:z-20 focus:outline-none focus-visible:z-20"
                    style={{
                      left: `${p.pct}%`,
                      top: axeY - p.etage * PALIER + 0.5,
                      animation: `frise-jalon 320ms ease-out ${150 + Math.min(n, 20) * 35}ms both`,
                    }}
                  >
                    <span className="block h-3.5 w-3.5 rounded-full bg-militant-rouge ring-[3px] ring-white transition-transform duration-200 group-hover:scale-150 group-focus-visible:scale-150 group-focus-visible:ring-militant-charbon motion-reduce:transition-none" />
                    <span
                      role="tooltip"
                      className={`pointer-events-none absolute bottom-full mb-2 w-max max-w-[16rem] bg-militant-bordeaux px-3 py-2 text-left text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 ${
                        bord === "gauche" ? "left-0" : bord === "droite" ? "right-0" : "left-1/2 -translate-x-1/2"
                      }`}
                    >
                      <span className="block font-condensed text-base font-bold tabular-nums">
                        {isoToDateFr(p.date)}
                      </span>
                      <span className="block whitespace-normal text-sm font-semibold leading-snug">{p.titre}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BoutonAnnee({
  sens,
  desactive,
  onClick,
  libelle,
}: {
  sens: -1 | 1;
  desactive: boolean;
  onClick: () => void;
  libelle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactive}
      aria-label={libelle}
      title={libelle}
      className="shrink-0 rounded-lg p-1.5 text-militant-charbon transition-colors hover:bg-militant-bordeaux hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:pointer-events-none disabled:text-militant-ardoise"
    >
      {sens === -1 ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
    </button>
  );
}
