"use client";

import { useEffect, useRef } from "react";
import { AFFILIES, formatNombre, mouvementReduit } from "../../lib/pourquoi-s-affilier";

type Point = { x: number; y: number; k: number; gris: boolean; premier?: boolean };

const ROUGE = "#E32119";
const ARDOISE = "#7C90A0";
const BORDEAUX = "#931510";
/** Part du défilement de la section où la foule se forme ; le reste laisse le temps de lire la fin. */
const FORMATION = 0.85;
/** La place vide pulse 3 fois (moins de 5 s) puis reste cerclée, immobile. */
const PULSATION_MS = 1600;
const PULSATIONS = 3;

/** Générateur pseudo-aléatoire à graine fixe : la foule a la même forme à chaque visite. */
function aleatoire(graine: number) {
  return () => {
    graine = (graine * 16807) % 2147483647;
    return (graine - 1) / 2147483646;
  };
}

/** Foule organique (ellipse aux bords irréguliers), points triés du centre vers l'extérieur. */
function construireFoule(W: number, H: number): { points: Point[]; trou: number } {
  const pas = W < 500 ? 11 : 14;
  const cols = Math.floor(W / pas);
  const rangs = Math.floor(H / pas);
  const ox = (W - (cols - 1) * pas) / 2;
  const oy = (H - (rangs - 1) * pas) / 2;
  const cx = W / 2;
  const cy = H / 2;
  const R = aleatoire(42);
  const points: Point[] = [];
  for (let j = 0; j < rangs; j++)
    for (let i = 0; i < cols; i++) {
      const px = ox + i * pas + (R() - 0.5) * pas * 0.35;
      const py = oy + j * pas + (R() - 0.5) * pas * 0.35;
      const dx = px - cx;
      const dy = (py - cy) * 1.15;
      const ex = dx / (W * 0.48);
      const ey = (py - cy) / (H * 0.47);
      if (Math.sqrt(ex * ex + ey * ey) > 0.82 + R() * 0.18) continue;
      points.push({ x: px, y: py, k: Math.sqrt(dx * dx + dy * dy) + R() * pas * 5, gris: R() < 0.3 });
    }
  points.sort((a, b) => a.k - b.k);
  if (points[0]) points[0].premier = true;
  // La place vide : près du cœur de la foule, jamais le premier point.
  const trou = Math.min(points.length - 1, Math.max(24, Math.round(points.length * 0.035)));
  return { points, trou };
}

/**
 * « Vous ne serez plus seul » : section épinglée pendant le défilement. Le point rouge du début
 * est rejoint par d'autres, de plus en plus nombreux, pendant que le compteur monte jusqu'à 25 000.
 * À la fin, une place reste vide, cerclée de rouge : « Il ne manque que vous ».
 * Mouvement réduit : foule complète, 25 000 et la place vide d'emblée, sans pulsation.
 */
export default function Foule() {
  const section = useRef<HTMLElement>(null);
  const champ = useRef<HTMLDivElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const compteur = useRef<HTMLSpanElement>(null);
  const etiquette = useRef<HTMLSpanElement>(null);
  const legende = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const cv = toile.current;
    const zone = champ.current;
    const sec = section.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !zone || !sec || !ctx) return;

    const reduit = mouvementReduit();
    let W = 0;
    let H = 0;
    let foule: { points: Point[]; trou: number } = { points: [], trou: -1 };
    let dernierNombre = -1;
    let dernierePart = -1;
    let visible = false;
    let raf = 0;
    /** Moment où la foule est devenue complète (pulsation), null tant qu'elle se forme. */
    let completDepuis: number | null = null;
    let pulsait = false;

    function construire() {
      const r = zone!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      cv!.width = Math.round(W * dpr);
      cv!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      foule = construireFoule(W, H);
      const n = foule.points.length;
      if (legende.current && n > 0)
        legende.current.textContent = `1 point ≈ ${formatNombre(Math.max(1, Math.round(AFFILIES / n)))} affiliés`;
      const place = foule.points[foule.trou];
      const lab = etiquette.current;
      if (place && lab) {
        const lw = lab.offsetWidth;
        lab.style.left = `${Math.max(0, Math.min(W - lw, place.x - lw / 2))}px`;
        lab.style.top = `${place.y + 16}px`;
      }
      dernierNombre = -1;
      dernierePart = -1;
    }

    /**
     * Avancement du défilement dans la section (0 = son haut touche le haut de l'écran, 1 = son
     * bas touche le bas). Mesuré à chaque image, donc toujours juste même si la page a bougé
     * (polices chargées, bandeau refermé) ; lu seulement quand la section est à l'écran.
     */
    function progression(): number {
      const r = sec!.getBoundingClientRect();
      const course = r.height - window.innerHeight;
      return course > 0 ? Math.max(0, Math.min(1, -r.top / course)) : 1;
    }

    function dessiner(maintenant: number) {
      const { points, trou } = foule;
      if (!points.length) return;
      const q = reduit ? 1 : Math.min(1, progression() / FORMATION);
      const complet = q >= 1;
      if (!complet) completDepuis = null;
      else if (completDepuis === null) completDepuis = maintenant;
      const ecoule = completDepuis === null ? 0 : maintenant - completDepuis;
      const pulse = complet && !reduit && ecoule < PULSATION_MS * PULSATIONS;
      // Rien n'a bougé et pas de pulsation à animer : on ne redessine pas (sauf une dernière fois
      // à la fin de la pulsation, pour effacer l'anneau).
      if (q === dernierePart && !pulse && !pulsait) return;
      pulsait = pulse;
      dernierePart = q;

      const lisse = q * q * (3 - 2 * q);
      const montres = 1 + lisse * (points.length - 1);
      const r0 = W < 500 ? 2.6 : 3.2;
      ctx!.clearRect(0, 0, W, H);
      for (let i = 0, n = Math.ceil(montres); i < n && i < points.length; i++) {
        if (i === trou) continue;
        const p = points[i];
        ctx!.globalAlpha = Math.min(1, montres - i + 1);
        ctx!.fillStyle = p.premier ? ROUGE : p.gris ? ARDOISE : BORDEAUX;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.premier ? r0 * 1.9 : r0, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;

      const place = points[trou];
      if (complet && place) {
        ctx!.strokeStyle = ROUGE;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(place.x, place.y, r0 * 1.6, 0, Math.PI * 2);
        ctx!.stroke();
        if (pulse) {
          const phase = (ecoule % PULSATION_MS) / PULSATION_MS;
          ctx!.globalAlpha = 1 - phase;
          ctx!.beginPath();
          ctx!.arc(place.x, place.y, r0 * 1.6 + phase * r0 * 5, 0, Math.PI * 2);
          ctx!.stroke();
          ctx!.globalAlpha = 1;
        }
      }
      etiquette.current?.classList.toggle("foule-vous-visible", complet);

      const nombre = complet ? AFFILIES : montres < 1.5 ? 1 : Math.round(((montres / points.length) * AFFILIES) / 10) * 10;
      if (nombre !== dernierNombre && compteur.current) {
        compteur.current.textContent = formatNombre(nombre);
        dernierNombre = nombre;
      }
    }

    // Boucle d'images seulement quand la section est à l'écran.
    function boucle(maintenant: number) {
      dessiner(maintenant);
      raf = visible ? requestAnimationFrame(boucle) : 0;
    }

    construire();
    dessiner(performance.now());

    const taille = new ResizeObserver(() => {
      construire();
      dessiner(performance.now());
    });
    taille.observe(zone);

    let observateur: IntersectionObserver | undefined;
    if (!reduit) {
      observateur = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(boucle);
      });
      observateur.observe(sec);
    }

    return () => {
      taille.disconnect();
      observateur?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={section}
      aria-labelledby="titre-foule"
      className="foule relative mt-[clamp(100px,14vw,200px)] h-[300vh] md:h-[320vh]"
    >
      <div className="foule-cadre sticky top-0 mx-auto grid h-[100dvh] max-w-[1440px] grid-rows-[auto_minmax(0,1fr)] gap-3 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:grid-rows-1 md:gap-12 md:py-[clamp(32px,6vh,72px)] lg:px-16">
        <div className="min-w-0 self-start md:self-center">
          <h2 id="titre-foule" className="font-condensed text-[clamp(1.6rem,2.6vw,2.2rem)] font-extrabold uppercase leading-none [text-wrap:balance]">
            Vous ne serez plus seul
          </h2>
          <span
            ref={compteur}
            aria-hidden
            className="my-1 block whitespace-nowrap font-condensed text-[clamp(4.2rem,20vw,6rem)] font-extrabold leading-[0.85] tracking-[-0.02em] text-militant-rouge [font-variant-numeric:tabular-nums] md:mb-3.5 md:mt-2.5 md:text-[clamp(5rem,11vw,10rem)]"
          >
            {formatNombre(AFFILIES)}
          </span>
          <p className="max-w-[32ch] text-base md:text-lg">
            <span className="sr-only">{formatNombre(AFFILIES)} </span>
            affiliés à la Centrale Générale en provinces de Namur et de Luxembourg.
          </p>
          <p className="mt-2 max-w-[36ch] text-[15px] leading-snug md:mt-4 md:max-w-[32ch] md:text-lg md:leading-normal">
            Chaque affiliation pèse dans les négociations sur les salaires, les horaires et les congés.
          </p>
          <p className="mt-3 flex items-center gap-2.5 text-sm font-medium md:mt-7">
            <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-militant-bordeaux" />
            <span ref={legende}>1 point ≈ 10 affiliés</span>
          </p>
          <p className="sr-only">Il ne manque que vous.</p>
        </div>
        <div ref={champ} aria-hidden className="relative min-h-0 min-w-0">
          <canvas ref={toile} className="absolute inset-0 block h-full w-full" />
          <span
            ref={etiquette}
            className="foule-vous pointer-events-none absolute left-0 top-0 whitespace-nowrap bg-militant-rouge px-3 pb-[5px] pt-[7px] font-condensed text-[clamp(1.3rem,2vw,1.8rem)] font-extrabold uppercase leading-none text-white"
          >
            Il ne manque que vous
          </span>
        </div>
      </div>
    </section>
  );
}
