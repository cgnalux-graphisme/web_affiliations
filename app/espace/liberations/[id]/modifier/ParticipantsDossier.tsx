"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Trash2, UserPlus } from "lucide-react";
import type { DelegueChoix, DossierAffiche, EntrepriseChoix } from "../../../../../lib/liberations/donnees-serveur";
import { ajouterParticipants, retirerParticipant } from "../../actions";
import { IconeChargement } from "../../../../Chargement";
import { PanneauLateral } from "../../../_partage/Fenetres";
import { BTN, BTN_PETIT, BTN_PRINCIPAL, CHAMP, LIBELLE, Panneau, Vide } from "../../../_partage/ui";
import ManquesParticipant from "../ManquesParticipant";

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Participants du dossier : uniquement des délégués (app Délégués), ceux des entreprises du permanent (tous pour un
 * admin). Ajout dans une fenêtre latérale : recherche par nom, filtres entreprise et secteur, cases à cocher.
 */
export default function ParticipantsDossier({ dossier, delegues, entreprises, secteurs, modifiable }: {
  dossier: DossierAffiche;
  delegues: DelegueChoix[];
  entreprises: EntrepriseChoix[];
  secteurs: { id: string; nom: string }[];
  modifiable: boolean;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [q, setQ] = useState("");
  const [entreprise, setEntreprise] = useState("");
  const [secteur, setSecteur] = useState("");
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: "ok" | "erreur"; texte: string } | null>(null);

  const deja = useMemo(() => new Set(dossier.participants.map((p) => p.delegue_id)), [dossier.participants]);
  const disponibles = delegues.filter((d) => !deja.has(d.id));
  const entreprisesProposees = entreprises.filter((e) => disponibles.some((d) => d.entrepriseId === e.id));
  const visibles = useMemo(() => disponibles.filter((d) =>
    (!entreprise || d.entrepriseId === entreprise) &&
    (!secteur || d.secteurId === secteur) &&
    (!q.trim() || sansAccents(`${d.prenom ?? ""} ${d.nom} ${d.entreprise}`).includes(sansAccents(q.trim())))
  ), [disponibles, entreprise, secteur, q]);

  function basculer(id: string) {
    setCoches((x) => {
      const n = new Set(x);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function ajouter(fermer: () => void) {
    setEnCours("ajout");
    const r = await ajouterParticipants(dossier.id, [...coches]).catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(null);
    setMessage(r.ok ? { ton: "ok", texte: r.message ?? "Ajouté." } : { ton: "erreur", texte: r.erreur });
    if (r.ok) {
      setCoches(new Set());
      fermer();
      router.refresh();
    }
  }

  async function retirer(id: string) {
    setEnCours(id);
    const r = await retirerParticipant(id).catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(null);
    setMessage(r.ok ? null : { ton: "erreur", texte: r.erreur });
    router.refresh();
  }

  return (
    <Panneau titre={`Participants (${dossier.participants.length})`}
      sousTitre="Les délégués à libérer. Un participant doit d'abord exister dans l'app Délégués."
      actions={modifiable && (
        <button type="button" className={BTN_PRINCIPAL} onClick={() => setOuvert(true)}>
          <UserPlus size={16} aria-hidden /> Ajouter des participants
        </button>
      )}>
      <div className="grid gap-3">
        {dossier.participants.length ? (
          <ul className="ecg-lignes">
            {dossier.participants.map((p) => (
              <li key={p.id} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="grid min-w-0 gap-1">
                  <span><b>{[p.prenom, p.nom].filter(Boolean).join(" ")}</b> <span className="ecg-texte-doux">· {p.entreprise || "Entreprise inconnue"}</span></span>
                  <ManquesParticipant manques={p.manques} />
                </div>
                {modifiable && (
                  <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`} disabled={enCours !== null} onClick={() => retirer(p.id)}>
                    {enCours === p.id ? <IconeChargement size={15} /> : <Trash2 size={15} aria-hidden />} Retirer
                    <span className="sr-only"> {[p.prenom, p.nom].filter(Boolean).join(" ")}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Vide icone="id-card" titre="Aucun participant pour le moment.">Ajoutez les délégués à libérer.</Vide>
        )}
        {message && <p role={message.ton === "erreur" ? "alert" : "status"} className={message.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>{message.texte}</p>}
      </div>

      <PanneauLateral ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Ajouter des participants"
        sousTitre={`${disponibles.length} délégué${disponibles.length > 1 ? "s" : ""} disponible${disponibles.length > 1 ? "s" : ""}`}
        pied={(fermer) => (
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={BTN_PRINCIPAL} disabled={!coches.size || enCours !== null} onClick={() => ajouter(fermer)}>
              {enCours === "ajout" ? <IconeChargement size={16} /> : <UserPlus size={16} aria-hidden />}
              {coches.size ? `Ajouter ${coches.size} participant${coches.size > 1 ? "s" : ""}` : "Cochez des délégués"}
            </button>
            <button type="button" className={BTN} onClick={fermer}>Fermer</button>
          </div>
        )}>
        <div className="grid gap-3">
          <div>
            <label htmlFor="recherche-delegue" className={LIBELLE}>Rechercher par nom</label>
            <div className="relative">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="recherche-delegue" type="search" value={q} onChange={(e) => setQ(e.target.value)} className={`${CHAMP} pl-9`}
                placeholder="Nom, prénom ou entreprise…" autoComplete="off" data-focus-initial />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="filtre-entreprise" className={LIBELLE}>Entreprise</label>
              <select id="filtre-entreprise" className={CHAMP} value={entreprise} onChange={(e) => setEntreprise(e.target.value)}>
                <option value="">Toutes</option>
                {entreprisesProposees.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filtre-secteur" className={LIBELLE}>Secteur</label>
              <select id="filtre-secteur" className={CHAMP} value={secteur} onChange={(e) => setSecteur(e.target.value)}>
                <option value="">Tous</option>
                {secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
          </div>
          <p className="sr-only" aria-live="polite">{visibles.length} délégué(s) affiché(s)</p>
          {visibles.length ? (
            <ul className="grid gap-2">
              {visibles.map((d) => (
                <li key={d.id}>
                  <label className={`ecg-choix${coches.has(d.id) ? " ecg-choix-actif" : ""}`}>
                    <input type="checkbox" checked={coches.has(d.id)} onChange={() => basculer(d.id)} />
                    <span className="grid">
                      <b>{[d.prenom, d.nom].filter(Boolean).join(" ")}</b>
                      <span className="ecg-texte-doux text-sm">{d.entreprise}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ecg-texte-doux">{disponibles.length ? "Aucun délégué ne correspond." : "Tous les délégués disponibles sont déjà dans le dossier."}</p>
          )}
        </div>
      </PanneauLateral>
    </Panneau>
  );
}
