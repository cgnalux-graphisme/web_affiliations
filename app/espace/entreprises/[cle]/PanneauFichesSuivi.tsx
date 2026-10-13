import Link from "next/link";
import { Plus } from "lucide-react";
import type { LigneFiche } from "../../../../lib/fiches-suivi/types";
import LignesFiches from "../../_partage/LignesFiches";
import { BTN, BTN_PETIT, Panneau } from "../../_partage/ui";

/**
 * Historique de l'entreprise : ses fiches de suivi (événements en usine), puis, repliées, les fiches
 * sectorielles de son secteur. Affiché seulement aux personnes qui ont l'app « Accès permanents ».
 */
export default function PanneauFichesSuivi({ ficheId, usine, secteur, nomSecteur }: {
  ficheId: string | null;
  usine: LigneFiche[];
  secteur: LigneFiche[];
  nomSecteur: string | null;
}) {
  return (
    <Panneau id="fiches-suivi" titre="Fiches de suivi" corps={false}
      sousTitre="L'historique des actions syndicales dans l'entreprise, du plus récent au plus ancien."
      actions={ficheId ? (
        <Link href={`/espace/permanents/fiches/nouvelle?entreprise=${ficheId}`} className={`${BTN} ${BTN_PETIT}`}>
          <Plus size={15} aria-hidden /> Nouvelle fiche
        </Link>
      ) : undefined}>
      <div className="px-5 pb-2">
        {usine.length ? <LignesFiches lignes={usine} lieu={false} /> : <p className="ecg-texte-doux py-3">Aucune fiche pour cette entreprise.</p>}
      </div>
      {secteur.length > 0 && (
        <details className="border-t px-5 py-3">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">
            Fiches sectorielles{nomSecteur ? ` (${nomSecteur})` : ""} : {secteur.length}
          </summary>
          <LignesFiches lignes={secteur} lieu={false} />
        </details>
      )}
    </Panneau>
  );
}
