"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type Photo = { id: string; url: string; legende: string | null };

/** Photo principale de la une + galerie de vignettes, avec agrandissement plein écran. */
export default function PhotosUne({
  photos,
  titre,
  prioritaire,
}: {
  photos: Photo[];
  titre: string;
  prioritaire?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [ouverte, setOuverte] = useState<number | null>(null);
  const [hero, ...autres] = photos;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (ouverte !== null && !d.open) d.showModal();
    if (ouverte === null && d.open) d.close();
  }, [ouverte]);

  function naviguer(pas: number) {
    setOuverte((i) => (i === null ? null : (i + pas + photos.length) % photos.length));
  }

  const alt = (p: Photo, i: number) => p.legende?.trim() || `${titre} — photo ${i + 1}`;
  const courante = ouverte !== null ? photos[ouverte] : null;

  return (
    <div>
      <figure>
        <button
          type="button"
          onClick={() => setOuverte(0)}
          className="group relative block aspect-[3/2] w-full overflow-hidden bg-militant-charbon focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge"
          aria-label={`Agrandir : ${alt(hero, 0)}`}
        >
          <Image
            src={hero.url}
            alt={alt(hero, 0)}
            fill
            priority={prioritaire}
            sizes="(min-width: 1024px) 720px, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        </button>
        {hero.legende?.trim() && (
          <figcaption className="border-l-4 border-militant-rouge pl-3 pt-2 text-sm italic text-militant-charbon">
            {hero.legende.trim()}
          </figcaption>
        )}
      </figure>

      {autres.length > 0 && (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="Autres photos">
          {autres.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOuverte(i + 1)}
                className="relative block aspect-square w-full overflow-hidden bg-militant-charbon focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge"
                aria-label={`Agrandir : ${alt(p, i + 1)}`}
              >
                <Image
                  src={p.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 140px, 25vw"
                  className="object-cover opacity-90 transition-opacity hover:opacity-100"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={dialogRef}
        onClose={() => setOuverte(null)}
        onClick={(e) => e.target === dialogRef.current && setOuverte(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") naviguer(-1);
          if (e.key === "ArrowRight") naviguer(1);
        }}
        className="m-auto h-full max-h-none w-full max-w-none bg-militant-charbon/95 p-0 text-white backdrop:bg-militant-charbon/80"
        aria-label={titre}
      >
        {courante && ouverte !== null && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-4 py-3 font-condensed text-lg font-bold">
              <span className="tabular-nums text-militant-ardoise">
                {ouverte + 1} / {photos.length}
              </span>
              <button
                type="button"
                onClick={() => setOuverte(null)}
                className="p-2 hover:text-militant-rouge focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
                aria-label="Fermer"
              >
                <X size={28} />
              </button>
            </div>
            <div className="relative min-h-0 flex-1">
              <Image src={courante.url} alt={alt(courante, ouverte)} fill sizes="100vw" className="object-contain" />
              {photos.length > 1 && (
                <>
                  <FlecheGalerie sens="precedente" onClick={() => naviguer(-1)} />
                  <FlecheGalerie sens="suivante" onClick={() => naviguer(1)} />
                </>
              )}
            </div>
            <p className="min-h-[3.5rem] px-4 py-4 text-center text-base">
              {courante.legende?.trim()}
            </p>
          </div>
        )}
      </dialog>
    </div>
  );
}

function FlecheGalerie({ sens, onClick }: { sens: "precedente" | "suivante"; onClick: () => void }) {
  const gauche = sens === "precedente";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={gauche ? "Photo précédente" : "Photo suivante"}
      className={`absolute top-1/2 -translate-y-1/2 ${gauche ? "left-2" : "right-2"} bg-militant-charbon p-2 text-white hover:bg-militant-rouge focus:outline-none focus-visible:ring-2 focus-visible:ring-white`}
    >
      {gauche ? <ChevronLeft size={28} /> : <ChevronRight size={28} />}
    </button>
  );
}
