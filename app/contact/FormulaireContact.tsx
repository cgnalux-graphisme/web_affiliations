"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Send } from "lucide-react";
import { IconeChargement } from "../Chargement";
import { EMAIL_GENERAL } from "../../lib/bureaux";
import {
  CHAMP_PIEGE,
  CONTACT_LIMITES,
  nettoyerContact,
  validerContact,
  type ChampContact,
  type ErreursContact,
  type MessageContact,
} from "../../lib/contact";

const VIDE: MessageContact = { nom: "", email: "", sujet: "", message: "" };
const ORDRE: ChampContact[] = ["nom", "email", "sujet", "message"];

type Etat = "saisie" | "envoi" | "envoye" | "echec";

/**
 * Formulaire de contact : validation à la sortie de chaque champ puis à l'envoi, premier champ en erreur
 * mis au point. Envoi par /api/contact (e-mail vers l'adresse générale, rien d'enregistré).
 */
export default function FormulaireContact() {
  const [valeurs, setValeurs] = useState<MessageContact>(VIDE);
  const [touches, setTouches] = useState<Partial<Record<ChampContact, boolean>>>({});
  const [erreurs, setErreurs] = useState<ErreursContact>({});
  const [etat, setEtat] = useState<Etat>("saisie");
  const [envoyeA, setEnvoyeA] = useState("");
  const piege = useRef<HTMLInputElement>(null);
  const champs = useRef<Partial<Record<ChampContact, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const titreSucces = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (etat === "envoye") titreSucces.current?.focus();
  }, [etat]);

  function changer(champ: ChampContact, valeur: string) {
    const suivantes = { ...valeurs, [champ]: valeur };
    setValeurs(suivantes);
    // Une erreur déjà affichée se met à jour à la frappe (et disparaît dès que c'est corrigé).
    if (touches[champ]) setErreurs(validerContact(nettoyerContact(suivantes)));
    if (etat === "echec") setEtat("saisie");
  }

  function quitter(champ: ChampContact) {
    if (!valeurs[champ]) return; // pas de reproche sur un champ simplement traversé
    setTouches((t) => ({ ...t, [champ]: true }));
    setErreurs(validerContact(nettoyerContact(valeurs)));
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (etat === "envoi") return;

    const message = nettoyerContact(valeurs);
    const trouvees = validerContact(message);
    setTouches({ nom: true, email: true, sujet: true, message: true });
    setErreurs(trouvees);
    const premiere = ORDRE.find((c) => trouvees[c]);
    if (premiere) {
      champs.current[premiere]?.focus();
      return;
    }

    setEtat("envoi");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...message, [CHAMP_PIEGE]: piege.current?.value ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { erreurs?: ErreursContact };
      if (!res.ok) {
        if (data.erreurs && Object.keys(data.erreurs).length) {
          setErreurs(data.erreurs);
          setEtat("saisie");
          const c = ORDRE.find((k) => data.erreurs![k]);
          if (c) champs.current[c]?.focus();
          return;
        }
        setEtat("echec");
        return;
      }
      setEnvoyeA(message.email);
      setValeurs(VIDE);
      setTouches({});
      setErreurs({});
      setEtat("envoye");
    } catch {
      setEtat("echec");
    }
  }

  if (etat === "envoye") {
    return (
      <div role="status" className="contact-succes flex flex-col items-start gap-5 py-4">
        <CocheTracee />
        <h3 ref={titreSucces} tabIndex={-1} className="font-condensed text-4xl font-extrabold uppercase leading-none focus:outline-none">
          Message envoyé
        </h3>
        <p className="max-w-md text-[17px] leading-relaxed">
          Merci. Votre message est bien arrivé chez nous. Nous vous répondrons par e-mail à{" "}
          <strong className="break-all">{envoyeA}</strong>.
        </p>
        <p className="max-w-md text-[15px] leading-relaxed">
          Une question urgente ? Appelez le bureau le plus proche pendant les heures d&apos;accueil.
        </p>
        <button
          type="button"
          onClick={() => setEtat("saisie")}
          className="inline-flex min-h-[44px] items-center rounded-xl border-2 border-militant-charbon px-5 font-bold transition-colors hover:border-militant-bordeaux hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
        >
          Écrire un autre message
        </button>
      </div>
    );
  }

  const envoiEnCours = etat === "envoi";
  const L = CONTACT_LIMITES;
  const aff = (c: ChampContact) => (touches[c] ? erreurs[c] : undefined);

  return (
    <form noValidate onSubmit={envoyer} aria-busy={envoiEnCours} className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ
          id="contact-nom"
          libelle="Nom et prénom"
          erreur={aff("nom")}
          champ={
            <input
              ref={(el) => {
                champs.current.nom = el;
              }}
              id="contact-nom"
              name="nom"
              type="text"
              autoComplete="name"
              maxLength={L.nom.max}
              value={valeurs.nom}
              onChange={(e) => changer("nom", e.target.value)}
              onBlur={() => quitter("nom")}
              aria-invalid={Boolean(aff("nom"))}
              aria-describedby={aff("nom") ? "contact-nom-erreur" : undefined}
              className={CLASSE_CHAMP}
            />
          }
        />
        <Champ
          id="contact-email"
          libelle="Adresse e-mail"
          aide="Pour vous répondre."
          erreur={aff("email")}
          champ={
            <input
              ref={(el) => {
                champs.current.email = el;
              }}
              id="contact-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={L.email.max}
              placeholder="prenom.nom@exemple.be"
              value={valeurs.email}
              onChange={(e) => changer("email", e.target.value)}
              onBlur={() => quitter("email")}
              aria-invalid={Boolean(aff("email"))}
              aria-describedby={aff("email") ? "contact-email-aide contact-email-erreur" : "contact-email-aide"}
              className={CLASSE_CHAMP}
            />
          }
        />
      </div>

      <Champ
        id="contact-sujet"
        libelle="Sujet"
        erreur={aff("sujet")}
        champ={
          <input
            ref={(el) => {
              champs.current.sujet = el;
            }}
            id="contact-sujet"
            name="sujet"
            type="text"
            maxLength={L.sujet.max}
            placeholder="Ex. : question sur mon affiliation"
            value={valeurs.sujet}
            onChange={(e) => changer("sujet", e.target.value)}
            onBlur={() => quitter("sujet")}
            aria-invalid={Boolean(aff("sujet"))}
            aria-describedby={aff("sujet") ? "contact-sujet-erreur" : undefined}
            className={CLASSE_CHAMP}
          />
        }
      />

      <Champ
        id="contact-message"
        libelle="Votre message"
        erreur={aff("message")}
        compteur={`${valeurs.message.length.toLocaleString("fr-BE")} / ${L.message.max.toLocaleString("fr-BE")}`}
        champ={
          <textarea
            ref={(el) => {
              champs.current.message = el;
            }}
            id="contact-message"
            name="message"
            rows={7}
            maxLength={L.message.max}
            value={valeurs.message}
            onChange={(e) => changer("message", e.target.value)}
            onBlur={() => quitter("message")}
            aria-invalid={Boolean(aff("message"))}
            aria-describedby={aff("message") ? "contact-message-erreur" : undefined}
            className={`${CLASSE_CHAMP} min-h-[180px] resize-y py-3 leading-relaxed`}
          />
        }
      />

      {/* Champ piège : invisible et hors du parcours clavier ; un robot le remplit, un visiteur jamais. */}
      <div aria-hidden className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`contact-${CHAMP_PIEGE}`}>Ne pas remplir ce champ</label>
        <input ref={piege} id={`contact-${CHAMP_PIEGE}`} name={CHAMP_PIEGE} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {etat === "echec" && (
        <div role="alert" className="liste-fondu flex gap-3 rounded-xl border-2 border-militant-bordeaux p-4">
          <AlertCircle size={22} className="mt-0.5 shrink-0 text-militant-bordeaux" aria-hidden />
          <p className="text-[16px] leading-relaxed">
            <strong>Votre message n&apos;est pas parti.</strong> Vérifiez votre connexion et réessayez dans un instant.
            Si le problème continue, écrivez directement à{" "}
            <a href={`mailto:${EMAIL_GENERAL}`} className="font-bold underline decoration-militant-rouge decoration-2 underline-offset-4">
              {EMAIL_GENERAL}
            </a>
            . Votre texte est toujours là.
          </p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[14px] leading-snug">
          Votre message nous parvient par e-mail et n&apos;est pas enregistré sur ce site. N&apos;y indiquez ni votre
          numéro national ni vos coordonnées bancaires.
        </p>
        <button
          type="submit"
          disabled={envoiEnCours}
          className="contact-envoyer inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2.5 rounded-xl bg-militant-bordeaux px-7 text-[17px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 disabled:cursor-wait disabled:hover:bg-militant-bordeaux"
        >
          {envoiEnCours ? (
            <>
              <IconeChargement size={20} />
              Envoi en cours…
            </>
          ) : (
            <>
              Envoyer le message
              <Send size={18} className="contact-envoyer-icone" aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

const CLASSE_CHAMP =
  "peer block min-h-[48px] w-full rounded-xl border border-militant-ardoise bg-white px-4 text-[17px] text-militant-charbon placeholder:text-militant-ardoise transition-colors hover:border-militant-charbon focus:border-militant-charbon focus:outline-none aria-[invalid=true]:border-2 aria-[invalid=true]:border-militant-bordeaux";

/** Libellé au-dessus, filet rouge qui se trace sous le champ au focus, erreur en dessous. */
function Champ({
  id,
  libelle,
  aide,
  erreur,
  compteur,
  champ,
}: {
  id: string;
  libelle: string;
  aide?: string;
  erreur?: string;
  compteur?: string;
  champ: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[16px] font-bold">
          {libelle}
        </label>
        {aide && (
          <span id={`${id}-aide`} className="text-[14px]">
            {aide}
          </span>
        )}
        {compteur && (
          <span className="text-[14px] tabular-nums" aria-hidden>
            {compteur}
          </span>
        )}
      </div>
      <div className="champ-contact relative">
        {champ}
        <span aria-hidden className="champ-contact-filet" />
      </div>
      {erreur && (
        <p id={`${id}-erreur`} className="liste-fondu flex items-start gap-1.5 text-[15px] font-semibold text-militant-bordeaux">
          <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden />
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Coche qui se dessine (cercle puis trait) ; déjà dessinée en mouvement réduit. */
function CocheTracee() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden className="contact-coche">
      <circle cx="32" cy="32" r="29" stroke="#931510" strokeWidth="4" className="contact-coche-cercle" />
      <path d="M19 33.5 L28 42 L45 23" stroke="#E32119" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="contact-coche-trait" />
    </svg>
  );
}
