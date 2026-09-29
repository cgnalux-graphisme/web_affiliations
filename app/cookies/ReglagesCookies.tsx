"use client";

import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import {
  ELEMENTS_COOKIES,
  TOUT_ACCEPTE,
  TOUT_REFUSE,
  type Categorie,
  type ElementCookie,
} from "../../lib/consentement";
import { isoToDateFr } from "../../lib/dates";
import { enregistrerChoix, useConsentement } from "../useConsentement";

/**
 * Réglages détaillés (/cookies#reglages, lien « En savoir plus » du pop-up et « Gérer les cookies » du pied
 * de page) : chaque élément stocké sur l'appareil, avec son interrupteur. Les indispensables sont verrouillés
 * (toujours actifs) ; les autres s'enregistrent dès qu'on les bascule. Liste : ELEMENTS_COOKIES.
 */
export default function ReglagesCookies() {
  const { pret, choix, autorise } = useConsentement();
  const [confirmation, setConfirmation] = useState(0); // incrémenté à chaque enregistrement

  useEffect(() => {
    if (!confirmation) return;
    const t = setTimeout(() => setConfirmation(0), 2500);
    return () => clearTimeout(t);
  }, [confirmation]);

  function basculer(categorie: Categorie, valeur: boolean) {
    enregistrerChoix({ cartes: autorise("cartes"), videos: autorise("videos"), [categorie]: valeur });
    setConfirmation((n) => n + 1);
  }

  function tout(accepter: boolean) {
    enregistrerChoix(accepter ? TOUT_ACCEPTE : TOUT_REFUSE);
    setConfirmation((n) => n + 1);
  }

  const indispensables = ELEMENTS_COOKIES.filter((e) => e.categorie === null);
  const optionnels = ELEMENTS_COOKIES.filter((e) => e.categorie !== null);
  const bouton =
    "inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-xl border-2 border-militant-charbon px-3 font-bold sm:px-5 transition-colors hover:border-militant-bordeaux hover:bg-militant-bordeaux hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2";

  return (
    <div className="rounded-2xl border-2 border-militant-charbon">
      <div className="flex flex-col gap-4 border-b-2 border-militant-charbon p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-[14px] font-bold uppercase tracking-wide">Vos choix</p>
          <p className="mt-0.5 text-lg font-bold text-militant-bordeaux" aria-live="polite">
            {!pret
              ? "…"
              : confirmation
                ? "Choix enregistrés"
                : choix
                  ? `Enregistrés le ${isoToDateFr(choix.date.slice(0, 10))}`
                  : "Pas encore faits : rien n'est chargé depuis Google ni YouTube"}
            {pret && confirmation > 0 && (
              <Check key={confirmation} size={20} className="liste-fondu ml-1.5 inline align-[-3px]" aria-hidden />
            )}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button type="button" onClick={() => tout(false)} className={`${bouton} flex-1 sm:flex-none`}>
            Tout refuser
          </button>
          <button type="button" onClick={() => tout(true)} className={`${bouton} flex-1 sm:flex-none`}>
            Tout accepter
          </button>
        </div>
      </div>

      <Groupe titre="Avec votre accord" detail="Désactivés tant que vous ne les activez pas. Enregistré dès que vous basculez.">
        {optionnels.map((e) => (
          <Ligne key={e.nom} element={e}>
            <Interrupteur
              actif={pret && autorise(e.categorie!)}
              desactive={!pret}
              libelle={e.nom}
              onChange={(v) => basculer(e.categorie!, v)}
            />
          </Ligne>
        ))}
      </Groupe>

      <Groupe titre="Indispensables" detail="Nécessaires au fonctionnement du site : ils ne demandent pas votre accord.">
        {indispensables.map((e) => (
          <Ligne key={e.nom} element={e}>
            <Interrupteur actif desactive verrouille libelle={e.nom} />
          </Ligne>
        ))}
      </Groupe>
    </div>
  );
}

function Groupe({ titre, detail, children }: { titre: string; detail: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-militant-ardoise last:border-b-0">
      <div className="px-5 pb-1 pt-5 sm:px-6">
        <h3 className="font-condensed text-2xl font-extrabold uppercase leading-none">{titre}</h3>
        <p className="mt-1 text-[15px]">{detail}</p>
      </div>
      <ul className="divide-y divide-militant-ardoise">{children}</ul>
    </section>
  );
}

function Ligne({ element: e, children }: { element: ElementCookie; children: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="break-words font-bold">{e.nom}</p>
        <p className="mt-1 text-[16px] leading-snug">{e.role}</p>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
          <div>
            <dt className="inline font-semibold">Fournisseur&nbsp;: </dt>
            <dd className="inline">{e.fournisseur}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Type&nbsp;: </dt>
            <dd className="inline">{e.type}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Durée&nbsp;: </dt>
            <dd className="inline">{e.duree}</dd>
          </div>
        </dl>
      </div>
      {children}
    </li>
  );
}

/** Interrupteur accessible (role="switch"), avec son état écrit (la couleur n'est qu'un renfort). */
function Interrupteur({
  actif,
  desactive = false,
  verrouille = false,
  libelle,
  onChange,
}: {
  actif: boolean;
  desactive?: boolean;
  verrouille?: boolean;
  libelle: string;
  onChange?: (v: boolean) => void;
}) {
  const etat = verrouille ? "Toujours actif" : actif ? "Activé" : "Désactivé";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={`${libelle} : ${etat}`}
      disabled={desactive}
      onClick={() => onChange?.(!actif)}
      className="flex min-h-[44px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge disabled:cursor-not-allowed"
    >
      <span
        aria-hidden
        className={`relative h-7 w-12 rounded-full border-2 transition-colors duration-200 motion-reduce:transition-none ${
          actif ? "border-militant-bordeaux bg-militant-bordeaux" : "border-militant-charbon bg-white"
        } ${verrouille ? "opacity-60" : ""}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full transition-transform duration-200 motion-reduce:transition-none ${
            actif ? "translate-x-5 bg-white" : "bg-militant-charbon"
          }`}
        >
          {verrouille && <Lock size={11} className="text-militant-bordeaux" />}
        </span>
      </span>
      <span aria-hidden className="whitespace-nowrap text-[12px] font-semibold">
        {etat}
      </span>
    </button>
  );
}
