"use client";

import React from "react";
import { Plus, X, Youtube } from "lucide-react";
import type { VideoEdition } from "./lib/videos-sync";
import { idYoutube, lienCanonique, miniature } from "./lib/youtube";

export const MESSAGE_LIEN_INVALIDE =
  "Ce lien n'est pas une vidéo YouTube. Collez l'adresse de la vidéo (youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…).";

/** Transforme un lien collé en vidéo à ajouter, ou null si ce n'est pas un lien YouTube. */
export function videoDepuisLien(lien: string, titre = ""): VideoEdition | null {
  const id = idYoutube(lien);
  return id ? { cle: crypto.randomUUID(), url: lienCanonique(id), titre } : null;
}

/**
 * Vidéos YouTube d'une action : ajout par lien collé (+ titre facultatif), titres
 * modifiables, retrait. Les changements ne sont appliqués qu'à l'enregistrement.
 */
export default function ChoixVideos({
  videos,
  onChange,
  saisie,
  onSaisie,
  erreur,
  onErreur,
  disabled,
}: {
  videos: VideoEdition[];
  onChange: (videos: VideoEdition[]) => void;
  saisie: { lien: string; titre: string };
  onSaisie: (saisie: { lien: string; titre: string }) => void;
  erreur?: string;
  onErreur: (erreur: string | undefined) => void;
  disabled?: boolean;
}) {
  function ajouter() {
    if (!saisie.lien.trim()) {
      onErreur("Collez le lien de la vidéo YouTube.");
      return;
    }
    const video = videoDepuisLien(saisie.lien, saisie.titre);
    if (!video) {
      onErreur(MESSAGE_LIEN_INVALIDE);
      return;
    }
    if (videos.some((v) => v.url === video.url)) {
      onErreur("Cette vidéo est déjà dans la liste.");
      return;
    }
    onChange([...videos, video]);
    onSaisie({ lien: "", titre: "" });
    onErreur(undefined);
  }

  const champ = "ecg-champ";

  return (
    <div className="space-y-4">
      {videos.length > 0 && (
        <ul className="space-y-3">
          {videos.map((v, i) => {
            const id = idYoutube(v.url);
            return (
              <li key={v.cle} className="ecg-media">
                {id && (
                  // eslint-disable-next-line @next/next/no-img-element -- miniature YouTube
                  <img
                    src={miniature(id)}
                    alt=""
                    className="aspect-video w-28 shrink-0 rounded-lg bg-[#e3e7eb] object-cover sm:w-36"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ecg-lien min-w-0 truncate text-[13px]"
                    >
                      {v.url}
                    </a>
                    <div className="flex shrink-0 items-center gap-1">
                      {!v.id && <span className="text-[13px] font-semibold">(nouvelle)</span>}
                      <button
                        type="button"
                        onClick={() => onChange(videos.filter((x) => x.cle !== v.cle))}
                        disabled={disabled}
                        aria-label={`Retirer la vidéo ${v.titre || i + 1}`}
                        title="Retirer (appliqué à l'enregistrement)"
                        className="ecg-btn-icone"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <input
                    value={v.titre}
                    onChange={(e) =>
                      onChange(videos.map((x) => (x.cle === v.cle ? { ...x, titre: e.target.value } : x)))
                    }
                    disabled={disabled}
                    maxLength={150}
                    placeholder="Titre (facultatif)"
                    aria-label={`Titre de la vidéo ${i + 1}`}
                    className={champ}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-xl border border-[#dde2e7] bg-[#fafbfc] p-4">
        <p className="mb-3 flex items-center gap-2 text-[14.5px] font-semibold">
          <Youtube size={18} aria-hidden />
          {videos.length ? "Ajouter une autre vidéo" : "Ajouter une vidéo YouTube"}
        </p>
        <div className="space-y-2">
          <input
            type="url"
            inputMode="url"
            value={saisie.lien}
            onChange={(e) => {
              onSaisie({ ...saisie, lien: e.target.value });
              onErreur(undefined);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                ajouter();
              }
            }}
            disabled={disabled}
            placeholder="Lien YouTube, ex. https://youtu.be/…"
            aria-label="Lien de la vidéo YouTube"
            aria-invalid={Boolean(erreur)}
            className={`${champ}${erreur ? " ecg-champ-erreur" : ""}`}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={saisie.titre}
              onChange={(e) => onSaisie({ ...saisie, titre: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ajouter();
                }
              }}
              disabled={disabled}
              maxLength={150}
              placeholder="Titre (facultatif)"
              aria-label="Titre de la nouvelle vidéo"
              className={champ}
            />
            <button
              type="button"
              onClick={ajouter}
              disabled={disabled}
              className="ecg-btn ecg-btn-principal shrink-0"
            >
              <Plus size={16} aria-hidden /> Ajouter la vidéo
            </button>
          </div>
        </div>
        {erreur && <p className="ecg-erreur">{erreur}</p>}
      </div>
    </div>
  );
}
