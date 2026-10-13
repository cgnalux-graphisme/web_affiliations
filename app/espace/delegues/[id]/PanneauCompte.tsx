"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleSlash, Clock, Link2Off, Lock, LockOpen, Mail, Send, UserPlus, UserX, X, type LucideIcon } from "lucide-react";
import type { CarteDelegue } from "../../../../lib/delegues/donnees-serveur";
import { LIBELLES_COMPTE } from "../../../../lib/delegues/delegue";
import type { EtatCompte } from "../../../../lib/delegues/types";
import { isoToDateFr } from "../../../../lib/dates";
import { annulerInvitation, changerAcces, envoyerVersCgLink, inviterDelegue, renvoyerInvitation, retirerLienCgLink } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { BTN, BTN_PRINCIPAL, Panneau, Statut } from "../../_partage/ui";

type Retour = { ok: true; message?: string } | { ok: false; erreur: string };
type Action = { cle: string; libelle: string; icone: LucideIcon; faire: () => Promise<Retour>; principal?: boolean; confirmation?: string; danger?: boolean };

const ICONE: Record<EtatCompte, LucideIcon> = { actif: CircleCheck, invite: Clock, bloque: CircleSlash, sans_compte: UserX, introuvable: UserX };
const TON = { actif: "ok", invite: "attente", bloque: "erreur", sans_compte: undefined, introuvable: "erreur" } as const;

const dateHeure = (iso: string) =>
  `${isoToDateFr(iso.slice(0, 10))} ${new Date(iso).toLocaleTimeString("fr-BE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" })}`;

/** Compte CG Link du délégué : état et actions (inviter, renvoyer, annuler, bloquer, rétablir, envoyer, retirer le lien). */
export default function PanneauCompte({ carte }: { carte: CarteDelegue }) {
  const router = useRouter();
  const { delegue: d, compte } = carte;
  const [enCours, setEnCours] = useState<string | null>(null);
  const [aConfirmer, setAConfirmer] = useState<Action | null>(null);
  const [retour, setRetour] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);

  async function executer(a: Action) {
    setAConfirmer(null);
    setEnCours(a.cle);
    setRetour(null);
    let r: Retour;
    try {
      r = await a.faire();
    } catch {
      r = { ok: false, erreur: "CG Link n'a pas répondu. Réessayez dans un instant." };
    }
    setEnCours(null);
    setRetour(r.ok ? { ton: "ok", texte: r.message ?? "C'est fait." } : { ton: "erreur", texte: r.erreur });
    if (r.ok) router.refresh();
  }

  const raisonInvitation = !d.email ? "Indiquez d'abord l'e-mail du délégué." : !carte.ficheLiee ? "Reliez d'abord l'entreprise à CG Link (app Entreprises)." : null;
  const actions: Action[] = [];
  if (compte.etat === "sans_compte" && !raisonInvitation) {
    actions.push({ cle: "inviter", libelle: "Inviter dans CG Link", icone: UserPlus, principal: true, faire: () => inviterDelegue(d.id),
      confirmation: `Envoyer l'invitation CG Link à ${d.email} ? Le délégué recevra un e-mail avec son code d'activation.` });
  }
  if (compte.etat === "invite") {
    actions.push({ cle: "renvoyer", libelle: "Renvoyer l'invitation", icone: Mail, faire: () => renvoyerInvitation(d.id) });
    actions.push({ cle: "annuler", libelle: "Annuler l'invitation", icone: X, danger: true, faire: () => annulerInvitation(d.id),
      confirmation: "Annuler l'invitation ? Le compte CG Link est supprimé ; le délégué reste dans l'Espace." });
  }
  if (compte.etat === "actif" || compte.etat === "invite") {
    actions.push({ cle: "bloquer", libelle: "Bloquer l'accès", icone: Lock, danger: true, faire: () => changerAcces(d.id, false),
      confirmation: "Bloquer l'accès à CG Link ? Le délégué ne pourra plus se connecter (une session ouverte expire dans l'heure)." });
  }
  if (compte.etat === "bloque") actions.push({ cle: "retablir", libelle: "Rétablir l'accès", icone: LockOpen, principal: true, faire: () => changerAcces(d.id, true) });
  if (compte.etat === "introuvable") {
    actions.push({ cle: "retirer", libelle: "Retirer le lien", icone: Link2Off, faire: () => retirerLienCgLink(d.id),
      confirmation: "Le compte n'existe plus dans CG Link. Retirer le lien de ce délégué ?" });
  }
  if (["actif", "invite", "bloque"].includes(compte.etat)) {
    actions.push({ cle: "envoyer", libelle: "Envoyer la carte à CG Link", icone: Send, faire: () => envoyerVersCgLink(d.id) });
  }

  return (
    <Panneau id="compte" titre="Compte CG Link"
      sousTitre="Nom, téléphone et mandats sont envoyés à CG Link après chaque modification ; l'e-mail (adresse de connexion) jamais.">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Statut ton={TON[compte.etat]} icone={ICONE[compte.etat]}>{LIBELLES_COMPTE[compte.etat]}</Statut>
          {compte.invitedAt && <span className="text-sm">Invité le {isoToDateFr(new Date(compte.invitedAt).toISOString().slice(0, 10))}</span>}
          {compte.derniereConnexion && <span className="text-sm">Dernière connexion : {dateHeure(compte.derniereConnexion)}</span>}
        </div>
        {compte.etat === "sans_compte" && raisonInvitation && <p className="ecg-texte-doux text-sm">Invitation impossible : {raisonInvitation}</p>}
        {aConfirmer ? (
          <div role="alertdialog" aria-labelledby="confirmer-compte" className="grid gap-2 rounded-xl bg-[var(--ecg-fond)] p-3">
            <b id="confirmer-compte">{aConfirmer.confirmation}</b>
            <div className="flex flex-wrap gap-2">
              <button type="button" autoFocus onClick={() => executer(aConfirmer)} className={aConfirmer.danger ? `${BTN} ecg-btn-danger` : BTN_PRINCIPAL}>Confirmer</button>
              <button type="button" onClick={() => setAConfirmer(null)} className={BTN}>Annuler</button>
            </div>
          </div>
        ) : (
          actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => (
                <button key={a.cle} type="button" disabled={enCours !== null}
                  onClick={() => (a.confirmation ? setAConfirmer(a) : executer(a))}
                  className={a.principal ? BTN_PRINCIPAL : a.danger ? `${BTN} ecg-btn-danger-contour` : BTN}>
                  {enCours === a.cle ? <IconeChargement size={15} /> : <a.icone size={15} aria-hidden />} {a.libelle}
                </button>
              ))}
            </div>
          )
        )}
        {retour && <p role={retour.ton === "erreur" ? "alert" : "status"} className={retour.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{retour.texte}</p>}
      </div>
    </Panneau>
  );
}
