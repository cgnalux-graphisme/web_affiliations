import type { Metadata } from "next";
import Link from "next/link";
import { BellDot, Clock, Flag, LayoutGrid } from "lucide-react";
import { monProfil } from "../../lib/espace/acces";
import { chargerMobilisationActive } from "../../lib/mobilisations-public";
import { dateMobilisation } from "../../lib/mobilisations";
import { appsDeLaPersonne, badges, PROCHAINES_APPS } from "./_noyau/registre";
import { icone } from "./_noyau/icones";
import { identite } from "./_noyau/identite";
import { LienTransition } from "./_noyau/Transition";

export const metadata: Metadata = { title: "Tableau de bord — Espace CG" };

/** Jour de la semaine + date jj/mm/aaaa, à l'heure de Bruxelles (jamais de mois en lettres). */
function aujourdhui(): string {
  const maintenant = new Date();
  const jour = new Intl.DateTimeFormat("fr-BE", { weekday: "long", timeZone: "Europe/Brussels" }).format(maintenant);
  const date = new Intl.DateTimeFormat("fr-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Brussels",
  }).format(maintenant);
  return `${jour.charAt(0).toUpperCase()}${jour.slice(1)} ${date}`;
}

/** Tableau de bord : « Bonjour », la date, et une tuile par app de la personne (puis les apps à venir). */
export default async function TableauDeBord() {
  const [profil, apps, mobilisation] = await Promise.all([monProfil(), appsDeLaPersonne(), chargerMobilisationActive()]);
  const lesBadges = await badges(apps.map((a) => a.code));
  const { prenom } = identite(profil?.nom ?? null, profil?.email ?? "");

  return (
    <div className="ecg-vue">
      <div className="ecg-bonjour">
        <div>
          <h1>Bonjour{prenom ? ` ${prenom}` : ""}</h1>
          <p>{aujourdhui()}</p>
        </div>
        {mobilisation && (
          <div className="ecg-pastilles">
            <a className="ecg-pastille" href={`/mobilisation/${mobilisation.slug}`} target="_blank" rel="noopener">
              <Flag size={16} aria-hidden className="text-militant-rouge" />
              <span>
                Mobilisation : {mobilisation.titre}
                {mobilisation.date_evenement ? `, ${dateMobilisation(mobilisation.date_evenement, false)}` : ""}
                <span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
              </span>
            </a>
          </div>
        )}
      </div>

      {apps.length === 0 ? (
        <div className="ecg-panneau">
          <div className="ecg-vide">
            <span className="ecg-vide-ico" aria-hidden>
              <LayoutGrid size={26} strokeWidth={1.8} />
            </span>
            <h2 className="ecg-vide-titre">Aucune app pour le moment</h2>
            <p>
              Votre compte n&apos;a encore accès à aucune app. Demandez un accès à un super admin. En attendant, vous
              pouvez gérer votre profil et votre mot de passe dans « Mon compte ».
            </p>
            <Link href="/espace/compte" className="ecg-btn">
              Mon compte
            </Link>
          </div>
        </div>
      ) : (
        <section aria-labelledby="titre-apps">
          <h2 id="titre-apps" className="ecg-titre-section">
            Mes apps
          </h2>
          <ul className="ecg-apps">
            {apps.map((a, i) => {
              const Icone = icone(a.icone);
              const badge = lesBadges[a.code];
              return (
                <li key={a.code}>
                  <LienTransition
                    href={`/espace/${a.code}`}
                    className="ecg-tuile"
                    style={{ "--c": a.couleur, "--i": i } as React.CSSProperties}
                  >
                    <span className="ecg-tuile-ico" aria-hidden>
                      <Icone size={28} strokeWidth={1.7} />
                    </span>
                    <h3>{a.nom}</h3>
                    {a.description && <p>{a.description}</p>}
                    {badge && (
                      <span className="ecg-badge">
                        <BellDot size={14} aria-hidden /> {badge}
                      </span>
                    )}
                  </LienTransition>
                </li>
              );
            })}
            {PROCHAINES_APPS.map((p) => {
              const Icone = icone(p.icone);
              return (
                <li key={p.nom}>
                  <div className="ecg-tuile ecg-bientot" aria-disabled="true">
                    <span className="ecg-tuile-ico" aria-hidden>
                      <Icone size={28} strokeWidth={1.7} />
                    </span>
                    <h3>{p.nom}</h3>
                    <p>{p.description}</p>
                    <span className="ecg-badge">
                      <Clock size={14} aria-hidden /> Bientôt
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
