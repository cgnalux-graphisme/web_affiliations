"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Eye, Save, Send, Trash2 } from "lucide-react";
import { formatDateFr, isoToDateFr } from "../../../../../lib/dates";
import { COMMISSIONS_PARITAIRES } from "../../../../../lib/commissions-paritaires";
import { enumeration, heureFr, manquantsPourEnvoyer, ouiNon, type DateSaisie } from "../../../../../lib/liberations/regles";
import {
  CHARGES, DUREES, REGIME_PAIEMENT_DEFAUT, TYPES_LIBERATION, libelleStatut, type Dossier, type Lieu,
} from "../../../../../lib/liberations/types";
import type { DelegueChoix, DossierAffiche, DroitsDossier, EntrepriseChoix } from "../../../../../lib/liberations/donnees-serveur";
import { changerStatut, enregistrerDossier } from "../../actions";
import { IconeChargement } from "../../../../Chargement";
import AutocompleteRue from "../../../_partage/AutocompleteRue";
import { Alerte, AIDE, BTN, BTN_PETIT, BTN_PRINCIPAL, CHAMP, EnteteEcran, LIBELLE, Panneau } from "../../../_partage/ui";
import ParticipantsDossier from "./ParticipantsDossier";
import PiecesDossier from "./PiecesDossier";

type Valeurs = Record<string, string>;
type LigneDate = DateSaisie & { cle: string };

const on = (b: boolean | null) => (b === null ? "" : b ? "oui" : "non");
let compteur = 0;
const nouvelleCle = () => `d${++compteur}`;

function valeursDe(d: DossierAffiche): Valeurs {
  return {
    type: d.type, objet: d.objet ?? "", ordre_du_jour: d.ordre_du_jour ?? "", salle: d.salle ?? "",
    lieu: d.lieu_autre ? "autre" : d.lieu_id ?? "",
    lieu_nom: d.lieu_autre ? d.lieu_nom ?? "" : "", lieu_rue: d.lieu_autre ? d.lieu_rue ?? "" : "",
    lieu_numero: d.lieu_autre ? d.lieu_numero ?? "" : "", lieu_boite: d.lieu_autre ? d.lieu_boite ?? "" : "",
    lieu_code_postal: d.lieu_autre ? d.lieu_code_postal ?? "" : "", lieu_localite: d.lieu_autre ? d.lieu_localite ?? "" : "",
    perte_salaire: on(d.perte_salaire), perte_salaire_charge: d.perte_salaire_charge ?? "",
    introduire_cg_federale: on(d.introduire_cg_federale), regime_paiement: d.regime_paiement ?? "",
    lunch: on(d.lunch), secteur_id: d.secteur_id ?? "", commission_paritaire: d.commission_paritaire ?? "",
    entreprise_specifique: d.entreprise_specifique ? "oui" : "non", entreprise_id: d.entreprise_id ?? "",
  };
}

function datesDe(d: DossierAffiche): LigneDate[] {
  const lignes = d.dates.map((x) => ({ cle: nouvelleCle(), jour: isoToDateFr(x.jour), duree: x.duree, heure_debut: heureFr(x.heure_debut).replace("h", ":") }));
  return lignes.length ? lignes : [{ cle: nouvelleCle(), jour: "", duree: "journee", heure_debut: "" }];
}

/** Valeurs envoyées au serveur : le lieu choisi est traduit en lieu_id / lieu_autre. */
function versChamps(v: Valeurs): Record<string, string> {
  const { lieu, ...reste } = v;
  const autre = lieu === "autre";
  const champs: Record<string, string> = { ...reste, lieu_autre: autre ? "oui" : "non", lieu_id: autre ? "" : lieu };
  if (!autre) for (const k of ["lieu_nom", "lieu_rue", "lieu_numero", "lieu_boite", "lieu_code_postal", "lieu_localite"]) delete champs[k];
  return champs;
}

/** Question oui / non en deux cartes. */
function OuiNon({ nom, question, valeur, onChange, aide }: { nom: string; question: string; valeur: string; onChange: (v: string) => void; aide?: string }) {
  return (
    <fieldset className="grid gap-2">
      <legend className={LIBELLE}>{question}</legend>
      <div className="grid max-w-md grid-cols-2 gap-2">
        {["oui", "non"].map((o) => (
          <label key={o} className={`ecg-choix${valeur === o ? " ecg-choix-actif" : ""}`}>
            <input type="radio" name={nom} value={o} checked={valeur === o} onChange={() => onChange(o)} />
            {o === "oui" ? "Oui" : "Non"}
          </label>
        ))}
      </div>
      {aide && <p className={AIDE}>{aide}</p>}
    </fieldset>
  );
}

export default function EditeurDossier({ dossier, droits, lieux, secteurs, entreprises, delegues, admin }: {
  dossier: DossierAffiche;
  droits: DroitsDossier;
  lieux: Lieu[];
  secteurs: { id: string; nom: string }[];
  entreprises: EntrepriseChoix[];
  delegues: DelegueChoix[];
  admin: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState<Valeurs>(() => valeursDe(dossier));
  const [dates, setDates] = useState<LigneDate[]>(() => datesDe(dossier));
  const [sale, setSale] = useState(false);
  const [enCours, setEnCours] = useState<"sauver" | "envoyer" | null>(null);
  const [message, setMessage] = useState<{ ton: "succes" | "erreur"; texte: string } | null>(null);

  // Modifications non enregistrées : le navigateur prévient avant de quitter la page.
  useEffect(() => {
    if (!sale) return;
    const avertir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [sale]);

  function changer(cle: string, valeur: string) {
    setV((x) => {
      const n = { ...x, [cle]: valeur };
      // N° de régime prérempli quand la dépense n'est pas introduite à la CG fédérale.
      if (cle === "introduire_cg_federale" && valeur === "non" && !x.regime_paiement.trim()) n.regime_paiement = REGIME_PAIEMENT_DEFAUT;
      return n;
    });
    setSale(true);
    setMessage(null);
  }

  function changerDate(cle: string, champ: keyof DateSaisie, valeur: string) {
    setDates((x) => x.map((d) => (d.cle === cle ? { ...d, [champ]: champ === "jour" ? formatDateFr(valeur) : valeur } : d)));
    setSale(true);
    setMessage(null);
  }

  async function sauver(): Promise<boolean> {
    if (!sale) return true;
    setEnCours("sauver");
    const r = await enregistrerDossier(dossier.id, versChamps(v), dates.map(({ jour, duree, heure_debut }) => ({ jour, duree, heure_debut })))
      .catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(null);
    if (!r.ok) {
      setMessage({ ton: "erreur", texte: r.erreur });
      return false;
    }
    setSale(false);
    setMessage({ ton: "succes", texte: "Dossier enregistré." });
    router.refresh();
    return true;
  }

  async function envoyer() {
    if (!(await sauver())) return;
    setEnCours("envoyer");
    const r = await changerStatut(dossier.id, "soumettre").catch(() => ({ ok: false as const, erreur: "La base n'a pas répondu. Réessayez." }));
    setEnCours(null);
    if (!r.ok) return setMessage({ ton: "erreur", texte: r.erreur });
    router.push(`/espace/liberations/${dossier.id}`);
  }

  // Ce qu'il manque pour envoyer, calculé sur le formulaire en cours.
  const manque = useMemo(() => {
    const champs = versChamps(v);
    const brouillon = {
      type: champs.type as Dossier["type"], objet: champs.objet, lieu_id: champs.lieu_id || null, lieu_autre: champs.lieu_autre === "oui",
      lieu_rue: champs.lieu_rue ?? null, lieu_code_postal: champs.lieu_code_postal ?? null, lieu_localite: champs.lieu_localite ?? null,
      perte_salaire: ouiNon(champs.perte_salaire) ?? null, perte_salaire_charge: (champs.perte_salaire_charge || null) as Dossier["perte_salaire_charge"],
      introduire_cg_federale: ouiNon(champs.introduire_cg_federale) ?? null, regime_paiement: champs.regime_paiement,
      lunch: ouiNon(champs.lunch) ?? null, entreprise_specifique: champs.entreprise_specifique === "oui", entreprise_id: champs.entreprise_id || null,
    };
    return manquantsPourEnvoyer(brouillon, dates.filter((d) => d.jour.trim()).length, dossier.participants.length);
  }, [v, dates, dossier.participants.length]);

  const autre = v.lieu === "autre";
  const brouillon = dossier.statut === "brouillon";

  return (
    <div className="ecg-ecran ecg-ecran-etroit">
      <EnteteEcran icone="calendar-check" titre={v.objet.trim() || "Nouvelle demande de libération"}
        description={`Dossier n° ${dossier.numero} · ${libelleStatut(dossier.statut).toLowerCase()}${admin && dossier.demandeur ? ` · demandé par ${dossier.demandeur}` : ""}`}
        actions={<Link href={`/espace/liberations/${dossier.id}`} className={BTN}><Eye size={18} aria-hidden /> Voir le dossier</Link>} />

      {!brouillon && (
        <Alerte ton="info">La demande est déjà envoyée : vos modifications sont enregistrées directement dans le dossier en cours.</Alerte>
      )}

      <form onSubmit={(e) => { e.preventDefault(); sauver(); }} className="grid gap-6">
        <Panneau titre="La réunion" sousTitre="Le type de libération et l'objet tels qu'ils figureront dans les courriers.">
          <div className="grid gap-4">
            <div>
              <label htmlFor="type" className={LIBELLE}>Type de libération</label>
              <select id="type" className={CHAMP} value={v.type} onChange={(e) => changer("type", e.target.value)}>
                {TYPES_LIBERATION.map((t) => <option key={t.code} value={t.code}>{t.libelle}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="objet" className={LIBELLE}>Objet / titre de la réunion</label>
              <input id="objet" className={CHAMP} value={v.objet} maxLength={300} onChange={(e) => changer("objet", e.target.value)}
                placeholder="Exemple : Commission Professionnelle Construction…" />
            </div>
            <div>
              <label htmlFor="ordre_du_jour" className={LIBELLE}>Ordre du jour (facultatif)</label>
              <textarea id="ordre_du_jour" className={CHAMP} rows={4} value={v.ordre_du_jour} maxLength={5000}
                onChange={(e) => changer("ordre_du_jour", e.target.value)} placeholder="Un point par ligne…" aria-describedby="aide-odj" />
              <p id="aide-odj" className={AIDE}>Il sera repris dans la convocation des participants.</p>
            </div>
          </div>
        </Panneau>

        <Panneau titre="Dates" sousTitre="Une ou plusieurs dates. Pour chacune : la durée et l'heure de début.">
          <div className="grid gap-3">
            <ol className="grid gap-3">
              {dates.map((d, i) => (
                <li key={d.cle} className="grid items-end gap-2 rounded-xl border border-[var(--ecg-trait)] p-3 sm:grid-cols-[150px_minmax(0,1fr)_110px_auto]">
                  <div>
                    <label htmlFor={`jour-${d.cle}`} className={LIBELLE}>Date {dates.length > 1 ? `n° ${i + 1}` : ""}</label>
                    <input id={`jour-${d.cle}`} type="text" inputMode="numeric" autoComplete="off" placeholder="jj/mm/aaaa" maxLength={10}
                      className={`${CHAMP} ecg-chiffre`} value={d.jour} onChange={(e) => changerDate(d.cle, "jour", e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor={`duree-${d.cle}`} className={LIBELLE}>Durée</label>
                    <select id={`duree-${d.cle}`} className={CHAMP} value={d.duree} onChange={(e) => changerDate(d.cle, "duree", e.target.value)}>
                      {DUREES.map((x) => <option key={x.code} value={x.code}>{x.libelle}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`heure-${d.cle}`} className={LIBELLE}>Début</label>
                    <input id={`heure-${d.cle}`} type="text" inputMode="numeric" autoComplete="off" placeholder="08:00" maxLength={5}
                      className={`${CHAMP} ecg-chiffre`} value={d.heure_debut} onChange={(e) => changerDate(d.cle, "heure_debut", e.target.value)} />
                  </div>
                  {dates.length > 1 ? (
                    <button type="button" className={`${BTN} ${BTN_PETIT} ecg-btn-fantome ecg-btn-fantome-danger`}
                      onClick={() => { setDates((x) => x.filter((y) => y.cle !== d.cle)); setSale(true); }}>
                      <Trash2 size={15} aria-hidden /> Retirer<span className="sr-only"> la date n° {i + 1}</span>
                    </button>
                  ) : <span aria-hidden />}
                </li>
              ))}
            </ol>
            <div>
              <button type="button" className={BTN}
                onClick={() => { setDates((x) => [...x, { cle: nouvelleCle(), jour: "", duree: x[x.length - 1]?.duree ?? "journee", heure_debut: x[x.length - 1]?.heure_debut ?? "" }]); setSale(true); }}>
                <CalendarPlus size={16} aria-hidden /> Ajouter une date
              </button>
            </div>
          </div>
        </Panneau>

        <Panneau titre="Lieu" sousTitre="Choisissez un lieu de la liste, ou « Autre » pour une adresse précise.">
          <div className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="sr-only">Lieu de la réunion</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {lieux.map((l) => (
                  <label key={l.id} className={`ecg-choix items-start${v.lieu === l.id ? " ecg-choix-actif" : ""}`}>
                    <input type="radio" name="lieu" className="mt-1" value={l.id} checked={v.lieu === l.id} onChange={() => changer("lieu", l.id)} />
                    <span className="grid gap-0.5">
                      <b>{l.nom}</b>
                      <span className="ecg-texte-doux text-sm">
                        {[l.complement, [l.rue, l.numero].filter(Boolean).join(" "), [l.code_postal, l.localite].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                      </span>
                    </span>
                  </label>
                ))}
                <label className={`ecg-choix${autre ? " ecg-choix-actif" : ""}`}>
                  <input type="radio" name="lieu" value="autre" checked={autre} onChange={() => changer("lieu", "autre")} />
                  <b>Autre lieu</b>
                </label>
              </div>
            </fieldset>
            {autre && (
              <div className="grid gap-3 rounded-xl bg-[var(--ecg-fond)] p-3 sm:grid-cols-6">
                <div className="sm:col-span-6">
                  <label htmlFor="lieu_nom" className={LIBELLE}>Nom du lieu (facultatif)</label>
                  <input id="lieu_nom" className={CHAMP} value={v.lieu_nom} maxLength={300} onChange={(e) => changer("lieu_nom", e.target.value)}
                    placeholder="Exemple : Hôtel de ville…" />
                </div>
                <div className="sm:col-span-3">
                  <label htmlFor="lieu_rue" className={LIBELLE}>Rue</label>
                  <AutocompleteRue id="lieu_rue" value={v.lieu_rue} describedBy="aide-rue" onChange={(x) => changer("lieu_rue", x)}
                    onSelect={(s) => {
                      setV((x) => ({
                        ...x, lieu_rue: s.street, ...(s.housenumber ? { lieu_numero: s.housenumber } : {}),
                        ...(s.postcode ? { lieu_code_postal: s.postcode } : {}), ...(s.city ? { lieu_localite: s.city } : {}),
                      }));
                      setSale(true);
                    }} />
                  <p id="aide-rue" className={AIDE}>Tapez 3 lettres : choisissez l&apos;adresse proposée, le reste se remplit.</p>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="lieu_numero" className={LIBELLE}>Numéro</label>
                  <input id="lieu_numero" className={CHAMP} value={v.lieu_numero} maxLength={20} onChange={(e) => changer("lieu_numero", e.target.value)} />
                </div>
                <div className="sm:col-span-1">
                  <label htmlFor="lieu_boite" className={LIBELLE}>Boîte</label>
                  <input id="lieu_boite" className={CHAMP} value={v.lieu_boite} maxLength={20} onChange={(e) => changer("lieu_boite", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="lieu_code_postal" className={LIBELLE}>Code postal</label>
                  <input id="lieu_code_postal" className={`${CHAMP} ecg-chiffre`} inputMode="numeric" value={v.lieu_code_postal} maxLength={4}
                    onChange={(e) => changer("lieu_code_postal", e.target.value.replace(/\D/g, ""))} />
                </div>
                <div className="sm:col-span-4">
                  <label htmlFor="lieu_localite" className={LIBELLE}>Localité</label>
                  <input id="lieu_localite" className={CHAMP} value={v.lieu_localite} maxLength={100} onChange={(e) => changer("lieu_localite", e.target.value)} />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="salle" className={LIBELLE}>Salle (facultatif)</label>
              <input id="salle" className={CHAMP} value={v.salle} maxLength={300} onChange={(e) => changer("salle", e.target.value)}
                placeholder="Exemple : grande salle, 4e étage…" />
            </div>
          </div>
        </Panneau>

        <Panneau titre="Prise en charge">
          <div className="grid gap-5">
            <OuiNon nom="perte_salaire" question="Y a-t-il une perte de salaire ?" valeur={v.perte_salaire} onChange={(x) => changer("perte_salaire", x)} />
            {v.perte_salaire === "oui" && (
              <fieldset className="grid gap-2">
                <legend className={LIBELLE}>Qui prend en charge la perte de salaire ?</legend>
                <div className="grid max-w-md grid-cols-2 gap-2">
                  {CHARGES.map((ch) => (
                    <label key={ch.code} className={`ecg-choix${v.perte_salaire_charge === ch.code ? " ecg-choix-actif" : ""}`}>
                      <input type="radio" name="perte_salaire_charge" value={ch.code} checked={v.perte_salaire_charge === ch.code}
                        onChange={() => changer("perte_salaire_charge", ch.code)} />
                      {ch.libelle}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <OuiNon nom="introduire_cg_federale" question="Faut-il introduire cette dépense à la CG fédérale ?" valeur={v.introduire_cg_federale}
              onChange={(x) => changer("introduire_cg_federale", x)} />
            {v.introduire_cg_federale === "non" && (
              <div className="max-w-md">
                <label htmlFor="regime_paiement" className={LIBELLE}>N° de régime de paiement</label>
                <input id="regime_paiement" className={`${CHAMP} ecg-chiffre`} value={v.regime_paiement} maxLength={40}
                  onChange={(e) => changer("regime_paiement", e.target.value)} />
              </div>
            )}
            <OuiNon nom="lunch" question="Un lunch est-il prévu ?" valeur={v.lunch} onChange={(x) => changer("lunch", x)} />
          </div>
        </Panneau>

        <Panneau titre="Secteur et entreprise" sousTitre="Facultatif, sauf l'entreprise si la réunion concerne une entreprise précise.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="secteur_id" className={LIBELLE}>Secteur</label>
              <select id="secteur_id" className={CHAMP} value={v.secteur_id} onChange={(e) => changer("secteur_id", e.target.value)}>
                <option value="">Non précisé</option>
                {secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="commission_paritaire" className={LIBELLE}>Commission paritaire</label>
              <select id="commission_paritaire" className={CHAMP} value={v.commission_paritaire} onChange={(e) => changer("commission_paritaire", e.target.value)}>
                <option value="">Non précisée</option>
                {COMMISSIONS_PARITAIRES.filter((c) => c.id !== "999").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <OuiNon nom="entreprise_specifique" question="La réunion concerne-t-elle une entreprise précise ?" valeur={v.entreprise_specifique}
                onChange={(x) => changer("entreprise_specifique", x)} />
            </div>
            {v.entreprise_specifique === "oui" && (
              <div className="sm:col-span-2">
                <label htmlFor="entreprise_id" className={LIBELLE}>Entreprise</label>
                <select id="entreprise_id" className={CHAMP} value={v.entreprise_id}
                  onChange={(e) => {
                    const e2 = entreprises.find((x) => x.id === e.target.value);
                    changer("entreprise_id", e.target.value);
                    if (e2?.secteurId && !v.secteur_id) changer("secteur_id", e2.secteurId);
                  }}>
                  <option value="">Choisir une entreprise…</option>
                  {entreprises.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                </select>
              </div>
            )}
          </div>
        </Panneau>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--ecg-trait)] bg-white/95 p-3 shadow-md">
          <button type="submit" className={BTN_PRINCIPAL} disabled={enCours !== null || !sale}>
            {enCours === "sauver" ? <IconeChargement size={16} /> : <Save size={16} aria-hidden />} Enregistrer
          </button>
          <span role={message?.ton === "erreur" ? "alert" : "status"} className={message?.ton === "erreur" ? "ecg-erreur" : "ecg-texte-doux"}>
            {message?.texte ?? (sale ? "Modifications non enregistrées." : "")}
          </span>
        </div>
      </form>

      <ParticipantsDossier dossier={dossier} delegues={delegues} entreprises={entreprises} secteurs={secteurs} modifiable={droits.modifiable} />
      <PiecesDossier dossier={dossier} />

      {brouillon && droits.actions.includes("soumettre") && (
        <Panneau titre="Envoyer la demande" sousTitre="Une fois envoyée, la demande est traitée par un admin. Vous pouvez la reprendre tant qu'elle n'est pas prise en charge.">
          <div className="grid gap-3">
            {manque.length > 0 ? (
              <Alerte ton="attention" titre="Avant d'envoyer, complétez :">{enumeration(manque)}.</Alerte>
            ) : (
              <Alerte ton="succes">La demande est complète.</Alerte>
            )}
            <div>
              <button type="button" className={BTN_PRINCIPAL} disabled={enCours !== null || manque.length > 0} onClick={envoyer}>
                {enCours === "envoyer" ? <IconeChargement size={16} /> : <Send size={16} aria-hidden />} Envoyer la demande
              </button>
            </div>
          </div>
        </Panneau>
      )}
    </div>
  );
}
