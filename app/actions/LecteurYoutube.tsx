"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { lienIntegre, miniature } from "../../lib/youtube";

/**
 * Lecteur YouTube "à la demande" : on affiche la miniature et le lecteur
 * (youtube-nocookie) ne se charge qu'au clic — page plus légère, aucun appel
 * au lecteur YouTube tant que le visiteur ne lance pas la vidéo.
 */
export default function LecteurYoutube({ id, titre }: { id: string; titre: string }) {
  const [lance, setLance] = useState(false);

  return (
    <figure>
      <div className="relative aspect-video w-full overflow-hidden bg-militant-charbon">
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
            onClick={() => setLance(true)}
            aria-label={`Lire la vidéo : ${titre}`}
            className="group absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- miniature YouTube */}
            <img src={miniature(id)} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center bg-militant-rouge text-white transition-colors group-hover:bg-militant-bordeaux sm:h-20 sm:w-20">
                <Play size={34} className="ml-1 fill-current" aria-hidden />
              </span>
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
