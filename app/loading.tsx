import { EcranChargement } from "./Chargement";

/** Affiché pendant le chargement d'une page du site public (la navigation reste visible). */
export default function Chargement() {
  return <EcranChargement texte="Chargement de la page…" />;
}
