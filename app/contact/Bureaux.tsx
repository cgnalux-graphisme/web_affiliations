"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MapPin, Navigation, Phone } from "lucide-react";
import {
  BUREAUX,
  JOURS_OUVRABLES,
  estOuvert,
  horaireLisible,
  lienCarteIntegree,
  lienItineraire,
  maintenantBruxelles,
  periodeDuMois,
  prochainChangement,
  type Bureau,
  type Jour,
  type Periode,
} from "../../lib/bureaux";

const PERIODES: { id: Periode; libelle: string; detail: string }[] = [
  { id: "annee", libelle: "Toute l'année", detail: "septembre à juin" },
  { id: "ete", libelle: "Été", detail: "juillet et août" },
];

type Maintenant = ReturnType<typeof maintenantBruxelles>;

/**
 * Bureaux d'accueil : horaires de la période en cours (juillet-août = été),
 * statut "ouvert maintenant" calculé à l'heure de Bruxelles, mis à jour chaque minute.
 * Le statut n'apparaît qu'après chargement dans le navigateur (l'heure du serveur ne compte pas).
 */
export default function Bureaux() {
  const [maintenant, setMaintenant] = useState<Maintenant | null>(null);
  const [periode, setPeriode] = useState<Periode | null>(null);

  useEffect(() => {
    const maj = () => setMaintenant(maintenantBruxelles());
    maj();
    const t = setInterval(maj, 60_000);
    return () => clearInterval(t);
  }, []);

  const periodeActuelle = maintenant ? periodeDuMois(maintenant.mois) : "annee";
  const affichee = periode ?? periodeActuelle;
  const statutReel = affichee === periodeActuelle && maintenant !== null;

  const ouverts = maintenant
    ? BUREAUX.filter((b) => estOuvert(b, periodeActuelle, maintenant.jour, maintenant.minutes)).map((b) => b.ville)
    : [];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <SelecteurPeriode valeur={affichee} onChange={setPeriode} />
        {maintenant && (
          <p aria-live="polite" className="flex items-center gap-2.5 text-[17px] font-semibold">
            <Pastille ouvert={ouverts.length > 0} />
            {ouverts.length === 0
              ? "En ce moment, tous nos bureaux sont fermés."
              : ouverts.length === BUREAUX.length
                ? "En ce moment, nos 4 bureaux sont ouverts."
                : `En ce moment : ${enumerer(ouverts)} ${ouverts.length > 1 ? "sont ouverts" : "est ouvert"}.`}
          </p>
        )}
      </div>
      {maintenant && affichee !== periodeActuelle && (
        <p className="mt-3 text-[15px] font-semibold">
          Vous consultez les horaires d&apos;une autre période que la période actuelle.
        </p>
      )}

      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {BUREAUX.map((b, i) => (
          <CarteBureau
            key={b.ville}
            bureau={b}
            rang={i}
            periode={affichee}
            maintenant={statutReel ? maintenant : null}
          />
        ))}
      </ul>
    </div>
  );
}

function CarteBureau({
  bureau: b,
  rang,
  periode,
  maintenant,
}: {
  bureau: Bureau;
  rang: number;
  periode: Periode;
  /** null = pas de statut (avant chargement, ou autre période affichée). */
  maintenant: Maintenant | null;
}) {
  const ouvert = maintenant ? estOuvert(b, periode, maintenant.jour, maintenant.minutes) : false;
  const suite = maintenant ? prochainChangement(b, periode, maintenant.jour, maintenant.minutes) : null;
  const libellePeriode = PERIODES.find((p) => p.id === periode)!.libelle.toLowerCase();

  return (
    <li
      className={`group flex flex-col overflow-hidden rounded-2xl bg-white transition-shadow duration-300 hover:shadow-[0_14px_40px_-18px_rgba(34,34,34,0.35)] ${
        b.siege ? "border-2 border-militant-bordeaux" : "border border-militant-ardoise"
      }`}
    >
      <Carte bureau={b} rang={rang} />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {b.siege && (
              <p className="mb-2 inline-block rounded-full bg-militant-bordeaux px-3 py-0.5 text-sm font-bold text-white">
                Siège social
              </p>
            )}
            <h3 className="font-condensed text-4xl font-extrabold leading-none">{b.ville}</h3>
          </div>
          {maintenant && (
            <div className="text-right">
              <p
                className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-sm font-bold ${
                  ouvert ? "border-militant-bordeaux text-militant-bordeaux" : "border-militant-ardoise"
                }`}
              >
                <Pastille ouvert={ouvert} />
                {ouvert ? "Ouvert maintenant" : "Fermé actuellement"}
              </p>
              {suite && <p className="mt-1.5 text-[15px] font-semibold">{suite}</p>}
            </div>
          )}
        </div>

        <p className="flex items-start gap-2.5 text-[17px] leading-snug">
          <MapPin size={20} className="mt-0.5 shrink-0 text-militant-rouge" aria-hidden />
          <span>
            {b.adresse[0]}
            <br />
            {b.adresse[1]}
          </span>
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href={`tel:${b.telephoneLien}`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-militant-bordeaux px-4 font-bold text-white transition-colors hover:bg-militant-charbon focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
          >
            <Phone size={18} aria-hidden />
            <span>
              <span className="sr-only">Appeler le bureau de {b.ville} au </span>
              {b.telephone}
            </span>
          </a>
          <a
            href={lienItineraire(b)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-militant-charbon px-4 font-bold transition-colors hover:border-militant-bordeaux hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2"
          >
            <Navigation size={18} aria-hidden />
            Itinéraire
            <span className="sr-only"> vers le bureau de {b.ville} (Google Maps, nouvel onglet)</span>
          </a>
        </div>

        <div className="mt-auto">
          <p className="border-b-2 border-militant-charbon pb-1.5 font-condensed text-xl font-extrabold">
            Horaires d&apos;accueil
          </p>
          {/* La clé relance le fondu quand on change de période. */}
          <table key={periode} className="liste-fondu mt-1 w-full text-[15px]">
            <caption className="sr-only">
              Horaires du bureau de {b.ville}, {libellePeriode}
            </caption>
            <tbody>
              {JOURS_OUVRABLES.map((j: Jour) => {
                const aujourdHui = maintenant?.jour === j;
                const creneaux = b.horaires[periode][j];
                return (
                  <tr key={j} className="border-b border-militant-ardoise last:border-b-0">
                    <th
                      scope="row"
                      className={`border-l-4 py-2 pl-3 text-left ${
                        aujourdHui ? "border-militant-rouge font-extrabold" : "border-transparent font-semibold"
                      }`}
                    >
                      {j}
                      {aujourdHui && <span className="sr-only"> (aujourd&apos;hui)</span>}
                    </th>
                    <td
                      className={`py-2 text-right tabular-nums ${aujourdHui ? "font-extrabold" : "font-semibold"} ${
                        creneaux.length ? "" : "text-militant-bordeaux"
                      }`}
                    >
                      {horaireLisible(creneaux)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </li>
  );
}

/**
 * Carte Google Maps chargée au clic seulement : avant, aucune requête vers Google (pas de cookie,
 * cf. politique cookies). Un plan stylisé aux couleurs du site tient la place. Carte affichée en
 * niveaux de gris pour rester dans la palette (le vert et le bleu sont réservés à la CSC et à Synova).
 */
function Carte({ bureau: b, rang }: { bureau: Bureau; rang: number }) {
  const [affichee, setAffichee] = useState(false);
  const [chargee, setChargee] = useState(false);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-militant-ardoise bg-militant-ardoise/15">
      {affichee ? (
        <>
          {!chargee && (
            <p className="absolute inset-0 grid place-items-center text-[15px] font-semibold">Chargement de la carte…</p>
          )}
          <iframe
            src={lienCarteIntegree(b)}
            title={`Carte : bureau de ${b.ville}, ${b.adresse.join(", ")}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            onLoad={() => setChargee(true)}
            className={`absolute inset-0 h-full w-full border-0 grayscale transition-opacity duration-500 ${chargee ? "opacity-100" : "opacity-0"}`}
          />
        </>
      ) : (
        <>
          <PlanStylise rang={rang} />
          <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 p-4 text-center">
            <button
              type="button"
              onClick={() => setAffichee(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-2 border-militant-charbon bg-white px-5 font-bold shadow-[0_6px_20px_-8px_rgba(34,34,34,0.5)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-militant-bordeaux hover:text-militant-bordeaux focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <MapPin size={18} className="text-militant-rouge" aria-hidden />
              Afficher la carte
              <span className="sr-only"> du bureau de {b.ville}</span>
            </button>
            <p className="rounded bg-white/85 px-2 py-0.5 text-[13px] font-semibold">
              Carte Google Maps, chargée seulement si vous cliquez.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

/** Plan de rues abstrait (décoratif), tourné différemment pour chaque bureau. */
function PlanStylise({ rang }: { rang: number }) {
  const angle = [-8, 14, -22, 6][rang % 4];
  return (
    <svg
      aria-hidden
      viewBox="0 0 400 225"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    >
      <g transform={`rotate(${angle} 200 112)`} fill="none" stroke="#FFFFFF" strokeLinecap="round">
        <path d="M-60 150 C 60 120, 140 190, 260 140 S 420 80, 480 110" strokeWidth="14" strokeOpacity="0.75" />
        <path d="M-40 60 L 460 40" strokeWidth="7" />
        <path d="M-40 200 L 460 180" strokeWidth="5" />
        <path d="M90 -40 L 130 280" strokeWidth="7" />
        <path d="M250 -40 L 225 280" strokeWidth="5" />
        <path d="M340 -40 L 360 280" strokeWidth="4" />
        <path d="M20 -40 L 40 280" strokeWidth="3" />
        <path d="M-40 110 L 460 95" strokeWidth="3" />
        <path d="M170 -40 L 180 280" strokeWidth="2.5" strokeOpacity="0.8" />
      </g>
      <g transform="translate(200 78)">
        <ellipse cx="0" cy="22" rx="11" ry="3.5" fill="#222222" fillOpacity="0.18" />
        <path d="M0 22 C -4 12, -16 4, -16 -8 A 16 16 0 0 1 16 -8 C 16 4, 4 12, 0 22 Z" fill="#E32119" />
        <circle cx="0" cy="-8" r="5.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

/** Point de statut ; s'il est ouvert, une onde s'en échappe (coupée en mouvement réduit). */
function Pastille({ ouvert }: { ouvert: boolean }) {
  return (
    <span aria-hidden className="relative inline-flex h-2.5 w-2.5 shrink-0">
      {ouvert && <span className="contact-pouls absolute inset-0 rounded-full bg-militant-rouge" />}
      <span className={`relative h-2.5 w-2.5 rounded-full ${ouvert ? "bg-militant-rouge" : "bg-militant-ardoise"}`} />
    </span>
  );
}

/** Sélecteur à segments : l'aplat bordeaux glisse sous la période choisie (même principe que /actualites). */
function SelecteurPeriode({ valeur, onChange }: { valeur: Periode; onChange: (p: Periode) => void }) {
  const boutons = useRef<Map<Periode, HTMLButtonElement>>(new Map());
  const piste = useRef<HTMLDivElement>(null);
  const [indicateur, setIndicateur] = useState<{ x: number; largeur: number } | null>(null);
  const [anime, setAnime] = useState(false);

  useLayoutEffect(() => {
    const mesurer = () => {
      const b = boutons.current.get(valeur);
      if (b) setIndicateur({ x: b.offsetLeft, largeur: b.offsetWidth });
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    if (piste.current) observateur.observe(piste.current);
    return () => observateur.disconnect();
  }, [valeur]);

  // Le glissement ne s'active qu'après la première mesure : au chargement, l'aplat est déjà en place.
  useEffect(() => {
    if (!indicateur || anime) return;
    const id = requestAnimationFrame(() => setAnime(true));
    return () => cancelAnimationFrame(id);
  }, [indicateur, anime]);

  return (
    <div
      ref={piste}
      role="group"
      aria-label="Période des horaires"
      className="relative inline-flex rounded-2xl border-2 border-militant-charbon bg-white p-1"
    >
      <span
        aria-hidden
        className={`${anime ? "segment-indicateur" : ""} absolute bottom-1 left-0 top-1 rounded-xl bg-militant-bordeaux ${
          indicateur ? "opacity-100" : "opacity-0"
        }`}
        style={indicateur ? { width: indicateur.largeur, transform: `translateX(${indicateur.x}px)` } : undefined}
      />
      {PERIODES.map((p) => {
        const actif = p.id === valeur;
        return (
          <button
            key={p.id}
            ref={(el) => {
              if (el) boutons.current.set(p.id, el);
              else boutons.current.delete(p.id);
            }}
            type="button"
            aria-pressed={actif}
            onClick={() => onChange(p.id)}
            className={`relative z-10 min-h-[44px] rounded-xl px-4 py-1.5 text-left leading-tight transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
              actif ? "text-white" : "hover:text-militant-bordeaux"
            } ${actif && !indicateur ? "bg-militant-bordeaux" : ""}`}
          >
            <span className="block font-bold">{p.libelle}</span>
            <span className="block text-sm">{p.detail}</span>
          </button>
        );
      })}
    </div>
  );
}

/** « Libramont, Namur et Arlon ». */
function enumerer(noms: string[]): string {
  return noms.length < 2 ? (noms[0] ?? "") : `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
}
