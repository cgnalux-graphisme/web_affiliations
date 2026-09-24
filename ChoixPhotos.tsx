"use client";

import React, { useRef, useState } from "react";
import { ArrowUp, ImagePlus, Star, X } from "lucide-react";
import type { PhotoEdition } from "./lib/photos-sync";

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX = 20 * 1024 * 1024;
export const PHOTOS_MAX = 12;

/** Libère l'aperçu local d'une nouvelle photo (sans effet sur une photo enregistrée). */
export function libererApercu(p: PhotoEdition) {
  if (p.apercu) URL.revokeObjectURL(p.apercu);
}

/**
 * Sélection, légendes et ordre des photos d'une action (enregistrées ou nouvelles).
 * La première = photo principale. Les changements ne sont appliqués qu'à l'enregistrement.
 */
export default function ChoixPhotos({
  photos,
  onChange,
  disabled,
}: {
  photos: PhotoEdition[];
  onChange: (photos: PhotoEdition[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avertissement, setAvertissement] = useState("");

  function ajouter(fichiers: FileList | null) {
    if (!fichiers) return;
    const refusees: string[] = [];
    const nouvelles: PhotoEdition[] = [];
    for (const file of Array.from(fichiers)) {
      if (!TYPES_ACCEPTES.includes(file.type) || file.size > TAILLE_MAX) {
        refusees.push(file.name);
        continue;
      }
      nouvelles.push({ cle: crypto.randomUUID(), file, apercu: URL.createObjectURL(file), legende: "" });
    }
    const place = PHOTOS_MAX - photos.length;
    const gardees = nouvelles.slice(0, place);
    nouvelles.slice(place).forEach(libererApercu);

    const messages: string[] = [];
    if (refusees.length) {
      messages.push(`Non ajoutée${refusees.length > 1 ? "s" : ""} (JPEG, PNG ou WebP de 20 Mo max.) : ${refusees.join(", ")}.`);
    }
    if (nouvelles.length > place) messages.push(`${PHOTOS_MAX} photos maximum par action.`);
    setAvertissement(messages.join(" "));

    onChange([...photos, ...gardees]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function retirer(cle: string) {
    const p = photos.find((x) => x.cle === cle);
    if (p) libererApercu(p);
    onChange(photos.filter((x) => x.cle !== cle));
  }

  function mettreEnPremier(cle: string) {
    const p = photos.find((x) => x.cle === cle);
    if (p) onChange([p, ...photos.filter((x) => x.cle !== cle)]);
  }

  function setLegende(cle: string, legende: string) {
    onChange(photos.map((x) => (x.cle === cle ? { ...x, legende } : x)));
  }

  return (
    <div className="space-y-4">
      {photos.length > 0 && (
        <ul className="space-y-3">
          {photos.map((p, i) => {
            const nom = p.file ? p.file.name : "Photo enregistrée";
            return (
              <li
                key={p.cle}
                className={`flex gap-3 rounded-xl border p-3 ${
                  i === 0 ? "border-2 border-militant-rouge" : "border-militant-ardoise"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou photo du bucket */}
                <img
                  src={p.apercu ?? p.url}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-lg bg-militant-charbon object-cover sm:h-24 sm:w-24"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-xs text-militant-charbon" title={nom}>
                      {i === 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-militant-bordeaux">
                          <Star size={12} className="fill-current" /> Photo principale
                        </span>
                      ) : (
                        <>
                          {nom}
                          {p.file && <span className="ml-1.5 font-bold text-militant-bordeaux">nouvelle</span>}
                        </>
                      )}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => mettreEnPremier(p.cle)}
                          disabled={disabled}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-militant-charbon hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                        >
                          <ArrowUp size={13} /> Principale
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => retirer(p.cle)}
                        disabled={disabled}
                        aria-label={`Retirer ${nom}`}
                        title="Retirer (appliqué à l'enregistrement)"
                        className="rounded-lg p-1.5 text-militant-charbon hover:bg-militant-bordeaux hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <input
                    value={p.legende}
                    onChange={(e) => setLegende(p.cle, e.target.value)}
                    disabled={disabled}
                    maxLength={200}
                    placeholder="Légende (facultative)"
                    aria-label={`Légende de la photo ${i + 1}`}
                    className="w-full rounded-lg border border-militant-ardoise bg-white px-3 py-2 text-sm text-militant-charbon focus:border-militant-charbon focus:outline-none focus:ring-2 focus:ring-militant-rouge"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {photos.length < PHOTOS_MAX && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-militant-ardoise px-4 py-6 text-center transition-colors hover:border-militant-charbon focus-within:border-militant-charbon focus-within:ring-2 focus-within:ring-militant-rouge ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <ImagePlus className="h-6 w-6 text-militant-rouge" />
          <span className="text-sm font-bold text-militant-charbon">
            {photos.length ? "Ajouter d'autres photos" : "Ajouter des photos"}
          </span>
          <span className="text-xs text-militant-charbon">JPEG, PNG ou WebP. Plusieurs photos possibles.</span>
          <input
            ref={inputRef}
            type="file"
            accept={TYPES_ACCEPTES.join(",")}
            multiple
            disabled={disabled}
            onChange={(e) => ajouter(e.target.files)}
            className="sr-only"
          />
        </label>
      )}

      {avertissement && <p className="text-xs font-semibold text-militant-bordeaux">{avertissement}</p>}
    </div>
  );
}
