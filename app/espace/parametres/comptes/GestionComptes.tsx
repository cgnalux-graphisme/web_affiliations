"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Ban,
  Clock,
  History,
  KeyRound,
  Mail,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  UserRound,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import Interrupteur from "../../_partage/Interrupteur";
import { Confirmation, PanneauLateral } from "../../_partage/Fenetres";
import { Alerte, EnteteEcran, Statut, Vide } from "../../_partage/ui";
import { icone } from "../../_noyau/icones";
import { identite } from "../../_noyau/identite";
import { IconeChargement } from "../../../Chargement";
import {
  appsDuRole,
  appsEffectives,
  etatApp,
  quandJournal,
  refusChangementRole,
  refusSuppression,
  refusSuspension,
  ROLE_TOUTES_APPS,
} from "../../../../lib/espace/gestion-acces";
import type { MembreEquipe } from "../../../../lib/espace/equipe-serveur";
import { libelleRole, ROLES_EQUIPE } from "../../../../lib/espace/roles";
import { basculerApp, changerRole, envoyerReinitialisation, inviter, reactiver, supprimerCompte, suspendre, type Resultat } from "./actions";

type AppMini = { code: string; nom: string; couleur: string; icone: string };
type Acteur = { id: string; role: string };

const ICONES_ROLE: Record<string, LucideIcon> = { SUPER_ADMIN: ShieldCheck, ADMIN_OP: UserCog, PERMANENT: UserRound };
type Filtre = "tous" | (typeof ROLES_EQUIPE)[number];

/** « 08/10/2026 à 14:32 » (heure de Bruxelles). */
const date = (iso: string) => quandJournal(iso).replace(/^le /, "");

export default function GestionComptes({
  membres,
  rolesApps,
  apps,
  acteur,
}: {
  membres: MembreEquipe[];
  rolesApps: { app_code: string; role: string }[];
  apps: AppMini[];
  acteur: Acteur;
}) {
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [recherche, setRecherche] = useState("");
  const [selection, setSelection] = useState<string | null>(null);
  const [invitation, setInvitation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const ordre = apps.map((a) => a.code);
  const parCode = new Map(apps.map((a) => [a.code, a]));
  const superAdmin = acteur.role === ROLE_TOUTES_APPS;

  const visibles = useMemo(() => {
    const mots = recherche
      .toLocaleLowerCase("fr-BE")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .split(/\s+/)
      .filter(Boolean);
    return membres.filter((m) => {
      if (filtre !== "tous" && m.role !== filtre) return false;
      const texte = `${m.nom} ${m.email}`.toLocaleLowerCase("fr-BE").normalize("NFD").replace(/\p{Diacritic}/gu, "");
      return mots.every((mot) => texte.includes(mot));
    });
  }, [membres, filtre, recherche]);

  const compte = (f: Filtre) => (f === "tous" ? membres.length : membres.filter((m) => m.role === f).length);
  const choisi = membres.find((m) => m.id === selection) ?? null;

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="shield"
        titre="Comptes & accès"
        description="Qui peut se connecter, avec quel rôle, et à quelles apps. Le rôle est partagé avec CG Link."
        actions={
          <>
            <Link href="/espace/parametres/journal" className="ecg-btn">
              <History size={18} aria-hidden /> Journal
            </Link>
            <button type="button" className="ecg-btn ecg-btn-principal" onClick={() => setInvitation(true)}>
              <UserPlus size={18} aria-hidden /> Inviter un collègue
            </button>
          </>
        }
      />

      <div aria-live="polite">{message && <Alerte ton="succes">{message}</Alerte>}</div>

      <section className="ecg-panneau" aria-labelledby="titre-equipe">
        <div className="ecg-panneau-tete">
          <div>
            <h2 id="titre-equipe">Équipe</h2>
            <p>Les délégués ne sont pas listés ici.</p>
          </div>
          <div className="ecg-panneau-tete-actions">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
              <label htmlFor="recherche-equipe" className="sr-only">
                Rechercher une personne
              </label>
              <input
                id="recherche-equipe"
                name="recherche-equipe"
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Nom ou e-mail…"
                autoComplete="off"
                spellCheck={false}
                className="ecg-champ w-64 max-w-full pl-9"
              />
            </div>
          </div>
        </div>
        <div className="ecg-panneau-corps border-b border-[#dde2e7] py-3">
          <div role="group" aria-label="Filtrer par rôle" className="ecg-onglets">
            {(["tous", ...ROLES_EQUIPE] as Filtre[]).map((f) => (
              <button key={f} type="button" className="ecg-onglet" aria-pressed={filtre === f} onClick={() => setFiltre(f)}>
                {f === "tous" ? "Tous" : libelleRole(f)}
                <span className="ecg-compte">{compte(f)}</span>
              </button>
            ))}
          </div>
        </div>

        {visibles.length === 0 ? (
          <Vide icone="shield" titre="Personne ne correspond">
            Changez le filtre ou la recherche.
          </Vide>
        ) : (
          <div className="ecg-tableau-cadre">
            <table className="ecg-tableau min-w-[860px]">
              <thead>
                <tr>
                  <th scope="col">Personne</th>
                  <th scope="col">Rôle (CG Link)</th>
                  <th scope="col">Apps</th>
                  <th scope="col">Dernière connexion</th>
                  <th scope="col">
                    <span className="sr-only">Gérer</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((m) => {
                  const base = appsDuRole(m.role, rolesApps, ordre);
                  const lesApps = appsEffectives(m.role, base, m.exceptions, ordre);
                  const IconeRole = ICONES_ROLE[m.role] ?? UserRound;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="ecg-personne">
                          <span className="ecg-avatar" aria-hidden>
                            {identite(m.nom, m.email).initiales}
                          </span>
                          <div className="min-w-0">
                            <b>
                              {m.nom}
                              {m.id === acteur.id && <span className="ecg-texte-doux font-normal"> (vous)</span>}
                            </b>
                            <span className="break-all">{m.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Statut icone={IconeRole}>{libelleRole(m.role)}</Statut>
                      </td>
                      <td>
                        {lesApps.length ? (
                          <div className="ecg-puces">
                            {lesApps.map((a) => (
                              <PuceApp key={a.code} app={parCode.get(a.code)} exception={a.origine === "exception"} />
                            ))}
                          </div>
                        ) : (
                          <span className="ecg-texte-doux">Aucune</span>
                        )}
                      </td>
                      <td>
                        <EtatConnexion m={m} />
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="ecg-btn ecg-btn-petit"
                          onClick={() => setSelection(m.id)}
                          aria-label={`Gérer les accès de ${m.nom}`}
                        >
                          <Settings2 size={15} aria-hidden /> Gérer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {choisi && (
        <PanneauPersonne
          key={choisi.id}
          membre={choisi}
          membres={membres}
          apps={apps}
          rolesApps={rolesApps}
          acteur={acteur}
          onFermer={() => setSelection(null)}
          onMessage={setMessage}
        />
      )}
      <PanneauInvitation
        ouvert={invitation}
        superAdmin={superAdmin}
        onFermer={() => setInvitation(false)}
        onMessage={(m) => {
          setMessage(m);
          setInvitation(false);
        }}
      />
    </div>
  );
}

function PuceApp({ app, exception }: { app?: AppMini; exception?: boolean }) {
  if (!app) return null;
  const Icone = icone(app.icone);
  return (
    <span className={`ecg-puce-app${exception ? " ecg-puce-exception" : ""}`} style={{ "--c": app.couleur } as React.CSSProperties}>
      <span className="ecg-mini" style={{ "--c": app.couleur } as React.CSSProperties} aria-hidden>
        <Icone size={11} strokeWidth={2.4} />
      </span>
      {app.nom}
    </span>
  );
}

function EtatConnexion({ m }: { m: MembreEquipe }) {
  if (m.suspendu)
    return (
      <Statut ton="erreur" icone={Ban}>
        Suspendu
      </Statut>
    );
  if (m.invitationEnAttente)
    return (
      <Statut ton="attente" icone={Mail}>
        Invitation envoyée
      </Statut>
    );
  if (!m.derniereConnexion)
    return (
      <Statut ton="attente" icone={Clock}>
        Jamais connecté
      </Statut>
    );
  return <span className="ecg-chiffre whitespace-nowrap">{date(m.derniereConnexion)}</span>;
}

// ── Panneau « Gérer » ───────────────────────────────────────────────────────

const LIBELLES_ETAT = {
  role: "Inclus dans son rôle",
  retiree: "Retirée de son rôle (exception)",
  ajoutee: "Accès exceptionnel",
  aucun: "Pas d'accès",
};

function PanneauPersonne({
  membre: m,
  membres,
  apps,
  rolesApps,
  acteur,
  onFermer,
  onMessage,
}: {
  membre: MembreEquipe;
  membres: MembreEquipe[];
  apps: AppMini[];
  rolesApps: { app_code: string; role: string }[];
  acteur: Acteur;
  onFermer: () => void;
  onMessage: (m: string) => void;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");
  const [nouveauRole, setNouveauRole] = useState(m.role);
  const [confirmer, setConfirmer] = useState<"role" | "suspension" | "suppression" | null>(null);

  const superAdmin = acteur.role === ROLE_TOUTES_APPS;
  const cibleSuper = m.role === ROLE_TOUTES_APPS;
  const gerable = superAdmin || !cibleSuper;
  const base = appsDuRole(m.role, rolesApps, apps.map((a) => a.code));
  const refusRole = refusChangementRole(acteur, m, nouveauRole, membres);
  const refusSusp = refusSuspension(acteur, m, membres);
  const refusSuppr = refusSuppression(acteur, m, membres);

  function lancer(cle: string, action: () => Promise<Resultat>, apres?: () => void) {
    setErreur("");
    setInfo("");
    setOccupe(cle);
    demarrer(async () => {
      const r = await action();
      setOccupe(null);
      if (!r.ok) setErreur(r.erreur);
      else {
        if (r.message) setInfo(r.message);
        apres?.();
        router.refresh();
      }
    });
  }

  return (
    <>
      <PanneauLateral
        ouvert
        onFermer={onFermer}
        titre={m.nom}
        sousTitre={m.email}
        avant={
          <span className="ecg-avatar shrink-0 bg-[#e3e7eb] text-[#222]" aria-hidden>
            {identite(m.nom, m.email).initiales}
          </span>
        }
        pied={(fermer) => (
          <button type="button" className="ecg-btn" onClick={fermer}>
            Fermer
          </button>
        )}
      >
        <div aria-live="polite" className="empty:hidden">
          {erreur && <Alerte ton="erreur">{erreur}</Alerte>}
          {info && <Alerte ton="succes">{info}</Alerte>}
        </div>

        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="ecg-texte-doux">Dernière connexion :</span>
          <EtatConnexion m={m} />
        </p>

        {!gerable && (
          <Alerte ton="info" role={null}>
            Seul un super admin peut gérer le compte d&apos;un super admin.
          </Alerte>
        )}

        {/* Rôle */}
        <div>
          <label htmlFor="role-personne" className="ecg-libelle">
            Rôle (partagé avec CG Link)
          </label>
          <div className="flex flex-wrap gap-2">
            <select
              id="role-personne"
              name="role-personne"
              className="ecg-champ min-w-0 flex-1"
              value={nouveauRole}
              disabled={!superAdmin || enCours}
              onChange={(e) => setNouveauRole(e.target.value)}
            >
              {ROLES_EQUIPE.map((r) => (
                <option key={r} value={r}>
                  {libelleRole(r)}
                </option>
              ))}
            </select>
            {superAdmin && (
              <button
                type="button"
                className="ecg-btn"
                disabled={nouveauRole === m.role || enCours}
                onClick={() => (refusRole ? setErreur(refusRole) : setConfirmer("role"))}
              >
                Changer le rôle
              </button>
            )}
          </div>
          <p className="ecg-aide">
            {superAdmin
              ? "Changer le rôle change aussi les droits de cette personne dans CG Link."
              : "Seul un super admin peut changer un rôle."}
          </p>
        </div>

        {/* Apps */}
        <fieldset>
          <legend className="ecg-libelle">Apps</legend>
          {cibleSuper ? (
            <p className="ecg-aide mt-0">Un super admin a toujours toutes les apps.</p>
          ) : null}
          <ul className="mt-1 flex flex-col gap-2">
            {apps.map((a, i) => {
              const etat = cibleSuper ? "role" : etatApp(a.code, base, m.exceptions);
              const actif = etat === "role" || etat === "ajoutee";
              const Icone = icone(a.icone);
              return (
                <li key={a.code} className="ecg-ligne-app" style={{ "--i": i } as React.CSSProperties}>
                  <span className="ecg-mini" style={{ "--c": a.couleur } as React.CSSProperties} aria-hidden>
                    <Icone size={17} />
                  </span>
                  <div className="min-w-0">
                    <b>{a.nom}</b>
                    <span className="ecg-ligne-app-etat">{cibleSuper ? "Inclus (super admin)" : LIBELLES_ETAT[etat]}</span>
                  </div>
                  <Interrupteur
                    actif={actif}
                    onChange={(v) => lancer(`app-${a.code}`, () => basculerApp(m.id, a.code, v))}
                    label={`Accès de ${m.nom} à ${a.nom}`}
                    etatOn="Oui"
                    etatOff="Non"
                    enCours={occupe === `app-${a.code}`}
                    disabled={cibleSuper || !gerable || enCours}
                  />
                </li>
              );
            })}
          </ul>
          {!cibleSuper && (
            <p className="ecg-aide">
              Une exception vaut jusqu&apos;à ce qu&apos;on la retire. Remettre l&apos;interrupteur dans l&apos;état du
              rôle supprime l&apos;exception.
            </p>
          )}
        </fieldset>

        {/* Compte */}
        {gerable && (
          <div className="flex flex-col gap-2 border-t border-[#dde2e7] pt-4">
            <p className="ecg-libelle mb-0">Compte</p>
            <button
              type="button"
              className="ecg-btn justify-start"
              disabled={enCours || !m.email}
              onClick={() => lancer("reinit", () => envoyerReinitialisation(m.id))}
            >
              {occupe === "reinit" ? <IconeChargement size={16} /> : <KeyRound size={16} aria-hidden />}
              Envoyer un lien de réinitialisation du mot de passe
            </button>
            {m.suspendu ? (
              <button
                type="button"
                className="ecg-btn justify-start"
                disabled={enCours}
                onClick={() => lancer("reactiver", () => reactiver(m.id))}
              >
                {occupe === "reactiver" ? <IconeChargement size={16} /> : <UserRoundCheck size={16} aria-hidden />}
                Réactiver l&apos;accès
              </button>
            ) : (
              <button
                type="button"
                className="ecg-btn ecg-btn-danger-contour justify-start"
                disabled={enCours}
                onClick={() => (refusSusp ? setErreur(refusSusp) : setConfirmer("suspension"))}
              >
                <Ban size={16} aria-hidden /> Suspendre l&apos;accès
              </button>
            )}
            {superAdmin && (
              <button
                type="button"
                className="ecg-btn ecg-btn-danger justify-start"
                disabled={enCours}
                onClick={() => (refusSuppr ? setErreur(refusSuppr) : setConfirmer("suppression"))}
              >
                {occupe === "suppression" ? <IconeChargement size={16} /> : <Trash2 size={16} aria-hidden />}
                Supprimer définitivement le compte
              </button>
            )}
          </div>
        )}
      </PanneauLateral>

      <Confirmation
        ouverte={confirmer === "role"}
        titre={`Passer ${m.nom} en « ${libelleRole(nouveauRole)} » ?`}
        libelleConfirmer="Changer le rôle"
        enCours={occupe === "role"}
        onAnnuler={() => setConfirmer(null)}
        onConfirmer={() => {
          setConfirmer(null);
          lancer("role", () => changerRole(m.id, nouveauRole));
        }}
      >
        <p>Ce rôle est partagé avec CG Link. Le changer modifie aussi les droits de cette personne dans CG Link.</p>
      </Confirmation>
      <Confirmation
        ouverte={confirmer === "suspension"}
        titre={`Suspendre l'accès de ${m.nom} ?`}
        libelleConfirmer="Suspendre l'accès"
        danger
        enCours={occupe === "suspension"}
        onAnnuler={() => setConfirmer(null)}
        onConfirmer={() => {
          setConfirmer(null);
          lancer("suspension", () => suspendre(m.id), () => onMessage(`Accès de ${m.nom} suspendu.`));
        }}
      >
        <p>La personne ne pourra plus se connecter, ni ici, ni dans CG Link. Vous pourrez réactiver son accès plus tard.</p>
      </Confirmation>
      <Confirmation
        ouverte={confirmer === "suppression"}
        titre={`Supprimer définitivement le compte de ${m.nom} ?`}
        libelleConfirmer="Supprimer définitivement"
        danger
        enCours={occupe === "suppression"}
        onAnnuler={() => setConfirmer(null)}
        onConfirmer={() => {
          setConfirmer(null);
          lancer("suppression", () => supprimerCompte(m.id), () => {
            onMessage(`Compte de ${m.nom} supprimé.`);
            onFermer();
          });
        }}
      >
        <p>
          Le compte est effacé, ici et dans CG Link : la personne ne peut plus se connecter, et son profil, ses accès et
          sa fiche d&apos;équipe disparaissent. <b>C&apos;est irréversible</b> : pour la faire revenir, il faudra l&apos;inviter à
          nouveau.
        </p>
        <p className="mt-2">
          Pour couper l&apos;accès sans rien effacer, utilisez plutôt « Suspendre l&apos;accès ».
        </p>
      </Confirmation>
    </>
  );
}

// ── Panneau « Inviter un collègue » ─────────────────────────────────────────

function PanneauInvitation({
  ouvert,
  superAdmin,
  onFermer,
  onMessage,
}: {
  ouvert: boolean;
  superAdmin: boolean;
  onFermer: () => void;
  onMessage: (m: string) => void;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [saisie, setSaisie] = useState({ email: "", nom: "", role: "PERMANENT" });
  const [erreur, setErreur] = useState("");
  const roles = ROLES_EQUIPE.filter((r) => superAdmin || r !== ROLE_TOUTES_APPS);

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (enCours) return;
    setErreur("");
    demarrer(async () => {
      const r = await inviter(saisie);
      if (!r.ok) return setErreur(r.erreur);
      setSaisie({ email: "", nom: "", role: "PERMANENT" });
      onMessage(r.message ?? "Invitation envoyée.");
      router.refresh();
    });
  }

  return (
    <PanneauLateral
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Inviter un collègue"
      sousTitre="La personne reçoit un e-mail pour choisir son mot de passe. Le même compte sert dans CG Link."
    >
      {(fermer) => (
      <form onSubmit={envoyer} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="invite-nom" className="ecg-libelle">
            Nom et prénom
          </label>
          <input
            id="invite-nom"
            name="nom"
            autoComplete="off"
            className="ecg-champ"
            value={saisie.nom}
            onChange={(e) => setSaisie({ ...saisie, nom: e.target.value })}
            placeholder="Ex. Marie Dupont…"
          />
        </div>
        <div>
          <label htmlFor="invite-email" className="ecg-libelle">
            Adresse e-mail
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            spellCheck={false}
            className="ecg-champ"
            value={saisie.email}
            onChange={(e) => setSaisie({ ...saisie, email: e.target.value })}
            placeholder="prenom.nom@accg.be…"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="ecg-libelle">
            Rôle
          </label>
          <select
            id="invite-role"
            name="role"
            className="ecg-champ"
            value={saisie.role}
            onChange={(e) => setSaisie({ ...saisie, role: e.target.value })}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {libelleRole(r)}
              </option>
            ))}
          </select>
          <p className="ecg-aide">Le rôle est partagé avec CG Link. Les apps viennent du rôle ; vous pourrez en ajouter ensuite.</p>
        </div>
        <div aria-live="polite">{erreur && <Alerte ton="erreur">{erreur}</Alerte>}</div>
        <div className="flex justify-end gap-2">
          <button type="button" className="ecg-btn" onClick={fermer}>
            Annuler
          </button>
          <button type="submit" className="ecg-btn ecg-btn-principal">
            {enCours ? <IconeChargement size={16} /> : <UserPlus size={16} aria-hidden />}
            {enCours ? "Envoi…" : "Envoyer l'invitation"}
          </button>
        </div>
      </form>
      )}
    </PanneauLateral>
  );
}
