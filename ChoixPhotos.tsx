"use client";

import React, { useRef, useState } from "react";
import { ArrowUp, ImagePlus, Star, X } from "lucide-react";
import ZoneDepotImages from "./app/ZoneDepotImages";
import { imageAcceptee, MESSAGE_IMAGE_REFUSEE, TYPES_IMAGE } from "./lib/image-deposee";
import type { PhotoEdition } from "./lib/photos-sync";

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

  function ajouter(fichiers: File[]) {
    const refusees: string[] = [];
    const nouvelles: PhotoEdition[] = [];
    for (const file of fichiers) {
      if (!imageAcceptee(file)) {
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
      messages.push(`Non ajoutée${refusees.length > 1 ? "s" : ""} (${MESSAGE_IMAGE_REFUSEE}) : ${refusees.join(", ")}.`);
    }
    if (nouvelles.length > place) messages.push(`${PHOTOS_MAX} photos maximum par action.`);
    setAvertissement(messages.join(" "));

    onChange([...photos, ...gardees]);
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
                className={`ecg-media${i === 0 ? " ecg-media-principale" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:) ou photo du bucket */}
                <img
                  src={p.apercu ?? p.url}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-lg bg-[#e3e7eb] object-cover sm:h-24 sm:w-24"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[13px]" title={nom}>
                      {i === 0 ? (
                        <span className="ecg-statut ecg-statut-info">
                          <Star size={12} className="fill-current" aria-hidden /> Photo principale
                        </span>
                      ) : (
                        <>
                          {nom}
                          {p.file && <span className="ml-1.5 font-semibold">(nouvelle)</span>}
                        </>
                      )}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => mettreEnPremier(p.cle)}
                          disabled={disabled}
                          className="ecg-btn ecg-btn-fantome ecg-btn-petit"
                        >
                          <ArrowUp size={14} aria-hidden /> Principale
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => retirer(p.cle)}
                        disabled={disabled}
                        aria-label={`Retirer ${nom}`}
                        title="Retirer (appliqué à l'enregistrement)"
                        className="ecg-btn-icone"
                      >
                        <X size={18} aria-hidden />
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
                    className="ecg-champ"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {photos.length < PHOTOS_MAX && (
        <ZoneDepotImages onImages={ajouter} onErreur={setAvertissement} multiple disabled={disabled}>
        <label className={`ecg-depot${disabled ? " pointer-events-none opacity-60" : ""}`}>
          <span className="ecg-depot-ico" aria-hidden>
            <ImagePlus size={22} />
          </span>
          <b>{photos.length ? "Ajouter d'autres photos" : "Ajouter des photos"}</b>
          <small>Cliquez ou glissez-les ici (depuis l&apos;ordinateur ou une autre page web). Plusieurs photos possibles.</small>
          <input
            ref={inputRef}
            type="file"
            accept={TYPES_IMAGE.join(",")}
            multiple
            disabled={disabled}
            onChange={(e) => {
              // Copier les fichiers AVANT de vider le champ : vider le champ vide aussi sa FileList (Chrome, Edge).
              const fichiers = Array.from(e.target.files ?? []);
              e.target.value = "";
              ajouter(fichiers);
            }}
            className="sr-only"
          />
        </label>
        </ZoneDepotImages>
      )}

      {avertissement && <p className="ecg-erreur">{avertissement}</p>}
    </div>
  );
}
