"use client";

import { useEffect, useState } from "react";
import {
  CLE_CONSENTEMENT,
  EVENEMENT_CHOIX,
  TOUT_REFUSE,
  creerChoix,
  lireChoix,
  type Autorisations,
  type Categorie,
  type ChoixCookies,
} from "../lib/consentement";

function lire(): ChoixCookies | null {
  try {
    return lireChoix(localStorage.getItem(CLE_CONSENTEMENT));
  } catch {
    return null; // stockage bloqué : le choix n'est pas mémorisé, le pop-up reviendra
  }
}

/** Enregistre le choix complet et prévient tous les composants de la page. */
export function enregistrerChoix(autorisations: Autorisations) {
  const choix = creerChoix(autorisations);
  try {
    localStorage.setItem(CLE_CONSENTEMENT, JSON.stringify(choix));
  } catch {
    // Sans stockage : le choix vaut pour cette page seulement.
  }
  window.dispatchEvent(new CustomEvent<ChoixCookies>(EVENEMENT_CHOIX, { detail: choix }));
}

/** Autorise une catégorie sans toucher aux autres (bouton « Afficher les cartes », « Autoriser et lire »). */
export function autoriser(categorie: Categorie) {
  const actuel = lire() ?? TOUT_REFUSE;
  enregistrerChoix({ cartes: actuel.cartes, videos: actuel.videos, [categorie]: true });
}

/**
 * Choix de cookies du visiteur. `pret` = lu dans le navigateur (avant : rendu serveur, rien de décidé,
 * donc rien de tiers chargé). Suit les changements faits dans la page et dans les autres onglets.
 */
export function useConsentement() {
  const [etat, setEtat] = useState<{ pret: boolean; choix: ChoixCookies | null }>({ pret: false, choix: null });

  useEffect(() => {
    setEtat({ pret: true, choix: lire() });
    const surChoix = (e: Event) => setEtat({ pret: true, choix: (e as CustomEvent<ChoixCookies>).detail });
    const surStockage = (e: StorageEvent) => {
      if (e.key === CLE_CONSENTEMENT || e.key === null) setEtat({ pret: true, choix: lire() });
    };
    window.addEventListener(EVENEMENT_CHOIX, surChoix);
    window.addEventListener("storage", surStockage);
    return () => {
      window.removeEventListener(EVENEMENT_CHOIX, surChoix);
      window.removeEventListener("storage", surStockage);
    };
  }, []);

  return { ...etat, autorise: (c: Categorie) => etat.choix?.[c] === true };
}
