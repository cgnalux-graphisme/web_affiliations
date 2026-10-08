"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, ExternalLink, MessageCircle, Phone, RotateCcw, Send, X } from "lucide-react";
import {
  DEMANDE_INITIALE,
  ETAT_INITIAL,
  MESSAGES_MAX,
  MESSAGE_MAX,
  PRESENTATION,
  texteDuBloc,
  type ActionAssistant,
  type Bloc,
  type ContactTransmission,
  type EtatAssistant,
  type ReponseAssistant,
} from "../lib/assistant";
import { IconeChargement } from "./Chargement";
import FenetreTransmission from "./FenetreTransmission";
import { pieger } from "./pieger-focus";
import { useConsentement } from "./useConsentement";

type Message =
  | { id: number; auteur: "assistant"; blocs: Bloc[] }
  | { id: number; auteur: "personne"; texte: string };

const ACCUEIL: Bloc[] = [
  { type: "texte", texte: PRESENTATION },
  { type: "texte", texte: DEMANDE_INITIALE },
];

/**
 * Assistant CG : bulle en bas à droite des pages publiques, fenêtre de conversation (plein écran sur mobile).
 * L'assistant oriente, il ne répond jamais sur le fond : tous ses textes viennent du serveur
 * (app/api/assistant), écrits par le code. Rien n'est enregistré : la conversation vit dans cette page et
 * disparaît quand on la ferme ou qu'on recharge. Seule une demande transmise est gardée.
 * Masqué dans l'espace admin et sur la connexion ; absent si l'interrupteur chatbot_actif est sur « off ».
 */
export default function AssistantCG() {
  const chemin = usePathname();
  const { pret, choix: consentement } = useConsentement();
  const titreId = useId();

  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, auteur: "assistant", blocs: ACCUEIL }]);
  const [etat, setEtat] = useState<EtatAssistant>(ETAT_INITIAL);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [transmission, setTransmission] = useState<{ contact: ContactTransmission; resume: string; etat: EtatAssistant } | null>(null);
  const [transmise, setTransmise] = useState(false);

  const fenetre = useRef<HTMLDivElement>(null);
  const bulle = useRef<HTMLButtonElement>(null);
  const champ = useRef<HTMLTextAreaElement>(null);
  const fil = useRef<HTMLDivElement>(null);
  const prochainId = useRef(1);

  const masque = chemin.startsWith("/suivi-actions") || chemin.startsWith("/login");
  const nbMessages = messages.filter((m) => m.auteur === "personne").length;
  const limiteAtteinte = nbMessages >= MESSAGES_MAX;
  // La barre fixe « Je m'inscris » des pages campagne et le pop-up cookies occupent le bas de l'écran mobile.
  const decalageMobile = chemin.startsWith("/mobilisation/") || (pret && consentement === null);

  /** Après une réponse : le champ s'il est utilisable, sinon le fil de conversation (jamais perdu sur la page). */
  const rendreFocus = useCallback(() => {
    if (champ.current && !champ.current.disabled) champ.current.focus();
    else fil.current?.focus();
  }, []);

  const fermer = useCallback(() => {
    setOuvert(false);
    requestAnimationFrame(() => bulle.current?.focus());
  }, []);

  // Ouverture : focus sur le champ ; sur mobile (plein écran), la page derrière ne défile plus.
  useEffect(() => {
    if (!ouvert) return;
    champ.current?.focus();
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    if (!mobile) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = avant;
    };
  }, [ouvert]);

  // Nouveau message : on descend en bas du fil.
  useEffect(() => {
    const el = fil.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [messages, enCours]);

  type NouveauMessage = { auteur: "assistant"; blocs: Bloc[] } | { auteur: "personne"; texte: string };
  const ajouter = (m: NouveauMessage) => setMessages((liste) => [...liste, { ...m, id: prochainId.current++ }]);

  async function envoyer(corps: { message?: string; action?: ActionAssistant }, affichage: string) {
    if (enCours) return;
    setErreur("");
    const tours = messages.map((m) =>
      m.auteur === "personne"
        ? { role: "personne", texte: m.texte }
        : { role: "assistant", texte: m.blocs.map(texteDuBloc).filter(Boolean).join(" ") }
    );
    ajouter({ auteur: "personne", texte: affichage });
    setEnCours(true);
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etat, tours, ...corps }),
      });
      const json = (await r.json().catch(() => null)) as (ReponseAssistant & { erreur?: string }) | null;
      if (!r.ok || !json?.blocs) {
        setErreur(json?.erreur ?? "L'assistant ne répond pas pour le moment. Réessayez dans un instant.");
        return;
      }
      setEtat(json.etat);
      ajouter({ auteur: "assistant", blocs: json.blocs });
    } catch {
      setErreur("Connexion impossible. Vérifiez votre connexion internet, puis réessayez.");
    } finally {
      setEnCours(false);
      requestAnimationFrame(rendreFocus);
    }
  }

  function soumettre(e?: React.FormEvent) {
    e?.preventDefault();
    const texte = saisie.trim();
    if (!texte || enCours || limiteAtteinte || etat.termine) return;
    setSaisie("");
    void envoyer({ message: texte.slice(0, MESSAGE_MAX) }, texte);
  }

  function recommencer() {
    setMessages([{ id: prochainId.current++, auteur: "assistant", blocs: ACCUEIL }]);
    setEtat(ETAT_INITIAL);
    setErreur("");
    setTransmise(false);
    requestAnimationFrame(() => champ.current?.focus());
  }

  function confirmerTransmission(service: string) {
    setTransmission(null);
    setTransmise(true);
    ajouter({
      auteur: "assistant",
      blocs: [{ type: "texte", texte: `Votre demande a bien été transmise à ${service}. Vous serez recontacté(e).` }],
    });
    requestAnimationFrame(rendreFocus);
  }

  if (masque) return null;

  const dernierAssistant = [...messages].reverse().find((m) => m.auteur === "assistant")?.id;
  const saisieFermee = limiteAtteinte || etat.termine;

  return (
    <>
      {!ouvert && (
        <button
          ref={bulle}
          type="button"
          onClick={() => setOuvert(true)}
          aria-haspopup="dialog"
          aria-label="Une question ? L'Assistant CG vous oriente vers la bonne personne"
          className={`assistant-bulle group fixed right-4 z-[55] flex touch-manipulation items-center gap-3 rounded-full border-2 border-militant-charbon bg-white py-1.5 pl-1.5 pr-5 font-barlow text-militant-charbon shadow-[0_18px_44px_-14px_rgba(34,34,34,0.55)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-militant-bordeaux hover:shadow-[0_22px_50px_-14px_rgba(147,21,16,0.55)] active:translate-y-0 active:scale-[0.97] focus:outline-none focus-visible:ring-4 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 sm:bottom-6 sm:right-6 ${
            decalageMobile ? "bottom-[150px]" : "bottom-4"
          }`}
        >
          {/* Tuile rouge inclinée à 10°, comme l'encart « FGTB » du logo ; l'onde l'accompagne quand elle salue. */}
          <span aria-hidden className="relative grid h-11 w-11 shrink-0 place-items-center">
            <span className="assistant-bulle-onde absolute inset-0 rounded-[12px] border-2 border-militant-rouge" />
            <span className="assistant-bulle-salut grid h-11 w-11 place-items-center">
              <span className="assistant-bulle-tuile grid h-11 w-11 place-items-center rounded-[12px] bg-militant-rouge text-white">
                <MessageCircle size={22} strokeWidth={2.5} />
              </span>
            </span>
          </span>
          <span aria-hidden className="flex flex-col items-start">
            <span className="font-condensed text-[21px] font-extrabold uppercase leading-none tracking-tight">Une question ?</span>
            <span className="mt-1 hidden text-[12.5px] font-semibold leading-none text-militant-bordeaux sm:block">
              L&apos;assistant vous oriente
            </span>
          </span>
        </button>
      )}

      {ouvert && (
        <div
          ref={fenetre}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titreId}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !transmission) {
              e.stopPropagation();
              fermer();
            }
            if (!transmission) pieger(e, fenetre.current);
          }}
          className="assistant-fenetre fixed inset-0 z-[70] flex flex-col overflow-hidden bg-white font-barlow text-militant-charbon sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(680px,calc(100dvh-2.5rem))] sm:w-[400px] sm:rounded-2xl sm:border-2 sm:border-militant-charbon sm:shadow-[0_28px_70px_-24px_rgba(34,34,34,0.5)]"
        >
          {/* En-tête bordeaux, biais à 10° du logo en décor */}
          <div className="assistant-entete relative isolate flex items-center gap-3 overflow-hidden bg-militant-bordeaux px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:pt-3">
            <span aria-hidden className="assistant-biais" />
            <div className="min-w-0 flex-1">
              <h2 id={titreId} className="font-condensed text-[26px] font-extrabold uppercase leading-none">
                Assistant CG
              </h2>
              <p className="mt-0.5 text-[13px] font-semibold leading-tight">Il vous oriente vers la bonne personne.</p>
            </div>
            <button
              type="button"
              onClick={recommencer}
              aria-label="Recommencer la conversation"
              title="Recommencer"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <RotateCcw size={19} aria-hidden />
            </button>
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer l'assistant"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={22} aria-hidden />
            </button>
          </div>

          {/* Fil de la conversation : chaque nouveau message est annoncé (role="log" = aria-live polite). */}
          <div
            ref={fil}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversation"
            tabIndex={-1}
            className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-militant-rouge"
          >
            {messages.map((m) =>
              m.auteur === "personne" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="assistant-message max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-militant-bordeaux px-4 py-2.5 text-[15px] leading-snug text-white">
                    <span className="sr-only">Vous : </span>
                    {m.texte}
                  </p>
                </div>
              ) : (
                <div key={m.id} className="assistant-message max-w-[92%] space-y-2.5">
                  <span className="sr-only">Assistant CG : </span>
                  {m.blocs.map((b, i) => (
                    <BlocAssistant
                      key={i}
                      bloc={b}
                      actif={m.id === dernierAssistant && !enCours}
                      transmise={transmise}
                      onChoix={(libelle, action) => void envoyer({ action }, libelle)}
                      onTransmettre={(contact, resume) => setTransmission({ contact, resume, etat })}
                    />
                  ))}
                </div>
              )
            )}
            {enCours && (
              <p className="flex items-center gap-2 text-[14px] font-semibold">
                <IconeChargement className="text-militant-rouge" /> L&apos;assistant cherche la bonne personne…
              </p>
            )}
            {erreur && (
              <p role="alert" className="border-l-4 border-militant-bordeaux py-1 pl-3 text-[14px] font-semibold text-militant-bordeaux">
                {erreur}
              </p>
            )}
            {(etat.termine || limiteAtteinte) && !enCours && (
              <button
                type="button"
                onClick={recommencer}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-militant-charbon px-4 text-[15px] font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge"
              >
                <RotateCcw size={16} aria-hidden /> Poser une autre question
              </button>
            )}
          </div>

          {/* Saisie libre */}
          <form onSubmit={soumettre} className="border-t-2 border-militant-charbon bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <label htmlFor="assistant-saisie" className="sr-only">
              Votre message
            </label>
            <div className="flex items-end gap-2">
              <textarea
                ref={champ}
                id="assistant-saisie"
                name="message"
                rows={1}
                value={saisie}
                maxLength={MESSAGE_MAX}
                autoComplete="off"
                disabled={saisieFermee}
                onChange={(e) => setSaisie(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    soumettre();
                  }
                }}
                placeholder={
                  limiteAtteinte
                    ? "Limite de messages atteinte"
                    : etat.termine
                      ? "Conversation terminée"
                      : "Exemple : 5000, je n'ai pas reçu mon C4…"
                }
                className="max-h-32 min-h-[48px] flex-1 resize-none rounded-xl border border-militant-ardoise px-3.5 py-3 text-[16px] font-semibold leading-snug text-militant-charbon placeholder:font-normal placeholder:text-militant-ardoise hover:border-militant-charbon focus:border-militant-charbon focus:outline-none focus:ring-2 focus:ring-militant-rouge disabled:cursor-not-allowed disabled:bg-white disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={saisieFermee || enCours || !saisie.trim()}
                aria-label="Envoyer"
                className="inline-flex h-12 w-12 touch-manipulation shrink-0 items-center justify-center rounded-xl bg-militant-bordeaux text-white transition-[background-color,transform] hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enCours ? <IconeChargement /> : <ArrowUp size={22} strokeWidth={2.5} aria-hidden />}
              </button>
            </div>
            <p className="mt-1.5 flex justify-between gap-3 text-[12px] leading-tight">
              <span>Ne donnez ici ni registre national ni numéro de compte.</span>
              <span aria-live="polite" className={`tabular-nums ${saisie.length > MESSAGE_MAX - 50 ? "font-bold text-militant-bordeaux" : ""}`}>
                {saisie.length > MESSAGE_MAX - 100 ? `${saisie.length}/${MESSAGE_MAX}` : ""}
              </span>
            </p>
          </form>

          {transmission && (
            <FenetreTransmission
              contact={transmission.contact}
              resumeInitial={transmission.resume}
              etat={transmission.etat}
              onFermer={() => setTransmission(null)}
              onTransmise={confirmerTransmission}
            />
          )}
        </div>
      )}
    </>
  );
}

/** Un bloc de réponse de l'assistant. Les boutons de choix ne restent actifs que sur le dernier message. */
function BlocAssistant({
  bloc,
  actif,
  transmise,
  onChoix,
  onTransmettre,
}: {
  bloc: Bloc;
  actif: boolean;
  transmise: boolean;
  onChoix: (libelle: string, action: ActionAssistant) => void;
  onTransmettre: (contact: ContactTransmission, resume: string) => void;
}) {
  switch (bloc.type) {
    case "texte":
      return (
        <p
          className={`whitespace-pre-wrap text-[15px] leading-relaxed ${
            bloc.ton === "alerte" ? "border-l-4 border-militant-rouge py-1 pl-3 font-semibold" : ""
          }`}
        >
          {bloc.texte}
        </p>
      );

    case "lien": {
      const classe =
        "group inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-militant-charbon px-4 text-[15px] font-bold transition-colors hover:bg-militant-charbon hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge";
      return bloc.externe ? (
        <a href={bloc.href} target="_blank" rel="noopener noreferrer" className={classe}>
          {bloc.texte}
          <ExternalLink size={16} aria-hidden />
          <span className="sr-only">(nouvel onglet)</span>
        </a>
      ) : (
        <Link href={bloc.href} className={classe}>
          {bloc.texte}
          <Send size={15} className="transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      );
    }

    case "choix":
      return (
        <fieldset disabled={!actif} className="space-y-2">
          {bloc.question && <legend className="mb-2 text-[15px] leading-relaxed">{bloc.question}</legend>}
          <div className={bloc.liste ? "flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1" : "flex flex-wrap gap-2"}>
            {bloc.choix.map((c) => (
              <button
                key={c.libelle}
                type="button"
                onClick={() => onChoix(c.libelle, c.action)}
                className={`min-h-[44px] touch-manipulation rounded-xl border-2 border-militant-bordeaux px-3.5 py-2 text-left text-[15px] font-semibold leading-snug text-militant-bordeaux transition-colors hover:bg-militant-bordeaux hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:cursor-default disabled:border-militant-ardoise disabled:text-militant-charbon disabled:hover:bg-transparent ${
                  bloc.liste ? "w-full" : ""
                }`}
              >
                {c.libelle}
              </button>
            ))}
          </div>
        </fieldset>
      );

    case "fiches":
      return (
        <ul className="space-y-2.5">
          {bloc.fiches.map((f, i) => (
            <li key={`${f.titre}-${i}`} className={`rounded-xl border px-3.5 py-3 text-[14px] leading-snug ${f.sousTitre === "La plus proche de chez vous" ? "border-2 border-militant-rouge" : "border-militant-ardoise"}`}>
              <p className="font-condensed text-[20px] font-extrabold leading-tight">{f.titre}</p>
              {f.sousTitre && <p className="font-semibold text-militant-bordeaux">{f.sousTitre}</p>}
              {f.adresse && <p className="mt-1">{f.adresse}</p>}
              {f.telephone && (
                <a
                  href={`tel:${f.telephone.replace(/[^\d+]/g, "")}`}
                  className="mt-1 inline-flex min-h-[32px] items-center gap-1.5 font-bold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
                >
                  <Phone size={14} aria-hidden /> {f.telephone}
                </a>
              )}
              {f.email && (
                <p className="break-all">
                  <a href={`mailto:${f.email}`} className="underline decoration-militant-rouge underline-offset-4 hover:text-militant-bordeaux">
                    {f.email}
                  </a>
                </p>
              )}
              {f.horaires && <p className="mt-1">{f.horaires}</p>}
              {f.site && (
                <a href={f.site} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 underline decoration-militant-rouge underline-offset-4 hover:text-militant-bordeaux">
                  Site web <ExternalLink size={13} aria-hidden />
                  <span className="sr-only">(nouvel onglet)</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      );

    case "contact":
      return (
        <div className="overflow-hidden rounded-2xl border-2 border-militant-bordeaux">
          <div className="space-y-1 px-4 py-3.5 text-[14px] leading-snug">
            <p className="font-condensed text-[22px] font-extrabold leading-tight">{bloc.contact.service}</p>
            {bloc.contact.email && <p className="break-all font-semibold">{bloc.contact.email}</p>}
            <a
              href={`tel:${bloc.contact.telephone.replace(/[^\d+]/g, "")}`}
              className="inline-flex min-h-[36px] items-center gap-1.5 text-[16px] font-bold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux"
            >
              <Phone size={16} aria-hidden /> {bloc.contact.telephone}
            </a>
            <p>{bloc.contact.horaires}</p>
          </div>
          <button
            type="button"
            disabled={transmise}
            onClick={() => onTransmettre(bloc.contact, bloc.resume)}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 bg-militant-bordeaux px-4 text-[16px] font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white disabled:cursor-default disabled:hover:bg-militant-bordeaux"
          >
            <Send size={17} aria-hidden /> {transmise ? "Demande transmise" : "Transmettre ma demande"}
          </button>
        </div>
      );
  }
}
