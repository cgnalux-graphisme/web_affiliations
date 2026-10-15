"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, CircleCheck, CircleSlash, Search, Users } from "lucide-react";
import { isoToDateFr } from "../../../../lib/dates";
import { filtrerTravailleurs, nissAffiche, statutsPresents, type Participation, type Travailleur } from "../../../../lib/entreprises/travailleurs";
import { listerTravailleurs } from "../actions";
import { IconeChargement } from "../../../Chargement";
import { Alerte, BTN, CHAMP, Panneau, Statut, Vide } from "../../_partage/ui";

/**
 * Travailleurs de l'entreprise (table `workers` de CG Link) : rien n'est lu à l'ouverture de la fiche ; le bouton
 * charge la liste (au plus quelques centaines de personnes), puis recherche, filtre par statut et détail de chaque
 * travailleur (toutes ses données en base). Données internes, table protégée (décision de Fred, 15/10/2026).
 */
export default function PanneauTravailleurs({ cle, actifs }: { cle: string; actifs: number | null }) {
  const [liste, setListe] = useState<Travailleur[] | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);

  async function charger() {
    setEnCours(true);
    setErreur("");
    const r = await listerTravailleurs(cle).catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur);
    setListe(r.donnees?.travailleurs ?? []);
  }

  const visibles = useMemo(() => (liste ? filtrerTravailleurs(liste, recherche, statut) : []), [liste, recherche, statut]);
  const statuts = useMemo(() => (liste ? statutsPresents(liste) : []), [liste]);

  return (
    <Panneau id="travailleurs" className="ecg-section" corps={liste === null}
      titre="Travailleurs"
      sousTitre={liste === null
        ? `Liste CG Link de l'entreprise${actifs !== null ? ` (${actifs} actifs)` : ""}, chargée seulement à la demande.`
        : `${liste.length} travailleur${liste.length > 1 ? "s" : ""} dans CG Link. Données internes : ne pas les transmettre.`}>
      {liste === null ? (
        <div className="grid gap-3">
          {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
          <div>
            <button type="button" className={BTN} onClick={charger} disabled={enCours}>
              {enCours ? <IconeChargement size={16} /> : <Users size={16} aria-hidden />}
              {enCours ? "Chargement des travailleurs…" : "Afficher les travailleurs"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 px-5 pt-1">
            <div className="ecg-champ-groupe relative">
              <label htmlFor="recherche-travailleurs" className="sr-only">Rechercher un travailleur</label>
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="recherche-travailleurs" name="recherche-travailleurs" type="search" autoComplete="off" spellCheck={false}
                className={`${CHAMP} pl-9`} placeholder="Nom, prénom, n° d'affiliation ou registre national…"
                value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </div>
            {statuts.length > 1 && (
              <div role="group" aria-label="Filtrer par statut" className="ecg-onglets">
                <button type="button" className="ecg-onglet" aria-pressed={statut === null} onClick={() => setStatut(null)}>
                  Tous <span className="ecg-compte">{liste.length}</span>
                </button>
                {statuts.map((s) => (
                  <button key={s} type="button" className="ecg-onglet" aria-pressed={statut === s} onClick={() => setStatut(s)}>
                    {s} <span className="ecg-compte">{liste.filter((t) => t.statut === s).length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="sr-only" aria-live="polite">{visibles.length} travailleur(s) affiché(s)</p>
          {visibles.length === 0 ? (
            <div className="p-5">
              <Vide icone="list" titre={liste.length ? "Aucun travailleur ne correspond." : "Aucun travailleur dans CG Link pour cette entreprise."}>
                {liste.length ? "Modifiez la recherche ou le filtre." : "Les travailleurs s'encodent dans CG Link."}
              </Vide>
            </div>
          ) : (
            <div className="ecg-tableau-cadre mt-3">
              <table className="ecg-tableau">
                <thead>
                  <tr>
                    <th scope="col">Travailleur</th>
                    <th scope="col">Registre national</th>
                    <th scope="col">N° d&apos;affiliation</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Contrat</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((t) => (
                    <Fragment key={t.id}>
                      <tr>
                        <td>
                          <button type="button" className="ecg-lien inline-flex min-h-11 items-center gap-1.5 text-left font-semibold"
                            aria-expanded={ouvert === t.id} aria-controls={`detail-${t.id}`}
                            onClick={() => setOuvert(ouvert === t.id ? null : t.id)}>
                            <ChevronDown size={16} aria-hidden className={`shrink-0 transition-transform ${ouvert === t.id ? "rotate-180" : ""}`} />
                            {t.nom} {t.prenom}
                          </button>
                        </td>
                        <td className="tabular-nums">{t.niss ? nissAffiche(t.niss) : <span className="ecg-texte-doux">Manquant</span>}</td>
                        <td className="tabular-nums">{t.affiliation ?? <span className="ecg-texte-doux">—</span>}</td>
                        <td>
                          <Statut ton={t.statut === "Actif" ? "ok" : undefined} icone={t.statut === "Actif" ? CircleCheck : CircleSlash}>{t.statut}</Statut>
                        </td>
                        <td>{t.contrat}</td>
                      </tr>
                      {ouvert === t.id && (
                        <tr id={`detail-${t.id}`}>
                          <td colSpan={5} className="bg-[var(--ecg-fond)]">
                            <DetailTravailleur t={t} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Panneau>
  );
}

const date = (iso: string | null) => (iso ? isoToDateFr(iso.slice(0, 10)) : "—");

/** Une participation (grève, action) : ses champs en texte, quelle que soit leur forme dans CG Link. */
function texteParticipation(p: Participation): string {
  return Object.entries(p)
    .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
    .map(([k, v]) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? `${k} : ${date(v)}` : `${k} : ${String(v)}`))
    .join(" · ");
}

function DetailTravailleur({ t }: { t: Travailleur }) {
  const lignes: [string, React.ReactNode][] = [
    ["Prénom et nom", `${t.prenom} ${t.nom}`],
    ["Registre national", t.niss ? nissAffiche(t.niss) : "Manquant"],
    ["N° d'affiliation", t.affiliation ?? "—"],
    ["Statut", t.statut],
    ["Contrat", t.contrat],
    ["Info", t.info ?? "—"],
    ["Communication", t.communication ?? "—"],
    ["Commentaire", t.commentaire || "—"],
    ["Ajouté à la main dans CG Link", t.ajouteMain ? "Oui" : "Non"],
    ["Grèves", t.greves.length ? <ListeParticipations liste={t.greves} /> : "Aucune"],
    ["Actions", t.actions.length ? <ListeParticipations liste={t.actions} /> : "Aucune"],
    ["Créé le", date(t.creeLe)],
    ["Dernière modification", `${date(t.modifieLe)}${t.modifiePar ? `, par ${t.modifiePar}` : ""}`],
    ["Synchronisation CG Link", t.synchro],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2 py-2 text-sm sm:grid-cols-2">
      {lignes.map(([l, v]) => (
        <div key={l} className="min-w-0">
          <dt className="font-semibold">{l}</dt>
          <dd className="break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ListeParticipations({ liste }: { liste: Participation[] }) {
  return (
    <ul className="list-disc pl-4">
      {liste.map((p, i) => <li key={i}>{texteParticipation(p) || "Participation enregistrée"}</li>)}
    </ul>
  );
}
