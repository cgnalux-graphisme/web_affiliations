"use client";

import React, { useRef, useState } from "react";
import { ArrowUp, ImagePlus, Star, X } from "lucide-react";

export type PhotoLocale = {
  cle: string;
  file: File;
  apercu: string; // URL locale (blob:) pour la prévisualisation
  legende: string;
};

const TYPES_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];
const TAILLE_MAX = 20 * 1024 * 1024;
export const PHOTOS_MAX = 12;

/** Sélection, légendes et ordre des photos d'une action. La première = photo principale. */
export default function ChoixPhotos({
  photos,
  onChange,
  disabled,
}: {
  photos: PhotoLocale[];
  onChange: (photos: PhotoLocale[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avertissement, setAvertissement] = useState("");

  function ajouter(fichiers: FileList | null) {
    if (!fichiers) return;
    const refusees: string[] = [];
    const nouvelles: PhotoLocale[] = [];
    for (const file of Array.from(fichiers)) {
      if (!TYPES_ACCEPTES.includes(file.type) || file.size > TAILLE_MAX) {
        refusees.push(file.name);
        continue;
      }
      nouvelles.push({ cle: crypto.randomUUID(), file, apercu: URL.createObjectURL(file), legende: "" });
    }
    const place = PHOTOS_MAX - photos.length;
    const gardees = nouvelles.slice(0, place);
    nouvelles.slice(place).forEach((p) => URL.revokeObjectURL(p.apercu));

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
    if (p) URL.revokeObjectURL(p.apercu);
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
          {photos.map((p, i) => (
            <li
              key={p.cle}
              className={`flex gap-3 rounded-xl border p-3 ${i === 0 ? "border-red-400 bg-red-50/60" : "border-gray-200"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) */}
              <img src={p.apercu} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-gray-500" title={p.file.name}>
                    {i === 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                        <Star size={12} className="fill-current" /> Photo principale
                      </span>
                    ) : (
                      p.file.name
                    )}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => mettreEnPremier(p.cle)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                      >
                        <ArrowUp size={13} /> Principale
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => retirer(p.cle)}
                      disabled={disabled}
                      aria-label={`Retirer ${p.file.name}`}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
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
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {photos.length < PHOTOS_MAX && (
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-300 px-4 py-6 text-center transition-colors hover:border-red-300 hover:bg-red-50/40 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-200 ${disabled ? "pointer-events-none opacity-60" : ""}`}
        >
          <ImagePlus className="h-6 w-6 text-red-700" />
          <span className="text-sm font-semibold text-gray-800">
            {photos.length ? "Ajouter d'autres photos" : "Ajouter des photos"}
          </span>
          <span className="text-xs text-gray-500">JPEG, PNG ou WebP. Plusieurs photos possibles.</span>
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

      {avertissement && <p className="text-xs text-red-600">{avertissement}</p>}
    </div>
  );
}
