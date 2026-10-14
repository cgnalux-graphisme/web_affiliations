"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, CircleX, Hourglass, Lock, MailCheck, Receipt, RotateCcw, Send, Trash2, type LucideIcon } from "lucide-react";
import { ACTIONS, type CodeAction } from "../../../../lib/liberations/statuts";
import { changerStatut, supprimerDossier } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { Confirmation } from "../../_partage/Fenetres";
import { BTN, BTN_PRINCIPAL } from "../../_partage/ui";

const ICONES: Record<CodeAction, LucideIcon> = {
  soumettre: Send, remettre_brouillon: RotateCcw, prendre_en_charge: Hourglass, marquer_envoyee: MailCheck, passer_aux_frais: Receipt, cloturer: Lock,
  annuler: CircleX, archiver: Archive, desarchiver: ArchiveRestore,
};

/** Boutons du parcours (selon le statut et la personne), avec confirmation pour ce qui ne se défait pas d'un clic. */
export default function ActionsDossier({ id, actions, supprimable, manquesCloture = [] }: {
  id: string; actions: CodeAction[]; supprimable: boolean;
  /** Ce qui manque encore (clôture) : affiché dans la confirmation ; l'admin peut clôturer quand même. */
  manquesCloture?: string[];
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<string | null>(null);
  const [aConfirmer, setAConfirmer] = useState<CodeAction | "supprimer" | null>(null);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);

  async function agir(code: CodeAction | "supprimer") {
    setAConfirmer(null);
    setEnCours(code);
    setMessage(null);
    const r = await (code === "supprimer" ? supprimerDossier(id) : changerStatut(id, code))
      .catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(null);
    if (!r.ok) return setMessage({ ton: "erreur", texte: r.erreur });
    if (code === "supprimer") return router.push("/espace/liberations/dossiers");
    setMessage({ ton: "ok", texte: r.message ?? "C'est fait." });
    router.refresh();
  }

  const demander = (code: CodeAction) => (ACTIONS[code].confirmation ? setAConfirmer(code) : agir(code));
  const principale = actions.find((a) => ["soumettre", "prendre_en_charge", "marquer_envoyee", "cloturer"].includes(a));
  const texteConfirmation = aConfirmer === "supprimer"
    ? "Le brouillon, ses participants et ses pièces jointes seront supprimés. C'est définitif."
    : aConfirmer ? ACTIONS[aConfirmer].confirmation : "";

  return (
    <div className="grid gap-2">
      {actions.map((code) => {
        const Icone = ICONES[code];
        const danger = code === "annuler";
        return (
          <button key={code} type="button" disabled={enCours !== null} onClick={() => demander(code)}
            className={code === principale ? BTN_PRINCIPAL : `${BTN}${danger ? " ecg-btn-fantome ecg-btn-fantome-danger" : ""}`}>
            {enCours === code ? <IconeChargement size={16} /> : <Icone size={16} aria-hidden />} {ACTIONS[code].libelle}
          </button>
        );
      })}
      {supprimable && (
        <button type="button" disabled={enCours !== null} onClick={() => setAConfirmer("supprimer")} className={`${BTN} ecg-btn-fantome ecg-btn-fantome-danger`}>
          {enCours === "supprimer" ? <IconeChargement size={16} /> : <Trash2 size={16} aria-hidden />} Supprimer le brouillon
        </button>
      )}
      {message && <p role={message.ton === "erreur" ? "alert" : "status"} className={message.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{message.texte}</p>}
      <Confirmation ouverte={aConfirmer !== null} danger={aConfirmer === "annuler" || aConfirmer === "supprimer"}
        titre={aConfirmer === "supprimer" ? "Supprimer le brouillon ?" : aConfirmer ? `${ACTIONS[aConfirmer].libelle} ?` : ""}
        libelleConfirmer={aConfirmer === "supprimer" ? "Supprimer" : aConfirmer === "cloturer" && manquesCloture.length ? "Clôturer quand même" : aConfirmer ? ACTIONS[aConfirmer].libelle : ""}
        onAnnuler={() => setAConfirmer(null)} onConfirmer={() => aConfirmer && agir(aConfirmer)}>
        <p>{texteConfirmation}</p>
        {aConfirmer === "cloturer" && manquesCloture.length > 0 && (
          <div className="mt-3">
            <p className="font-semibold">Il manque encore :</p>
            <ul className="list-disc pl-5">{manquesCloture.map((m) => <li key={m}>{m}</li>)}</ul>
            <p className="mt-2">Vous pouvez clôturer quand même (délégué absent, ticket perdu…).</p>
          </div>
        )}
      </Confirmation>
    </div>
  );
}
