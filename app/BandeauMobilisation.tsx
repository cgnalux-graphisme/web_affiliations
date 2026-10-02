"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, Zap } from "lucide-react";
import {
  cheminMobilisation,
  dateMobilisation,
  finMiseEnAvant,
  lienValide,
  type MobilisationPublique,
} from "../lib/mobilisations";

const CLE = "bandeau-mobilisation-ferme";

/**
 * Barre fine en haut de toutes les pages publiques quand une mobilisation est mise en avant (vue non vide).
 * Refermable : mémorisé pour la session du navigateur, par mobilisation (une nouvelle réapparaît).
 * Masquée dans l'espace admin, sur la connexion et sur la page campagne elle-même.
 */
export default function BandeauMobilisation({
  m,
}: {
  m: Pick<MobilisationPublique, "id" | "titre" | "slug" | "date_evenement" | "lien_inscription">;
}) {
  const chemin = usePathname();
  const router = useRouter();
  const [ferme, setFerme] = useState(false);
  const [termine, setTermine] = useState(false);
  const admin = chemin.startsWith("/suivi-actions") || chemin.startsWith("/login");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLE) === m.id) setFerme(true);
    } catch {
      // Stockage indisponible (navigation privée stricte) : le bandeau reste affiché.
    }
  }, [m.id]);

  // Fin de la mise en avant (1 h après l'heure de l'événement) : le serveur ne la renvoie plus, mais une page
  // déjà ouverte ou encore en cache la montrerait. Le bandeau se retire et la page est rechargée sans elle.
  useEffect(() => {
    const fin = finMiseEnAvant(m.date_evenement);
    if (fin === null) return;
    const terminer = () => {
      setTermine(true);
      if (!admin) router.refresh();
    };
    const reste = fin - Date.now();
    if (reste <= 0) {
      terminer();
      return;
    }
    if (reste > 2_000_000_000) return; // au-delà de ~23 jours, setTimeout déborde ; la page sera rechargée d'ici là
    const id = window.setTimeout(terminer, reste);
    return () => window.clearTimeout(id);
  }, [m.date_evenement, admin, router]);

  if (!m.slug || termine) return null;
  const page = cheminMobilisation(m.slug);
  if (ferme || admin || chemin === page) return null;

  function fermer() {
    setFerme(true);
    try {
      sessionStorage.setItem(CLE, m.id);
    } catch {
      // Sans stockage : fermé jusqu'au prochain chargement de page.
    }
  }

  const date = dateMobilisation(m.date_evenement, false);
  const inscription = lienValide(m.lien_inscription) ? m.lien_inscription : null;
  const lienCta =
    "shrink-0 rounded-full bg-white px-3.5 py-1 text-[14px] font-bold text-militant-bordeaux transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-militant-bordeaux";

  return (
    <aside aria-label="Mobilisation en cours" className="relative z-50 bg-militant-bordeaux font-barlow text-white">
      <div className="mx-auto flex min-h-[44px] max-w-7xl items-center gap-3 py-1.5 pl-4 pr-1.5 sm:pl-6 lg:pl-8">
        <Zap size={17} className="shrink-0 fill-militant-rouge text-militant-rouge" aria-hidden />
        <Link
          href={page}
          className="min-w-0 flex-1 truncate text-[14px] font-semibold underline-offset-4 hover:underline focus:outline-none focus-visible:underline sm:text-[15px]"
        >
          <span className="font-bold">{m.titre}</span>
          {date && <span className="tabular-nums"> · {date}</span>}
        </Link>
        {inscription ? (
          <a href={inscription} target="_blank" rel="noopener noreferrer" className={lienCta}>
            Je m&apos;inscris<span className="sr-only"> (nouvel onglet)</span>
          </a>
        ) : (
          <Link href={page} className={lienCta}>
            En savoir plus
          </Link>
        )}
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer le bandeau de mobilisation"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </aside>
  );
}
