import Link from "next/link";
import { CircleCheck, Factory, Network, PencilLine } from "lucide-react";
import { libelleDate } from "../../../lib/fiches-suivi/regles";
import { libelleStatut, libelleType, type LigneFiche } from "../../../lib/fiches-suivi/types";
import { Statut } from "./ui";

/** Liste de fiches de suivi (app Accès permanents, historique de la fiche entreprise). Sans état : serveur ou client. */
export default function LignesFiches({ lignes, lieu = true }: { lignes: LigneFiche[]; lieu?: boolean }) {
  return (
    <ul className="ecg-lignes">
      {lignes.map((f) => {
        const Icone = f.type === "usine" ? Factory : Network;
        const ou = f.type === "usine" ? f.entreprise : f.secteur;
        return (
          <li key={f.id} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <div className="grid min-w-0 gap-0.5">
              <Link href={`/espace/permanents/fiches/${f.id}`} className="ecg-lien font-semibold">
                {f.titre?.trim() || "Fiche sans titre"}
              </Link>
              <span className="ecg-texte-doux flex flex-wrap items-center gap-x-2 text-sm">
                <span className="inline-flex items-center gap-1"><Icone size={14} aria-hidden /> {libelleType(f.type)}</span>
                {f.date_debut && <span className="tabular-nums">· {libelleDate(f.date_debut, f.date_fin)}</span>}
                {lieu && ou && <span>· {ou}</span>}
                {f.auteur && <span>· {f.auteur}</span>}
              </span>
            </div>
            <Statut ton={f.statut === "terminee" ? "ok" : "attente"} icone={f.statut === "terminee" ? CircleCheck : PencilLine}>
              {libelleStatut(f.statut)}
            </Statut>
          </li>
        );
      })}
    </ul>
  );
}
