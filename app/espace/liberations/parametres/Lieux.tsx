"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, MapPin, Trash2 } from "lucide-react";
import { lignesAdresse } from "../../../../lib/liberations/regles";
import type { Lieu } from "../../../../lib/liberations/types";
import { basculerLieu, enregistrerLieu, supprimerLieu } from "../actions";
import ChampsEdition, { type DefChamp } from "../../_partage/ChampsEdition";
import { Confirmation } from "../../_partage/Fenetres";
import { IconeChargement } from "../../../Chargement";
import { BTN, BTN_PETIT, Panneau, Statut } from "../../_partage/ui";

const CHAMPS: DefChamp[] = [
  { nom: "nom", libelle: "Nom du lieu", largeur: "demi", exemple: "Centrale Générale Namur" },
  { nom: "complement", libelle: "Précision (facultatif)", largeur: "demi", exemple: "Espace Solidarité" },
  { nom: "rue", libelle: "Rue", type: "rue", largeur: "demi", aide: "Tapez 3 lettres : choisissez l'adresse proposée, le reste se remplit.",
    cibles: { numero: "numero", code_postal: "code_postal", localite: "localite" } },
  { nom: "numero", libelle: "Numéro", largeur: "tiers" },
  { nom: "boite", libelle: "Boîte", largeur: "tiers" },
  { nom: "code_postal", libelle: "Code postal", largeur: "tiers" },
  { nom: "localite", libelle: "Localité", largeur: "demi" },
];

/** Lieux proposés dans les demandes : modifier, ne plus proposer (les anciens dossiers gardent leur adresse), supprimer, ajouter. */
export default function Lieux({ lieux }: { lieux: Lieu[] }) {
  const router = useRouter();
  const [nouveau, setNouveau] = useState(0);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<Lieu | null>(null);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);

  async function agir(cle: string, action: () => Promise<{ ok: true; message?: string } | { ok: false; erreur: string }>) {
    setEnCours(cle);
    const r = await action().catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(null);
    setMessage(r.ok ? { ton: "ok", texte: r.message ?? "C'est fait." } : { ton: "erreur", texte: r.erreur });
    router.refresh();
  }

  return (
    <Panneau titre={`Lieux (${lieux.length})`} sousTitre="Leur adresse est copiée dans chaque demande et servira au calcul des kilomètres.">
      <div className="grid gap-3">
        <ul className="grid gap-2">
          {lieux.map((l) => (
            <li key={l.id}>
              <details className="rounded-xl border border-[var(--ecg-trait)] p-3">
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                  <MapPin size={16} aria-hidden />
                  <b>{l.nom}</b>
                  <span className="ecg-texte-doux text-sm">{lignesAdresse(l).join(", ")}</span>
                  {!l.actif && <Statut icone={EyeOff}>Plus proposé</Statut>}
                </summary>
                <div className="mt-3 grid gap-3 border-t border-[var(--ecg-trait)] pt-3">
                  <ChampsEdition id={`lieu-${l.id}`} champs={CHAMPS} valeurs={l} enregistrer={(v) => enregistrerLieu(l.id, v)} />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={`${BTN} ${BTN_PETIT}`} disabled={enCours !== null} onClick={() => agir(`b-${l.id}`, () => basculerLieu(l.id, !l.actif))}>
                      {enCours === `b-${l.id}` ? <IconeChargement size={15} /> : l.actif ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
                      {l.actif ? "Ne plus proposer" : "Proposer de nouveau"}
                    </button>
                    <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`} disabled={enCours !== null} onClick={() => setASupprimer(l)}>
                      <Trash2 size={15} aria-hidden /> Supprimer
                    </button>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
        {message && <p role={message.ton === "erreur" ? "alert" : "status"} className={message.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{message.texte}</p>}
        <details className="rounded-xl bg-[var(--ecg-fond)] p-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">Ajouter un lieu</summary>
          <div className="mt-3">
            <ChampsEdition key={nouveau} id={`lieu-nouveau-${nouveau}`} champs={CHAMPS} valeurs={{}} libelleBouton="Ajouter le lieu"
              enregistrer={(v) => enregistrerLieu(null, v)} onSucces={() => setNouveau((n) => n + 1)} />
          </div>
        </details>
      </div>
      <Confirmation ouverte={aSupprimer !== null} danger titre={`Supprimer « ${aSupprimer?.nom ?? ""} » ?`} libelleConfirmer="Supprimer"
        onAnnuler={() => setASupprimer(null)}
        onConfirmer={() => { const l = aSupprimer; setASupprimer(null); if (l) agir(`s-${l.id}`, () => supprimerLieu(l.id)); }}>
        <p>Le lieu disparaît de la liste. Les demandes qui l&apos;utilisent gardent son adresse. Pour le masquer sans le supprimer, utilisez « Ne plus proposer ».</p>
      </Confirmation>
    </Panneau>
  );
}
