/** Éléments qui peuvent recevoir le focus. */
const FOCUSABLES = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Piège de focus d'une fenêtre (dialog) : Tab et Maj+Tab tournent à l'intérieur du conteneur. */
export function pieger(e: React.KeyboardEvent, conteneur: HTMLElement | null) {
  if (e.key !== "Tab" || !conteneur) return;
  const elements = [...conteneur.querySelectorAll<HTMLElement>(FOCUSABLES)].filter((el) => el.offsetParent !== null);
  if (!elements.length) return;
  const premier = elements[0];
  const dernier = elements[elements.length - 1];
  if (e.shiftKey && document.activeElement === premier) {
    e.preventDefault();
    dernier.focus();
  } else if (!e.shiftKey && document.activeElement === dernier) {
    e.preventDefault();
    premier.focus();
  }
}
