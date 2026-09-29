"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { lienIntegre, miniature } from "../../lib/youtube";
import { autoriser, useConsentement } from "../useConsentement";

/**
 * Lecteur YouTube "à la demande" : le lecteur (youtube-nocookie) ne se charge qu'au clic.
 * Vidéos soumises au consentement (catégorie « videos », /cookies) : sans accord, ni miniature ni lecteur
 * (aucune requête vers YouTube) ; le bouton « Autoriser YouTube et lire » vaut accord pour les vidéos seulement.
 */
export default function LecteurYoutube({ id, titre }: { id: string; titre: string }) {
  const [lance, setLance] = useState(false);
  const { autorise } = useConsentement();
  const permis = autorise("videos");

  function lire() {
    if (!permis) autoriser("videos");
    setLance(true);
  }

  return (
    <figure>
      <div className="relative aspect-video w-full overflow-hidden bg-militant-ardoise">
        {lance ? (
          <iframe
            src={lienIntegre(id)}
            title={titre}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={lire}
            aria-label={permis ? `Lire la vidéo : ${titre}` : `Autoriser YouTube et lire la vidéo : ${titre}`}
            className="group absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge"
          >
            {permis && (
              // eslint-disable-next-line @next/next/no-img-element -- miniature YouTube
              <img src={miniature(id)} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <span className="flex h-16 w-16 items-center justify-center bg-militant-rouge text-white transition-colors group-hover:bg-militant-bordeaux sm:h-20 sm:w-20">
                <Play size={34} className="ml-1 fill-current" aria-hidden />
              </span>
              {!permis && (
                <span className="rounded bg-white px-2.5 py-1 text-center text-[13px] font-semibold text-militant-charbon">
                  Autoriser YouTube et lire — YouTube peut déposer des cookies
                </span>
              )}
            </span>
          </button>
        )}
      </div>
      <figcaption className="border-l-4 border-militant-rouge pl-3 pt-2 text-sm font-semibold text-militant-charbon">
        {titre}
      </figcaption>
    </figure>
  );
}
