import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { icone } from "../_noyau/icones";

/*
 * Briques d'interface communes à tous les écrans de l'Espace CG (styles : app/espace/espace-composants.css).
 * Sans état ni effet : utilisables depuis un composant serveur comme depuis un composant client.
 */

/** Classes des boutons et champs (à combiner : `${BTN} ${BTN_PETIT}`). */
export const BTN = "ecg-btn";
export const BTN_PRINCIPAL = "ecg-btn ecg-btn-principal";
export const BTN_DANGER = "ecg-btn ecg-btn-danger";
export const BTN_FANTOME = "ecg-btn ecg-btn-fantome";
export const BTN_PETIT = "ecg-btn-petit";
export const CHAMP = "ecg-champ";
export const LIBELLE = "ecg-libelle";
export const AIDE = "ecg-aide";
export const LIEN = "ecg-lien";
export const ONGLET = "ecg-onglet";

/** En-tête d'écran : pastille d'icône à la couleur de l'app, titre, description, actions à droite. */
export function EnteteEcran({
  titre,
  description,
  icone: nomIcone,
  actions,
}: {
  titre: React.ReactNode;
  description?: React.ReactNode;
  /** Nom d'icône (app/espace/_noyau/icones.ts), en général celui de la section du menu. */
  icone: string;
  actions?: React.ReactNode;
}) {
  const Icone = icone(nomIcone);
  return (
    <header className="ecg-entete">
      <span className="ecg-entete-ico" aria-hidden>
        <Icone size={26} strokeWidth={1.8} />
      </span>
      <div className="ecg-entete-texte">
        <h1>{titre}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ecg-entete-actions">{actions}</div>}
    </header>
  );
}

/** Panneau blanc avec en-tête facultatif (titre, sous-titre, actions) et pied facultatif. */
export function Panneau({
  titre,
  sousTitre,
  actions,
  pied,
  corps = true,
  id,
  className = "",
  children,
}: {
  titre?: React.ReactNode;
  sousTitre?: React.ReactNode;
  actions?: React.ReactNode;
  pied?: React.ReactNode;
  /** false : le contenu touche les bords (tableau, liste en lignes). */
  corps?: boolean;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const idTitre = id ? `${id}-titre` : undefined;
  return (
    <section id={id} className={`ecg-panneau ${className}`} aria-labelledby={titre ? idTitre : undefined}>
      {(titre || actions) && (
        <div className="ecg-panneau-tete">
          {titre && (
            <div>
              <h2 id={idTitre}>{titre}</h2>
              {sousTitre && <p>{sousTitre}</p>}
            </div>
          )}
          {actions && <div className="ecg-panneau-tete-actions">{actions}</div>}
        </div>
      )}
      {corps ? <div className="ecg-panneau-corps">{children}</div> : children}
      {pied && <div className="ecg-panneau-pied">{pied}</div>}
    </section>
  );
}

const TONS: Record<"succes" | "erreur" | "info" | "attention", LucideIcon> = {
  succes: CircleCheck,
  erreur: CircleAlert,
  info: Info,
  attention: TriangleAlert,
};

/** Message en bandeau : confirmation, erreur, information, mise en garde. Toujours icône + texte. */
export function Alerte({
  ton = "info",
  titre,
  icone: IconeImposee,
  role,
  className = "",
  children,
}: {
  ton?: keyof typeof TONS;
  titre?: React.ReactNode;
  icone?: LucideIcon;
  /** Par défaut : « alert » pour une erreur, « status » sinon. null = aucun rôle (texte permanent). */
  role?: "alert" | "status" | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const Icone = IconeImposee ?? TONS[ton];
  const leRole = role === null ? undefined : role ?? (ton === "erreur" ? "alert" : "status");
  return (
    <div role={leRole} className={`ecg-alerte ecg-alerte-${ton} ${className}`}>
      <Icone size={20} aria-hidden />
      <div className="ecg-alerte-corps">
        {titre && <b>{titre}</b>}
        {children}
      </div>
    </div>
  );
}

/** État vide : icône, titre, explication et action facultative. */
export function Vide({
  icone: nomIcone,
  titre,
  children,
  action,
}: {
  icone: string;
  titre: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const Icone = icone(nomIcone);
  return (
    <div className="ecg-vide">
      <span className="ecg-vide-ico" aria-hidden>
        <Icone size={26} strokeWidth={1.8} />
      </span>
      <p className="ecg-vide-titre">{titre}</p>
      {children && <div className="max-w-[52ch]">{children}</div>}
      {action}
    </div>
  );
}

/** Pastille de statut : toujours une icône et un texte (jamais la couleur seule). */
export function Statut({
  ton,
  icone: Icone,
  children,
}: {
  ton?: "ok" | "attente" | "info" | "erreur";
  icone: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span className={`ecg-statut${ton ? ` ecg-statut-${ton}` : ""}`}>
      <Icone size={14} aria-hidden />
      {children}
    </span>
  );
}
