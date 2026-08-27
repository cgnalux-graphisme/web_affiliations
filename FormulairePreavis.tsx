"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, AlertTriangle, RotateCcw, CheckCircle } from "lucide-react";
import { isoToDateFr, formatDateFr, dateFrToIso } from "./lib/dates";
import type { QuiRompt, Statut } from "./lib/preavis/types";
import { calculerPreavisOuvrier } from "./lib/preavis/calcul-preavis";
import { calculerPreavisEmploye } from "./lib/preavis/calcul-preavis-employe";
import { debutPreavisDepuisEnvoi, finPreavisJours } from "./lib/preavis/dates-preavis";
import {
  genererConventionCommunAccord,
  genererNotificationDemission,
  formaterDureePreavis,
} from "./lib/preavis/courriers/fusion";
import { contenuOnemSanctions } from "./lib/preavis/contenu-onem-sanctions";
import { contenuProceduresEnvoi } from "./lib/preavis/contenu-procedures-envoi";
import type { ContenuInformatif } from "./lib/preavis/types";

/**
 * Les 6 commissions paritaires couvertes par le moteur de calcul (voir
 * lib/preavis/baremes/ouvrier-pre-2014/index.ts). Cette liste doit rester
 * synchronisée avec le registre du moteur.
 */
const COMMISSIONS_PARITAIRES: { code: string; nom: string }[] = [
  { code: "124.00", nom: "Construction (CP 124)" },
  { code: "126.00", nom: "Ameublement et bois (CP 126)" },
  { code: "142.02", nom: "Récupération de métaux (CP 142.02)" },
  { code: "109.00", nom: "Confection et habillement (CP 109)" },
  { code: "128.01", nom: "Tanneries (CP 128.01)" },
  { code: "128.02", nom: "Commerce et industrie du cuir (CP 128.02)" },
];

type RuptureChoix = QuiRompt | "commun-accord";
type ModeEmployeur = "preavis" | "indemnite";
type Etape = "situation" | "coordonnees" | "resultat";

interface DonneesFormulaire {
  statut: Statut;
  dateEntreeService: string; // ISO (AAAA-MM-JJ)
  cp: string; // "" = inconnu / régime général
  ruptureChoix: RuptureChoix;
  modeEmployeur: ModeEmployeur;
  remunerationAnnuelle: string;
  dateRupture: string; // ISO — date d'envoi (employeur/travailleur) ou date de fin de contrat (commun accord)
  avecPrestation: "avec" | "sans" | "";
  nomTravailleur: string;
  domicileTravailleur: string;
  nomEmployeur: string;
  siegeEmployeur: string;
  lieuSignature: string;
}

const DONNEES_INITIALES: DonneesFormulaire = {
  statut: "ouvrier",
  dateEntreeService: "",
  cp: "",
  ruptureChoix: "travailleur",
  modeEmployeur: "preavis",
  remunerationAnnuelle: "",
  dateRupture: "",
  avecPrestation: "",
  nomTravailleur: "",
  domicileTravailleur: "",
  nomEmployeur: "",
  siegeEmployeur: "",
  lieuSignature: "",
};

type Resultat =
  | { type: "commun-accord"; texte: string }
  | { type: "indemnite"; jours: number; semaines: number; montantIndemnite: number | null }
  | {
      type: "preavis";
      jours: number;
      semaines: number;
      dateDebut: string;
      dateFin: string;
      avertissement: string | null;
      indemniteCompensatoireJours: number | null;
      courrier: string | undefined;
      contenuProcedures: ContenuInformatif;
      contenuOnem: ContenuInformatif | undefined;
    };

const AVERTISSEMENT_OUVRIER_NON_SOURCE =
  "Ce résultat est incomplet : nous n'avons pas de règle précise pour votre situation avant 2014. Contactez votre secrétariat FGTB pour vérifier votre préavis exact.";

const AVERTISSEMENT_EMPLOYE_INCERTAIN =
  "Ce calcul comporte une estimation non confirmée officiellement (démission, ancienneté avant 2014, rémunération au-dessus du seuil légal). Vérifiez ce point avec votre secrétariat FGTB avant d'envoyer votre lettre.";

/** Jours de préavis + avertissement éventuel, pour le statut et le mode choisis. */
function calculerJoursEtAvertissement(
  d: DonneesFormulaire,
  quiRompt: QuiRompt,
  dateDebut: string,
  remuneration: number,
): { jours: number; avertissement: string | null; indemniteCompensatoireJours: number | null } {
  if (d.statut === "ouvrier") {
    const resultat = calculerPreavisOuvrier({
      cp: d.cp,
      dateEmbauche: d.dateEntreeService,
      dateDebutPreavis: dateDebut,
      quiRompt,
    });
    return {
      jours: resultat.total.jours,
      avertissement: resultat.avertissementNonSource ? AVERTISSEMENT_OUVRIER_NON_SOURCE : null,
      indemniteCompensatoireJours: resultat.indemniteCompensatoire?.jours ?? null,
    };
  }

  const resultat = calculerPreavisEmploye({
    dateEmbauche: d.dateEntreeService,
    dateDebutPreavis: dateDebut,
    quiRompt,
    remunerationAnnuelle: remuneration,
  });
  return {
    jours: resultat.total.jours,
    avertissement: resultat.part1DemissionIncertaine ? AVERTISSEMENT_EMPLOYE_INCERTAIN : null,
    indemniteCompensatoireJours: null,
  };
}

function calculerResultat(d: DonneesFormulaire): Resultat {
  if (d.ruptureChoix === "commun-accord") {
    const avecPrestation = d.avecPrestation === "" ? undefined : d.avecPrestation === "avec";
    const texte = genererConventionCommunAccord({
      dateFinContratIso: d.dateRupture,
      avecPrestation,
      nomTravailleur: d.nomTravailleur || undefined,
      domicileTravailleur: d.domicileTravailleur || undefined,
      nomEmployeur: d.nomEmployeur || undefined,
      siegeEmployeur: d.siegeEmployeur || undefined,
      lieuSignature: d.lieuSignature || undefined,
    });
    return { type: "commun-accord", texte };
  }

  const quiRompt: QuiRompt = d.ruptureChoix === "employeur" ? "employeur" : "travailleur";
  const remuneration = Number(d.remunerationAnnuelle) || 0;
  const dateDebut = debutPreavisDepuisEnvoi(d.dateRupture);

  if (quiRompt === "employeur" && d.modeEmployeur === "indemnite") {
    const { jours } = calculerJoursEtAvertissement(d, "employeur", dateDebut, remuneration);
    const semaines = jours / 7;
    const montantIndemnite = remuneration > 0 ? (remuneration / 52) * semaines : null;
    return { type: "indemnite", jours, semaines, montantIndemnite };
  }

  const { jours, avertissement, indemniteCompensatoireJours } = calculerJoursEtAvertissement(
    d,
    quiRompt,
    dateDebut,
    remuneration,
  );
  const dateFin = finPreavisJours(dateDebut, jours);

  const courrier =
    quiRompt === "travailleur"
      ? genererNotificationDemission({
          dureeJours: jours,
          dateDebutPreavisIso: dateDebut,
          dateFinPreavisIso: dateFin,
          nomTravailleur: d.nomTravailleur || undefined,
          domicileTravailleur: d.domicileTravailleur || undefined,
          nomEmployeur: d.nomEmployeur || undefined,
          lieuSignature: d.lieuSignature || undefined,
        })
      : undefined;

  return {
    type: "preavis",
    jours,
    semaines: jours / 7,
    dateDebut,
    dateFin,
    avertissement,
    indemniteCompensatoireJours,
    courrier,
    contenuProcedures: contenuProceduresEnvoi(quiRompt),
    contenuOnem: quiRompt === "travailleur" ? contenuOnemSanctions : undefined,
  };
}

const CLASSE_INPUT =
  "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors border-gray-300 focus:ring-red-200";
const CLASSE_LABEL = "block text-sm font-medium text-gray-700 mb-1.5";
const CLASSE_BOUTON_PRIMAIRE =
  "inline-flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
const CLASSE_BOUTON_SECONDAIRE =
  "inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors";

/**
 * Champ date au format JJ/MM/AAAA saisi au clavier (comme dans les autres
 * formulaires de l'application). Préféré au calendrier natif du navigateur,
 * peu pratique pour choisir une date ancienne (ex. une date d'entrée en
 * service remontant à 20 ans).
 */
function ChampDate({
  label,
  valeurIso,
  onChange,
}: {
  label: string;
  valeurIso: string;
  onChange: (iso: string) => void;
}): React.ReactElement {
  const [texte, setTexte] = useState(() => (valeurIso ? isoToDateFr(valeurIso) : ""));

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formate = formatDateFr(e.target.value);
    setTexte(formate);
    onChange(dateFrToIso(formate) ?? "");
  }

  return (
    <div>
      <label className={CLASSE_LABEL}>{label}</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="JJ/MM/AAAA"
        className={CLASSE_INPUT}
        value={texte}
        onChange={handleChange}
      />
    </div>
  );
}

function ChampMonnaie({ montant }: { montant: number }): React.ReactElement {
  const formate = new Intl.NumberFormat("fr-BE", { style: "currency", currency: "EUR" }).format(montant);
  return <>{formate}</>;
}

function BlocInformatif({ contenu }: { contenu: ContenuInformatif }): React.ReactElement {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      {contenu.sections.map((section) => (
        <div key={section.titre}>
          <h3 className="font-semibold text-gray-900 mb-2">{section.titre}</h3>
          <div className="space-y-1.5">
            {section.phrases.map((phrase, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed">
                {phrase}
              </p>
            ))}
          </div>
        </div>
      ))}
      {contenu.pointsCles.length > 0 && (
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700 mb-2">À retenir</p>
          <ul className="space-y-1">
            {contenu.pointsCles.map((point, i) => (
              <li key={i} className="text-sm text-gray-800 flex gap-2">
                <span className="text-red-600">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-400">Dernière vérification : {isoToDateFr(contenu.derniereVerification)}</p>
    </div>
  );
}

function BlocCourrier({ texte }: { texte: string }): React.ReactElement {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Copie manuelle si l'API presse-papier n'est pas disponible.
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Votre courrier</h3>
        <button type="button" onClick={copier} className={CLASSE_BOUTON_SECONDAIRE}>
          {copie ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copie ? "Copié" : "Copier le texte"}
        </button>
      </div>
      <textarea
        readOnly
        value={texte}
        rows={16}
        className="w-full border border-gray-200 rounded-xl p-4 text-sm font-mono text-gray-800 bg-gray-50 resize-y"
      />
      <p className="text-xs text-gray-500 mt-2">
        Vous pouvez modifier ce texte avant de l'imprimer ou de l'envoyer. Les champs laissés en pointillés ("...")
        sont à compléter à la main.
      </p>
    </div>
  );
}

export default function FormulairePreavis() {
  const [etape, setEtape] = useState<Etape>("situation");
  const [donnees, setDonnees] = useState<DonneesFormulaire>(DONNEES_INITIALES);

  function majChamp<K extends keyof DonneesFormulaire>(champ: K, valeur: DonneesFormulaire[K]) {
    setDonnees((precedent) => ({ ...precedent, [champ]: valeur }));
  }

  const dateRuptureValide = donnees.dateRupture !== "";
  const remunerationRequise =
    donnees.statut === "employe" || (donnees.ruptureChoix === "employeur" && donnees.modeEmployeur === "indemnite");
  const situationValide =
    donnees.dateEntreeService !== "" &&
    dateRuptureValide &&
    (donnees.ruptureChoix !== "commun-accord" || donnees.avecPrestation !== "") &&
    (!remunerationRequise || donnees.remunerationAnnuelle !== "");

  const afficheCoordonnees = donnees.ruptureChoix === "travailleur" || donnees.ruptureChoix === "commun-accord";

  const resultat = useMemo<Resultat | null>(() => {
    if (etape !== "resultat") return null;
    try {
      return calculerResultat(donnees);
    } catch {
      return null;
    }
  }, [etape, donnees]);

  function recommencer() {
    setDonnees(DONNEES_INITIALES);
    setEtape("situation");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="bg-red-700 rounded-2xl px-6 py-5 text-white shadow-lg">
          <h1 className="text-xl font-semibold leading-snug">Calcul de préavis</h1>
          <p className="text-red-100 text-sm mt-1.5">Centrale Générale FGTB Namur – Luxembourg</p>
        </header>

        {etape === "situation" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <label className={CLASSE_LABEL}>Votre statut</label>
              <select
                className={CLASSE_INPUT}
                value={donnees.statut}
                onChange={(e) => majChamp("statut", e.target.value as Statut)}
              >
                <option value="ouvrier">Ouvrier</option>
                <option value="employe">Employé</option>
              </select>
            </div>

            <ChampDate
              label="Date d'entrée en service"
              valeurIso={donnees.dateEntreeService}
              onChange={(iso) => majChamp("dateEntreeService", iso)}
            />

            {donnees.statut === "ouvrier" && (
              <div>
                <label className={CLASSE_LABEL}>Commission paritaire</label>
                <select className={CLASSE_INPUT} value={donnees.cp} onChange={(e) => majChamp("cp", e.target.value)}>
                  <option value="">Régime général (valable pour la grande majorité des cas)</option>
                  <optgroup label="Secteurs avec des règles particulières avant 2014">
                    {COMMISSIONS_PARITAIRES.map((cp) => (
                      <option key={cp.code} value={cp.code}>
                        {cp.nom}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Les règles sont les mêmes pour presque tout le monde. Seuls certains secteurs ont des règles
                  particulières pour l'ancienneté acquise avant 2014. En cas de doute, laissez « Régime général ».
                </p>
              </div>
            )}

            <div>
              <label className={CLASSE_LABEL}>Qui met fin au contrat ?</label>
              <div className="space-y-2">
                {(
                  [
                    { valeur: "travailleur", texte: "Moi (démission)" },
                    { valeur: "employeur", texte: "Mon employeur (licenciement)" },
                    { valeur: "commun-accord", texte: "Rupture d'un commun accord" },
                  ] as { valeur: RuptureChoix; texte: string }[]
                ).map((option) => (
                  <label key={option.valeur} className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="ruptureChoix"
                      checked={donnees.ruptureChoix === option.valeur}
                      onChange={() => majChamp("ruptureChoix", option.valeur)}
                    />
                    {option.texte}
                  </label>
                ))}
              </div>
            </div>

            {donnees.ruptureChoix === "employeur" && (
              <div>
                <label className={CLASSE_LABEL}>Comment le préavis est-il donné ?</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="modeEmployeur"
                      checked={donnees.modeEmployeur === "preavis"}
                      onChange={() => majChamp("modeEmployeur", "preavis")}
                    />
                    Préavis presté (vous continuez à travailler pendant le préavis)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="modeEmployeur"
                      checked={donnees.modeEmployeur === "indemnite"}
                      onChange={() => majChamp("modeEmployeur", "indemnite")}
                    />
                    Rupture immédiate (indemnité à la place du préavis)
                  </label>
                </div>
              </div>
            )}

            {(donnees.statut === "employe" ||
              (donnees.ruptureChoix === "employeur" && donnees.modeEmployeur === "indemnite")) && (
              <div>
                <label className={CLASSE_LABEL}>Rémunération annuelle brute (€)</label>
                <input
                  type="number"
                  min={0}
                  className={CLASSE_INPUT}
                  value={donnees.remunerationAnnuelle}
                  onChange={(e) => majChamp("remunerationAnnuelle", e.target.value)}
                  placeholder="Ex : 35000"
                />
              </div>
            )}

            {donnees.ruptureChoix === "commun-accord" ? (
              <>
                <ChampDate
                  label="Date de fin du contrat convenue"
                  valeurIso={donnees.dateRupture}
                  onChange={(iso) => majChamp("dateRupture", iso)}
                />
                <div>
                  <label className={CLASSE_LABEL}>Le dernier jour, travaillez-vous ou non ?</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="radio"
                        name="avecPrestation"
                        checked={donnees.avecPrestation === "avec"}
                        onChange={() => majChamp("avecPrestation", "avec")}
                      />
                      Je travaille ce jour-là
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="radio"
                        name="avecPrestation"
                        checked={donnees.avecPrestation === "sans"}
                        onChange={() => majChamp("avecPrestation", "sans")}
                      />
                      Je ne travaille pas ce jour-là
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <ChampDate
                label={
                  donnees.ruptureChoix === "travailleur"
                    ? "Date à laquelle vous prévoyez d'envoyer votre lettre recommandée"
                    : "Date à laquelle votre employeur prévoit d'envoyer le recommandé (ou l'huissier)"
                }
                valeurIso={donnees.dateRupture}
                onChange={(iso) => majChamp("dateRupture", iso)}
              />
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={!situationValide}
                onClick={() => setEtape(afficheCoordonnees ? "coordonnees" : "resultat")}
                className={CLASSE_BOUTON_PRIMAIRE}
              >
                Suivant
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {etape === "coordonnees" && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <p className="text-sm text-gray-600">
              Ces informations sont facultatives. Elles servent uniquement à pré-remplir votre courrier — vous
              pourrez toujours le compléter ou le corriger vous-même avant de l'envoyer.
            </p>
            <div>
              <label className={CLASSE_LABEL}>Votre nom</label>
              <input
                type="text"
                className={CLASSE_INPUT}
                value={donnees.nomTravailleur}
                onChange={(e) => majChamp("nomTravailleur", e.target.value)}
              />
            </div>
            <div>
              <label className={CLASSE_LABEL}>Votre domicile</label>
              <input
                type="text"
                className={CLASSE_INPUT}
                value={donnees.domicileTravailleur}
                onChange={(e) => majChamp("domicileTravailleur", e.target.value)}
              />
            </div>
            <div>
              <label className={CLASSE_LABEL}>Nom de votre employeur / de la société</label>
              <input
                type="text"
                className={CLASSE_INPUT}
                value={donnees.nomEmployeur}
                onChange={(e) => majChamp("nomEmployeur", e.target.value)}
              />
            </div>
            {donnees.ruptureChoix === "commun-accord" && (
              <div>
                <label className={CLASSE_LABEL}>Siège de l'employeur / de la société</label>
                <input
                  type="text"
                  className={CLASSE_INPUT}
                  value={donnees.siegeEmployeur}
                  onChange={(e) => majChamp("siegeEmployeur", e.target.value)}
                />
              </div>
            )}
            <div>
              <label className={CLASSE_LABEL}>Lieu de signature souhaité</label>
              <input
                type="text"
                className={CLASSE_INPUT}
                value={donnees.lieuSignature}
                onChange={(e) => majChamp("lieuSignature", e.target.value)}
                placeholder="Ex : Namur"
              />
            </div>

            <div className="flex justify-between pt-2">
              <button type="button" onClick={() => setEtape("situation")} className={CLASSE_BOUTON_SECONDAIRE}>
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              <button type="button" onClick={() => setEtape("resultat")} className={CLASSE_BOUTON_PRIMAIRE}>
                Calculer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {etape === "resultat" && resultat && (
          <div className="space-y-5">
            {resultat.type === "commun-accord" && <BlocCourrier texte={resultat.texte} />}

            {resultat.type === "indemnite" && (
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
                <h3 className="font-semibold text-gray-900">Durée de préavis équivalente</h3>
                <p className="text-2xl font-bold text-red-700">{formaterDureePreavis(resultat.jours)}</p>
                {resultat.montantIndemnite !== null ? (
                  <p className="text-sm text-gray-700">
                    Indemnité compensatoire estimée :{" "}
                    <span className="font-semibold">
                      <ChampMonnaie montant={resultat.montantIndemnite} />
                    </span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Renseignez la rémunération annuelle brute pour obtenir une estimation du montant.
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Estimation indicative, hors avantages en nature et pécule de sortie. Ne remplace pas un calcul
                  officiel par un secrétariat social.
                </p>
              </div>
            )}

            {resultat.type === "preavis" && (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
                  <h3 className="font-semibold text-gray-900">Votre préavis</h3>
                  <p className="text-2xl font-bold text-red-700">{formaterDureePreavis(resultat.jours)}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Début du préavis</p>
                      <p className="font-medium text-gray-900">{isoToDateFr(resultat.dateDebut)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fin du préavis</p>
                      <p className="font-medium text-gray-900">{isoToDateFr(resultat.dateFin)}</p>
                    </div>
                  </div>
                  {resultat.indemniteCompensatoireJours !== null && (
                    <p className="text-sm text-gray-700 bg-red-50 rounded-lg p-3">
                      Vous avez peut-être droit à une indemnité compensatoire supplémentaire d'environ{" "}
                      {formaterDureePreavis(resultat.indemniteCompensatoireJours)} — vérifiez ce point avec votre
                      secrétariat FGTB.
                    </p>
                  )}
                  {resultat.avertissement && (
                    <div className="flex gap-2 items-start bg-amber-50 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">{resultat.avertissement}</p>
                    </div>
                  )}
                </div>

                {resultat.courrier && <BlocCourrier texte={resultat.courrier} />}
                {resultat.contenuOnem && <BlocInformatif contenu={resultat.contenuOnem} />}
                <BlocInformatif contenu={resultat.contenuProcedures} />
              </>
            )}

            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-600">
                Cet outil donne une estimation basée sur les informations que vous avez fournies. Il ne remplace pas
                un conseil personnalisé. Pour toute question sur votre situation, contactez votre secrétariat FGTB.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setEtape(afficheCoordonnees ? "coordonnees" : "situation")}
                className={CLASSE_BOUTON_SECONDAIRE}
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
              <button type="button" onClick={recommencer} className={CLASSE_BOUTON_SECONDAIRE}>
                <RotateCcw className="w-4 h-4" />
                Recommencer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
