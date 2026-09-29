"use client";

import { useEffect, useState } from "react";
import { estLeJourJ, rebours, type Rebours } from "../../lib/mobilisations";

const UNITES: { cle: keyof Rebours; singulier: string; pluriel: string }[] = [
  { cle: "jours", singulier: "jour", pluriel: "jours" },
  { cle: "heures", singulier: "heure", pluriel: "heures" },
  { cle: "minutes", singulier: "minute", pluriel: "minutes" },
  { cle: "secondes", singulier: "seconde", pluriel: "secondes" },
];

/**
 * Compte à rebours jusqu'à la mobilisation : grands chiffres condensés, filets fins entre les unités.
 * Calculé dans le navigateur seulement (la page est mise en cache : l'heure du serveur serait fausse).
 * Le jour J : « C'est aujourd'hui ». Après : rien.
 * Sur fond bordeaux (`sombre`) ou blanc (`clair`).
 */
export default function CompteARebours({
  date,
  fond = "sombre",
  taille = "grand",
}: {
  date: string;
  fond?: "sombre" | "clair";
  taille?: "grand" | "moyen";
}) {
  const [maintenant, setMaintenant] = useState<number | null>(null);

  useEffect(() => {
    setMaintenant(Date.now());
    const id = window.setInterval(() => setMaintenant(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const reste = maintenant === null ? null : rebours(date, maintenant);
  const filet = fond === "sombre" ? "bg-white/35" : "bg-militant-ardoise";
  const chiffres =
    taille === "grand" ? "text-[44px] sm:text-7xl lg:text-[88px]" : "text-[40px] sm:text-6xl";

  if (maintenant !== null && !reste) {
    if (!estLeJourJ(date, maintenant)) return null;
    return (
      <p className={`font-condensed font-extrabold uppercase leading-none ${chiffres}`}>C&apos;est aujourd&apos;hui.</p>
    );
  }

  return (
    <div>
      {reste && (
        <p className="sr-only">
          Plus que {reste.jours} jour{reste.jours > 1 ? "s" : ""} et {reste.heures} heure{reste.heures > 1 ? "s" : ""}.
        </p>
      )}
      <div aria-hidden className="flex items-stretch">
        {UNITES.map((u, i) => {
          const v = reste?.[u.cle];
          return (
            <div key={u.cle} className="flex items-stretch">
              {i > 0 && <span className={`mx-3 w-px self-stretch sm:mx-5 ${filet}`} />}
              <div className="flex flex-col">
                <span className={`font-condensed font-extrabold leading-[0.9] tabular-nums tracking-tight ${chiffres}`}>
                  {v === undefined ? "––" : String(v).padStart(2, "0")}
                </span>
                <span className="mt-1.5 text-[13px] font-semibold sm:text-sm">
                  {v === 1 ? u.singulier : u.pluriel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
