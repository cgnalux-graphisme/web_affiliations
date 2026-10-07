"use client";

import { useEffect, useRef } from "react";
import { mouvementReduit } from "../../lib/pourquoi-s-affilier";

type Point = { x: number; y: number; r: number; a: number; apparition: number };

/** Générateur pseudo-aléatoire à graine fixe : le même ciel à chaque visite. */
function aleatoire(graine: number) {
  return () => {
    graine = (graine * 16807) % 2147483647;
    return (graine - 1) / 2147483646;
  };
}

/** Durée de l'apparition des points, un à un (sous 5 s : ensuite, rien ne bouge sans défilement). */
const APPARITION_MS = 3200;
/** Part du chemin vers le point rouge parcourue quand l'ouverture a fini de défiler. */
const RAPPROCHEMENT = 0.38;

/**
 * Fond de l'ouverture « Seul, on subit » : d'autres travailleurs isolés, points pâles dispersés
 * dans le noir, chacun loin des autres. Ils apparaissent un à un, puis se rapprochent du point
 * rouge à mesure qu'on fait défiler la page : la foule s'annonce. Mouvement réduit : ciel fixe.
 * Le point rouge (`.pourquoi-seul`) est cherché dans la même section.
 */
export default function PointsIsoles() {
  const toile = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = toile.current;
    const section = cv?.closest("section");
    const seul = section?.querySelector<HTMLElement>(".pourquoi-seul");
    const ctx = cv?.getContext("2d");
    if (!cv || !section || !seul || !ctx) return;

    const reduit = mouvementReduit();
    let W = 0;
    let H = 0;
    let cible = { x: 0, y: 0 };
    let points: Point[] = [];
    let visible = false;
    let raf = 0;
    let dernier = "";
    const t0 = performance.now();

    function construire() {
      const r = section!.getBoundingClientRect();
      const s = seul!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      cv!.width = Math.round(W * dpr);
      cv!.height = Math.round(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cible = { x: s.left - r.left + s.width / 2, y: s.top - r.top + s.height / 2 };
      // Un point par case d'une grille lâche, placé au hasard dans sa case : dispersés, jamais groupés.
      const R = aleatoire(7);
      const pas = W < 640 ? 92 : 128;
      points = [];
      for (let y = pas / 2; y < H; y += pas)
        for (let x = pas / 2; x < W; x += pas) {
          if (R() < 0.42) continue;
          const px = x + (R() - 0.5) * pas * 0.8;
          const py = y + (R() - 0.5) * pas * 0.8;
          // Jamais collé au point rouge : il doit rester seul.
          if (Math.hypot(px - cible.x, py - cible.y) < 90) continue;
          points.push({ x: px, y: py, r: 1.4 + R() * 1.4, a: 0.25 + R() * 0.35, apparition: R() });
        }
      dernier = "";
    }

    function dessiner(maintenant: number) {
      const r = section!.getBoundingClientRect();
      const defile = reduit ? 0 : Math.max(0, Math.min(1, -r.top / Math.max(1, r.height * 0.8)));
      const temps = reduit ? 1 : Math.min(1, (maintenant - t0) / APPARITION_MS);
      const cle = `${defile.toFixed(3)}|${temps.toFixed(3)}|${W}`;
      if (cle === dernier) return;
      dernier = cle;

      const k = RAPPROCHEMENT * defile * defile * (3 - 2 * defile);
      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = "#7C90A0";
      for (const p of points) {
        // Chaque point a son moment d'apparition dans la fenêtre des 3,2 s.
        const vu = Math.max(0, Math.min(1, (temps - p.apparition * 0.75) / 0.25));
        if (vu <= 0) continue;
        ctx!.globalAlpha = p.a * vu;
        ctx!.beginPath();
        ctx!.arc(p.x + (cible.x - p.x) * k, p.y + (cible.y - p.y) * k, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

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
    taille.observe(section);

    let observateur: IntersectionObserver | undefined;
    if (!reduit) {
      observateur = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(boucle);
      });
      observateur.observe(section);
    }
    return () => {
      taille.disconnect();
      observateur?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={toile} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
