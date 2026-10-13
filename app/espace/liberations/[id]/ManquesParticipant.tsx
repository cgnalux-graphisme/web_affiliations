import { TriangleAlert } from "lucide-react";
import type { Manque } from "../../../../lib/liberations/types";

const LIBELLES: Record<Manque, string> = {
  domicile: "sans domicile",
  genre: "genre à préciser",
  registre_national: "sans registre national",
  adresse_employeur: "adresse de l'employeur incomplète",
  email_employeur: "employeur sans e-mail",
};

/** Ce qui manque pour un participant (icône + texte). Sans état : serveur ou client. */
export default function ManquesParticipant({ manques }: { manques: Manque[] }) {
  if (!manques.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Informations manquantes">
      {manques.map((m) => (
        <li key={m} className="ecg-statut ecg-statut-attente">
          <TriangleAlert size={13} aria-hidden /> {LIBELLES[m]}
        </li>
      ))}
    </ul>
  );
}
