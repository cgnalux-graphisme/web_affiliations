import Link from "next/link";
import { Building2, Mail } from "lucide-react";
import type { DossierAffiche } from "../../../../lib/liberations/donnees-serveur";
import { Panneau, Vide } from "../../_partage/ui";
import ManquesParticipant from "./ManquesParticipant";
import CompleterDelegue from "./CompleterDelegue";

/**
 * Participants d'un dossier (lecture) : entreprise, employeur à qui écrire (adresse et e-mail), ce qui manque.
 * « Compléter » écrit sur la carte du délégué ; l'adresse ou l'e-mail de l'employeur se complète dans l'app Entreprises.
 */
export default function ParticipantsLecture({ dossier }: { dossier: DossierAffiche }) {
  return (
    <Panneau titre={`Participants (${dossier.participants.length})`}>
      {dossier.participants.length ? (
        <ul className="ecg-lignes">
          {dossier.participants.map((p) => {
            const nom = [p.prenom, p.nom].filter(Boolean).join(" ");
            const employeurIncomplet = p.manques.includes("adresse_employeur") || p.manques.includes("email_employeur");
            return (
              <li key={p.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
                <div className="grid min-w-0 gap-1.5">
                  <span>
                    {p.delegue_id ? <Link href={`/espace/delegues/${p.delegue_id}`} className="ecg-lien font-semibold">{nom}</Link> : <b>{nom}</b>}
                    <span className="ecg-texte-doux"> · {p.entreprise || "Entreprise inconnue"}</span>
                  </span>
                  {p.employeurAdresse.length > 0 && (
                    <span className="ecg-texte-doux inline-flex items-start gap-1 text-sm">
                      <Building2 size={14} aria-hidden className="mt-0.5 flex-none" /> {p.employeurAdresse.join(", ")}
                    </span>
                  )}
                  {p.employeurEmail && (
                    <span className="ecg-texte-doux inline-flex items-center gap-1 break-all text-sm"><Mail size={14} aria-hidden className="flex-none" /> {p.employeurEmail}</span>
                  )}
                  <ManquesParticipant manques={p.manques} />
                  {employeurIncomplet && p.entrepriseId && (
                    <Link href={`/espace/entreprises/${p.entrepriseId}`} className="ecg-lien text-sm">Compléter l&apos;employeur dans l&apos;app Entreprises</Link>
                  )}
                </div>
                {p.fiche && <CompleterDelegue participantId={p.id} nom={nom} fiche={p.fiche} />}
              </li>
            );
          })}
        </ul>
      ) : (
        <Vide icone="id-card" titre="Aucun participant." />
      )}
    </Panneau>
  );
}
