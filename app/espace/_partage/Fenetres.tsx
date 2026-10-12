"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TriangleAlert, X } from "lucide-react";
import { pieger } from "../../pieger-focus";
import { IconeChargement } from "../../Chargement";

/**
 * Fenêtres de l'Espace CG : panneau latéral (« Gérer ») et fenêtre de confirmation.
 * Rendues dans le cadre .ecg (couleurs de l'app conservées) ; Échap ferme ; focus piégé, puis rendu à
 * l'élément qui a ouvert la fenêtre ; défilement de la page bloqué pendant l'ouverture.
 */

/** Fenêtres ouvertes, de la plus ancienne à la plus récente : Échap ne ferme que la dernière. */
const pile: object[] = [];

function useFenetre(ouverte: boolean, fermer: () => void, conteneur: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!ouverte) return;
    const moi = {};
    pile.push(moi);
    const avant = document.activeElement as HTMLElement | null;
    const premier = conteneur.current?.querySelector<HTMLElement>("[data-focus-initial], button, a, input, select, textarea");
    premier?.focus();
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pile[pile.length - 1] === moi) {
        e.preventDefault();
        fermer();
      }
    };
    const debordement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", surTouche);
    return () => {
      window.removeEventListener("keydown", surTouche);
      pile.splice(pile.indexOf(moi), 1);
      document.body.style.overflow = debordement;
      avant?.focus?.();
    };
    // fermer change à chaque rendu : on ne rejoue l'effet qu'à l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte]);
}

function Portail({ children }: { children: React.ReactNode }) {
  const [cible, setCible] = useState<Element | null>(null);
  useEffect(() => setCible(document.querySelector(".ecg") ?? document.body), []);
  return cible ? createPortal(children, cible) : null;
}

export function PanneauLateral({
  ouvert,
  onFermer,
  titre,
  sousTitre,
  avant,
  pied,
  children,
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre: string;
  sousTitre?: React.ReactNode;
  /** Élément devant le titre (avatar…). */
  avant?: React.ReactNode;
  /** Contenu, ou fonction qui reçoit `fermer` (fermeture animée). */
  pied?: React.ReactNode | ((fermer: () => void) => React.ReactNode);
  children: React.ReactNode | ((fermer: () => void) => React.ReactNode);
}) {
  const ref = useRef<HTMLElement>(null);
  const [sortie, setSortie] = useState(false);
  // Fermeture animée : le panneau ressort par la droite, puis le parent le démonte (immédiat en mouvement réduit).
  const fermer = () => {
    if (sortie) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return onFermer();
    setSortie(true);
    setTimeout(onFermer, 220);
  };
  useEffect(() => {
    if (ouvert) setSortie(false);
  }, [ouvert]);
  useFenetre(ouvert, fermer, ref);
  if (!ouvert) return null;
  const classeSortie = sortie ? " ecg-sortie" : "";
  return (
    <Portail>
      <div className={`ecg-tiroir-voile${classeSortie}`} onClick={fermer} aria-hidden />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-tiroir"
        className={`ecg-tiroir${classeSortie}`}
        onKeyDown={(e) => pieger(e, ref.current)}
      >
        <div className="ecg-tiroir-tete">
          {avant}
          <div className="min-w-0">
            <h2 id="titre-tiroir">{titre}</h2>
            {sousTitre && <p>{sousTitre}</p>}
          </div>
          <button type="button" className="ecg-fermer" onClick={fermer} aria-label="Fermer le panneau">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="ecg-tiroir-corps">{typeof children === "function" ? children(fermer) : children}</div>
        {pied && <div className="ecg-tiroir-pied">{typeof pied === "function" ? pied(fermer) : pied}</div>}
      </aside>
    </Portail>
  );
}

export function Confirmation({
  ouverte,
  titre,
  children,
  libelleConfirmer,
  danger = false,
  enCours = false,
  onConfirmer,
  onAnnuler,
}: {
  ouverte: boolean;
  titre: string;
  children: React.ReactNode;
  libelleConfirmer: string;
  danger?: boolean;
  enCours?: boolean;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFenetre(ouverte, onAnnuler, ref);
  if (!ouverte) return null;
  return (
    <Portail>
      <div className="ecg-modale-voile" onClick={onAnnuler} aria-hidden />
      <div
        ref={ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titre-confirmation"
        aria-describedby="texte-confirmation"
        className="ecg-modale"
        onKeyDown={(e) => pieger(e, ref.current)}
      >
        <h2 id="titre-confirmation">
          <TriangleAlert size={22} className="shrink-0 text-[#8a5300]" aria-hidden />
          {titre}
        </h2>
        <div id="texte-confirmation">{children}</div>
        <div className="ecg-modale-actions">
          <button type="button" className="ecg-btn" onClick={onAnnuler} data-focus-initial>
            Annuler
          </button>
          <button type="button" className={`ecg-btn ${danger ? "ecg-btn-danger" : "ecg-btn-principal"}`} onClick={onConfirmer}>
            {enCours && <IconeChargement size={16} />}
            {libelleConfirmer}
          </button>
        </div>
      </div>
    </Portail>
  );
}
