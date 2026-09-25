"use client";

import { useEffect, useState } from "react";
import { MapPin, Phone } from "lucide-react";
import {
  BUREAUX,
  JOURS_OUVRABLES,
  estOuvert,
  horaireLisible,
  maintenantBruxelles,
  periodeDuMois,
  type Jour,
  type Periode,
} from "../../lib/bureaux";

const PERIODES: { id: Periode; libelle: string; detail: string }[] = [
  { id: "annee", libelle: "Toute l'année", detail: "septembre à juin" },
  { id: "ete", libelle: "Été", detail: "juillet et août" },
];

/**
 * Bureaux d'accueil : horaires de la période en cours (juillet-août = été),
 * statut "ouvert maintenant" calculé à l'heure de Bruxelles, mis à jour chaque minute.
 * Le statut n'apparaît qu'après chargement dans le navigateur (l'heure du serveur ne compte pas).
 */
export default function Bureaux() {
  const [maintenant, setMaintenant] = useState<ReturnType<typeof maintenantBruxelles> | null>(null);
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Période des horaires" className="inline-flex rounded-xl border-2 border-militant-charbon p-1">
          {PERIODES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={affichee === p.id}
              onClick={() => setPeriode(p.id)}
              className={`min-h-[44px] rounded-lg px-4 text-left leading-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-militant-rouge ${
                affichee === p.id ? "bg-militant-bordeaux text-white" : "hover:text-militant-bordeaux"
              }`}
            >
              <span className="block font-bold">{p.libelle}</span>
              <span className="block text-sm">{p.detail}</span>
            </button>
          ))}
        </div>
        {maintenant && affichee !== periodeActuelle && (
          <p className="text-[15px] font-semibold">Vous consultez une autre période que la période actuelle.</p>
        )}
      </div>

      <ul className="mt-8 grid gap-5 md:grid-cols-2">
        {BUREAUX.map((b) => {
          const ouvert = statutReel && estOuvert(b, affichee, maintenant!.jour, maintenant!.minutes);
          const itineraire = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.adresse.join(", "))}`;
          return (
            <li
              key={b.ville}
              className={`flex flex-col gap-5 rounded-2xl border bg-white p-6 ${
                b.siege ? "border-2 border-militant-bordeaux" : "border-militant-ardoise"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {b.siege && (
                    <p className="mb-2 inline-block rounded-full bg-militant-bordeaux px-3 py-0.5 text-sm font-bold text-white">
                      Siège social
                    </p>
                  )}
                  <h3 className="font-condensed text-4xl font-extrabold leading-none">{b.ville}</h3>
                </div>
                {statutReel && (
                  <p
                    className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1 text-sm font-bold ${
                      ouvert ? "border-militant-bordeaux text-militant-bordeaux" : "border-militant-ardoise"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full ${ouvert ? "bg-militant-rouge" : "bg-militant-ardoise"}`}
                    />
                    {ouvert ? "Ouvert maintenant" : "Fermé actuellement"}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 text-[17px]">
                <p className="flex items-start gap-2">
                  <MapPin size={18} className="mt-1 shrink-0 text-militant-rouge" aria-hidden />
                  <span>
                    {b.adresse[0]}
                    <br />
                    {b.adresse[1]}
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={18} className="shrink-0 text-militant-rouge" aria-hidden />
                  <a href={`tel:${b.telephoneLien}`} className="font-bold underline decoration-militant-rouge decoration-2 underline-offset-4 hover:text-militant-bordeaux">
                    {b.telephone}
                  </a>
                </p>
                <p>
                  <a
                    href={itineraire}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline decoration-militant-ardoise decoration-2 underline-offset-4 hover:text-militant-bordeaux hover:decoration-militant-rouge"
                  >
                    Itinéraire vers le bureau de {b.ville}
                  </a>
                </p>
              </div>

              <div>
                <p className="border-b-2 border-militant-charbon pb-1.5 font-condensed text-xl font-extrabold">
                  Horaires d&apos;accueil
                </p>
                <table className="mt-1 w-full text-[15px]">
                  <caption className="sr-only">
                    Horaires du bureau de {b.ville}, {PERIODES.find((p) => p.id === affichee)!.libelle.toLowerCase()}
                  </caption>
                  <tbody>
                    {JOURS_OUVRABLES.map((j: Jour) => {
                      const aujourdHui = statutReel && maintenant!.jour === j;
                      return (
                        <tr key={j} className="border-b border-militant-ardoise last:border-b-0">
                          <th
                            scope="row"
                            className={`py-2 pl-3 text-left font-semibold ${aujourdHui ? "border-l-4 border-militant-rouge font-extrabold" : "border-l-4 border-transparent"}`}
                          >
                            {j}
                            {aujourdHui && <span className="sr-only"> (aujourd&apos;hui)</span>}
                          </th>
                          <td className={`py-2 text-right tabular-nums ${aujourdHui ? "font-extrabold" : "font-semibold"}`}>
                            {horaireLisible(b.horaires[affichee][j])}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
