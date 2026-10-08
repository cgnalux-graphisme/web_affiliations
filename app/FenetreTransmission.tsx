"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Send, X } from "lucide-react";
import {
  CHAMP_PIEGE_ASSISTANT,
  RESUME_MAX,
  nettoyerTransmission,
  validerTransmission,
  type ContactTransmission,
  type DemandeTransmission,
  type ErreursTransmission,
  type EtatAssistant,
} from "../lib/assistant";
import { IconeChargement } from "./Chargement";
import { pieger } from "./pieger-focus";

/**
 * « Transmettre ma demande » : fenêtre séparée, au-dessus de la conversation. Elle ne passe JAMAIS par l'IA :
 * envoi direct à /api/assistant/transmettre (enregistrement + e-mail au destinataire, sans registre national).
 */
export default function FenetreTransmission({
  contact,
  resumeInitial,
  etat,
  onFermer,
  onTransmise,
}: {
  contact: ContactTransmission;
  resumeInitial: string;
  etat: EtatAssistant;
  onFermer: () => void;
  onTransmise: (service: string) => void;
}) {
  const titreId = useId();
  const boite = useRef<HTMLDivElement>(null);
  const premierChamp = useRef<HTMLInputElement>(null);
  const [valeurs, setValeurs] = useState<DemandeTransmission>({
    nom: "",
    prenom: "",
    email: "",
    registre_national: "",
    resume: resumeInitial,
    consentement: false,
  });
  const [piege, setPiege] = useState("");
  const [erreurs, setErreurs] = useState<ErreursTransmission>({});
  const [erreurEnvoi, setErreurEnvoi] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    premierChamp.current?.focus();
  }, []);

  /** Fermer sans transmettre : confirmation si la personne a déjà saisi quelque chose. */
  function fermer() {
    const saisi = valeurs.nom || valeurs.prenom || valeurs.email || valeurs.registre_national || valeurs.resume !== resumeInitial;
    if (saisi && !window.confirm("Fermer sans transmettre ? Ce que vous avez saisi sera perdu.")) return;
    onFermer();
  }

  const changer = <K extends keyof DemandeTransmission>(cle: K, v: DemandeTransmission[K]) => {
    setValeurs((x) => ({ ...x, [cle]: v }));
    if (erreurs[cle]) setErreurs((e) => ({ ...e, [cle]: undefined }));
  };

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const propre = nettoyerTransmission(valeurs);
    const trouvees = validerTransmission(propre);
    setErreurs(trouvees);
    setErreurEnvoi("");
    if (Object.keys(trouvees).length) {
      const premier = Object.keys(trouvees)[0];
      boite.current?.querySelector<HTMLElement>(`[name="${premier}"]`)?.focus();
      return;
    }
    setEnvoi(true);
    try {
      const r = await fetch("/api/assistant/transmettre", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...propre,
          [CHAMP_PIEGE_ASSISTANT]: piege,
          etat: {
            codePostal: etat.codePostal,
            categorie: etat.categorie,
            cpCode: etat.cpCode,
            affilie: etat.affilie,
            employeurNettoyage: etat.employeurNettoyage,
          },
        }),
      });
      const json = (await r.json().catch(() => null)) as { service?: string; erreur?: string; erreurs?: ErreursTransmission } | null;
      if (!r.ok || !json?.service) {
        if (json?.erreurs) setErreurs(json.erreurs);
        setErreurEnvoi(json?.erreur ?? "La demande n'a pas pu être transmise. Réessayez, ou appelez le numéro indiqué.");
        return;
      }
      onTransmise(json.service);
    } catch {
      setErreurEnvoi("Connexion impossible. Vérifiez votre connexion internet, puis réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  const champ = (nom: keyof DemandeTransmission) => ({
    id: `transmission-${nom}`,
    name: nom,
    "aria-invalid": erreurs[nom] ? true : undefined,
    "aria-describedby": erreurs[nom] ? `transmission-${nom}-erreur` : undefined,
  });
  const Erreur = ({ nom }: { nom: keyof DemandeTransmission }) =>
    erreurs[nom] ? (
      <p id={`transmission-${nom}-erreur`} className="form-erreur">
        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden /> {erreurs[nom]}
      </p>
    ) : null;

  return (
    <div className="absolute inset-0 z-10 flex items-end bg-militant-charbon/40 sm:items-center sm:p-3">
      <div
        ref={boite}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            fermer();
          }
          pieger(e, boite.current);
        }}
        className="assistant-transmission formulaire flex max-h-full w-full flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl sm:border-2 sm:border-militant-charbon"
      >
        <div className="flex items-start gap-3 border-b-[3px] border-militant-charbon px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <h3 id={titreId} className="font-condensed text-[24px] font-extrabold uppercase leading-none">
              Transmettre ma demande
            </h3>
            <p className="mt-1 text-[14px] leading-snug">
              À : <strong>{contact.service}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={fermer}
            aria-label="Fermer sans transmettre"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <form noValidate onSubmit={envoyer} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="transmission-prenom" className="form-libelle">
                Prénom
              </label>
              <input
                ref={premierChamp}
                {...champ("prenom")}
                type="text"
                autoComplete="given-name"
                value={valeurs.prenom}
                onChange={(e) => changer("prenom", e.target.value)}
                className="w-full"
              />
              <Erreur nom="prenom" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transmission-nom" className="form-libelle">
                Nom
              </label>
              <input
                {...champ("nom")}
                type="text"
                autoComplete="family-name"
                value={valeurs.nom}
                onChange={(e) => changer("nom", e.target.value)}
                className="w-full"
              />
              <Erreur nom="nom" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="transmission-email" className="form-libelle">
              E-mail
            </label>
            <input
              {...champ("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={valeurs.email}
              onChange={(e) => changer("email", e.target.value)}
              placeholder="prenom.nom@exemple.be"
              className="w-full"
            />
            <Erreur nom="email" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="transmission-registre_national" className="form-libelle">
              Numéro de registre national <span className="font-normal">(facultatif)</span>
            </label>
            <p id="transmission-registre-aide" className="form-aide">
              Facultatif. Il nous permet de retrouver votre dossier plus vite.
            </p>
            <input
              {...champ("registre_national")}
              aria-describedby={`transmission-registre-aide${erreurs.registre_national ? " transmission-registre_national-erreur" : ""}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              value={valeurs.registre_national}
              onChange={(e) => changer("registre_national", e.target.value.slice(0, 20))}
              placeholder="85.07.30-033.28"
              className="w-full"
            />
            <Erreur nom="registre_national" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="transmission-resume" className="form-libelle">
              Votre demande
            </label>
            <p id="transmission-resume-aide" className="form-aide">
              Préparé à partir de la conversation. Corrigez ou complétez si besoin.
            </p>
            <textarea
              {...champ("resume")}
              aria-describedby={`transmission-resume-aide${erreurs.resume ? " transmission-resume-erreur" : ""}`}
              rows={4}
              maxLength={RESUME_MAX}
              value={valeurs.resume}
              onChange={(e) => changer("resume", e.target.value)}
              className="w-full"
            />
            <Erreur nom="resume" />
          </div>

          {/* Champ piège : invisible pour une personne, rempli par les robots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="transmission-site">Site web</label>
            <input id="transmission-site" name="site_web" type="text" tabIndex={-1} autoComplete="off" value={piege} onChange={(e) => setPiege(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-start gap-3 text-[14px] leading-snug">
              <input
                {...champ("consentement")}
                type="checkbox"
                checked={valeurs.consentement}
                onChange={(e) => changer("consentement", e.target.checked)}
                className="mt-0.5 shrink-0"
              />
              <span>
                J&apos;accepte que mes données soient utilisées pour traiter ma demande.{" "}
                <a
                  href="/vie-privee"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline decoration-militant-rouge underline-offset-4 hover:text-militant-bordeaux"
                >
                  Vie privée<span className="sr-only"> (nouvel onglet)</span>
                </a>
              </span>
            </label>
            <Erreur nom="consentement" />
          </div>

          {erreurEnvoi && (
            <p role="alert" className="form-encart font-semibold text-militant-bordeaux">
              {erreurEnvoi}
            </p>
          )}

          <button type="submit" disabled={envoi} className="form-btn-principal w-full">
            {envoi ? (
              <>
                <IconeChargement /> Transmission en cours…
              </>
            ) : (
              <>
                <Send size={17} aria-hidden /> Transmettre
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
