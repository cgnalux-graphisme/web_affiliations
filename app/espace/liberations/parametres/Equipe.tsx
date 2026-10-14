"use client";

import { UserRound } from "lucide-react";
import { libelleRole } from "../../../../lib/espace/roles";
import { enregistrerProfilEquipe } from "../courriers-actions";
import ChampsEdition from "../../_partage/ChampsEdition";
import { Panneau } from "../../_partage/ui";

type Membre = { id: string; nom: string; email: string; role: string; fonction: string; telephone: string };

/** Fonction (signature des courriers du permanent) et téléphone (« Votre correspondant ») de chaque membre de l'équipe. */
export default function Equipe({ membres }: { membres: Membre[] }) {
  const incomplets = membres.filter((m) => (m.role === "PERMANENT" && !m.fonction) || (m.role !== "PERMANENT" && !m.telephone)).length;
  return (
    <Panneau titre="Équipe : signatures et correspondants"
      sousTitre={`La fonction signe les courriers du permanent qui a fait la demande ; le téléphone apparaît dans « Votre correspondant » quand la personne traite le dossier.${incomplets ? ` ${incomplets} à compléter.` : ""}`}>
      <ul className="grid gap-2">
        {membres.map((m) => (
          <li key={m.id}>
            <details className="rounded-xl border border-[var(--ecg-trait)] p-3">
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                <UserRound size={16} aria-hidden />
                <b>{m.nom || m.email}</b>
                <span className="ecg-texte-doux text-sm">{libelleRole(m.role)}{m.fonction ? ` · ${m.fonction}` : ""}{m.telephone ? ` · ${m.telephone}` : ""}</span>
              </summary>
              <div className="mt-3 border-t border-[var(--ecg-trait)] pt-3">
                <ChampsEdition id={`equipe-${m.id}`} valeurs={m} enregistrer={(v) => enregistrerProfilEquipe(m.id, v)}
                  champs={[
                    { nom: "fonction", libelle: "Fonction (signature)", largeur: "demi", exemple: "Secrétaire permanent" },
                    { nom: "telephone", libelle: "Téléphone (correspondant)", type: "tel", largeur: "demi", exemple: "+32 (0) 81 64 99 64" },
                  ]} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </Panneau>
  );
}
