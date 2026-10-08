"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, X, Zap } from "lucide-react";
import {
  cheminMobilisation,
  dateMobilisation,
  echeance,
  finMiseEnAvant,
  lienValide,
  type MobilisationPublique,
} from "../lib/mobilisations";

const CLE = "bandeau-mobilisation-ferme";

/**
 * Barre fine en haut de toutes les pages publiques quand une mobilisation est mise en avant (vue non vide).
 * Design (refonte du 08/10/2026, demande de Fred) : étiquette rouge en parallélogramme à 10° (l'encart
 * « FGTB » du logo) avec l'éclair et l'échéance (« Demain », « Dans 3 jours »), bouton blanc à flèche.
 * Mouvement : un reflet en biais traverse la barre, l'éclair claque et la flèche avance, trois fois espacées
 * de 7 s, puis plus rien (app/globals.css, « Bandeau de mobilisation ») ; rien en mouvement réduit.
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
  // Échéance calculée dans le navigateur seulement (l'heure du serveur et du cache ne valent pas « aujourd'hui »).
  const [maintenant, setMaintenant] = useState<number | null>(null);
  useEffect(() => setMaintenant(Date.now()), []);
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
  const quand = maintenant === null ? null : echeance(m.date_evenement, maintenant);
  const inscription = lienValide(m.lien_inscription) ? m.lien_inscription : null;
  const lienCta =
    "bandeau-cta group inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full bg-white py-1 pl-3.5 pr-3 text-[14px] font-bold text-militant-bordeaux shadow-[0_6px_16px_-8px_rgba(34,34,34,0.6)] transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-militant-bordeaux";
  const fleche = <ArrowRight size={15} strokeWidth={2.75} className="bandeau-fleche" aria-hidden />;

  return (
    <aside aria-label="Mobilisation en cours" className="bandeau-mobilisation relative z-50 overflow-hidden bg-militant-bordeaux font-barlow text-white">
      {/* Reflet en biais qui traverse la barre (décor). */}
      <span aria-hidden className="bandeau-reflet" />
      <div className="relative mx-auto flex min-h-[48px] max-w-7xl items-stretch gap-3 pl-4 pr-1.5 sm:pl-6 lg:pl-8">
        {/* Étiquette rouge à 10° : l'encart « FGTB » du logo. */}
        <span className="bandeau-etiquette flex shrink-0 items-center gap-1.5 bg-militant-rouge pl-3 pr-4 font-condensed text-[15px] font-extrabold uppercase leading-none tracking-wide">
          <Zap size={17} className="bandeau-eclair shrink-0 fill-white" aria-hidden />
          <span className="hidden sm:inline">Mobilisation</span>
          {quand && <span className="sm:hidden">{quand.court}</span>}
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-3 py-1.5">
          {quand && (
            <span className="hidden shrink-0 rounded-full border-2 border-white px-2.5 py-0.5 font-condensed text-[14px] font-extrabold uppercase leading-none tracking-wide sm:inline-block">
              {quand.long}
            </span>
          )}
          <Link
            href={page}
            className="min-w-0 flex-1 truncate text-[14px] font-semibold underline-offset-4 hover:underline focus:outline-none focus-visible:underline sm:text-[15px]"
          >
            <span className="font-bold">{m.titre}</span>
            {date && <span className="tabular-nums"> · {date}</span>}
          </Link>
          {inscription ? (
            <a href={inscription} target="_blank" rel="noopener noreferrer" className={lienCta}>
              Je m&apos;inscris{fleche}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          ) : (
            <Link href={page} className={lienCta}>
              En savoir plus{fleche}
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
      </div>
    </aside>
  );
}
