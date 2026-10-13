import { Archive, CalendarCheck, CircleCheck, CircleX, Hourglass, MailCheck, PencilLine, Receipt, Send, type LucideIcon } from "lucide-react";
import { tonStatut } from "../../../lib/liberations/statuts";
import { libelleStatut, type StatutLiberation } from "../../../lib/liberations/types";
import { Statut } from "../_partage/ui";

const ICONES: Record<StatutLiberation, LucideIcon> = {
  brouillon: PencilLine, demande: Send, en_traitement: Hourglass, liberation_envoyee: MailCheck, jour_j: CalendarCheck,
  frais: Receipt, cloture: CircleCheck, annule: CircleX, archive: Archive,
};

/** Pastille du statut d'un dossier : icône + texte (jamais la couleur seule). Sans état : serveur ou client. */
export default function StatutDossier({ statut }: { statut: StatutLiberation }) {
  return <Statut ton={tonStatut(statut)} icone={ICONES[statut] ?? PencilLine}>{libelleStatut(statut)}</Statut>;
}
