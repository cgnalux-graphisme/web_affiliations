"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import { IconeChargement } from "./Chargement";
import { imageAcceptee, MESSAGE_IMAGE_REFUSEE, nomDepuisUrl, urlImageDeposee } from "../lib/image-deposee";

const ECHEC_WEB = "L'image n'a pas pu être récupérée. Enregistrez-la sur l'ordinateur puis déposez le fichier.";

/**
 * Zone de glisser-déposer d'images, commune à toutes les insertions d'images de l'espace admin.
 * Accepte un fichier de l'ordinateur, ou une image tirée d'une autre page web : le navigateur ne donne alors que
 * son adresse, et /api/image-distante la télécharge côté serveur (super admin, adresses publiques seulement).
 * Les fichiers reçus sont déjà vérifiés (type, 20 Mo max) ; `onErreur("")` efface le message précédent.
 * Tant que la zone est affichée, un fichier lâché à côté n'ouvre pas l'image dans l'onglet (le formulaire serait perdu).
 */
export default function ZoneDepotImages({
  onImages,
  onErreur,
  multiple = false,
  disabled = false,
  className = "",
  children,
}: {
  onImages: (fichiers: File[]) => void;
  onErreur: (message: string) => void;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [survol, setSurvol] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    const avecFichier = (e: DragEvent) => Boolean(e.dataTransfer?.types.includes("Files"));
    const bloquer = (e: DragEvent) => {
      if (avecFichier(e)) e.preventDefault();
    };
    window.addEventListener("dragover", bloquer);
    window.addEventListener("drop", bloquer);
    return () => {
      window.removeEventListener("dragover", bloquer);
      window.removeEventListener("drop", bloquer);
    };
  }, []);

  async function deposer(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSurvol(false);
    if (disabled || enCours) return;
    onErreur("");

    const fichiers = Array.from(e.dataTransfer.files);
    if (fichiers.length) {
      const acceptes = fichiers.filter(imageAcceptee);
      const refuses = fichiers.filter((f) => !imageAcceptee(f)).map((f) => f.name);
      if (acceptes.length) onImages(multiple ? acceptes : acceptes.slice(0, 1));
      if (refuses.length) {
        onErreur(`Non ajouté${refuses.length > 1 ? "s" : ""} (${MESSAGE_IMAGE_REFUSEE}) : ${refuses.join(", ")}.`);
      }
      return;
    }

    const url = urlImageDeposee(e.dataTransfer);
    if (!url) {
      onErreur("Aucune image reconnue. Glissez l'image elle-même, ou enregistrez-la puis déposez le fichier.");
      return;
    }
    setEnCours(true);
    try {
      let blob: Blob;
      if (url.startsWith("data:image/")) {
        blob = await (await fetch(url)).blob();
      } else {
        const reponse = await fetch("/api/image-distante", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (!reponse.ok) {
          const json = (await reponse.json().catch(() => ({}))) as { erreur?: string };
          onErreur(json.erreur ?? ECHEC_WEB);
          return;
        }
        blob = await reponse.blob();
      }
      const fichier = new File([blob], nomDepuisUrl(url), { type: blob.type });
      if (!imageAcceptee(fichier)) {
        onErreur(`Image non ajoutée : ${MESSAGE_IMAGE_REFUSEE}.`);
        return;
      }
      onImages([fichier]);
    } catch {
      onErreur(ECHEC_WEB);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (disabled) {
          e.dataTransfer.dropEffect = "none";
          return;
        }
        e.dataTransfer.dropEffect = "copy";
        if (!survol) setSurvol(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(false);
      }}
      onDrop={deposer}
      aria-busy={enCours}
      className={`relative rounded-xl transition-shadow ${survol ? "ring-4 ring-militant-rouge ring-offset-2" : ""} ${className}`}
    >
      {children}
      {(survol || enCours) && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/90 px-4 text-center text-[15px] font-bold">
          {enCours ? (
            <>
              <IconeChargement size={40} className="text-militant-rouge" />
              Récupération de l&apos;image…
            </>
          ) : (
            <>
              <ImagePlus size={28} className="text-militant-rouge" aria-hidden />
              {multiple ? "Déposez les photos ici" : "Déposez l'image ici"}
            </>
          )}
        </div>
      )}
    </div>
  );
}
