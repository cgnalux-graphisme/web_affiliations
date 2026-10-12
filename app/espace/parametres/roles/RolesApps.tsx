"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import Interrupteur from "../../_partage/Interrupteur";
import { Alerte, EnteteEcran, Panneau } from "../../_partage/ui";
import { icone } from "../../_noyau/icones";
import { libelleRole } from "../../../../lib/espace/roles";
import { basculerRoleApp } from "../comptes/actions";

/** Rôles modifiables ici (le super admin a toujours toutes les apps). */
const ROLES_MODIFIABLES = ["ADMIN_OP", "PERMANENT", "DELEGATE"] as const;

type AppMini = { code: string; nom: string; couleur: string; icone: string; description: string };

export default function RolesApps({
  apps,
  lignes,
  modifiable,
}: {
  apps: AppMini[];
  lignes: { app_code: string; role: string }[];
  modifiable: boolean;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");
  const a = (role: string, code: string) => lignes.some((l) => l.role === role && l.app_code === code);

  function basculer(role: string, code: string, actif: boolean) {
    setErreur("");
    setOccupe(`${role}-${code}`);
    demarrer(async () => {
      const r = await basculerRoleApp(role, code, actif);
      setOccupe(null);
      if (!r.ok) setErreur(r.erreur);
      else router.refresh();
    });
  }

  return (
    <div className="ecg-ecran">
      <EnteteEcran
        icone="grid"
        titre="Apps par rôle"
        description="Les apps que chaque rôle reçoit par défaut. Une personne peut ensuite recevoir ou perdre une app par exception, dans Comptes & accès."
      />
      {!modifiable && (
        <Alerte ton="info" role={null}>
          Seul un super admin peut changer les apps d&apos;un rôle.
        </Alerte>
      )}
      <div aria-live="polite">{erreur && <Alerte ton="erreur">{erreur}</Alerte>}</div>

      <Panneau titre="Apps par défaut" sousTitre="Un changement s'applique tout de suite à toutes les personnes du rôle." corps={false}>
        <div className="ecg-tableau-cadre">
          <table className="ecg-tableau min-w-[760px]">
            <thead>
              <tr>
                <th scope="col">App</th>
                <th scope="col">{libelleRole("SUPER_ADMIN")}</th>
                {ROLES_MODIFIABLES.map((r) => (
                  <th key={r} scope="col">
                    {libelleRole(r)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => {
                const Icone = icone(app.icone);
                return (
                  <tr key={app.code}>
                    <th scope="row">
                      <span className="flex items-center gap-2.5">
                        <span className="ecg-mini" style={{ "--c": app.couleur } as React.CSSProperties} aria-hidden>
                          <Icone size={15} />
                        </span>
                        {app.nom}
                      </span>
                    </th>
                    <td>
                      <span className="ecg-texte-doux inline-flex items-center gap-1.5 text-sm font-semibold">
                        <Check size={16} aria-hidden /> Toujours
                      </span>
                    </td>
                    {ROLES_MODIFIABLES.map((r) => (
                      <td key={r}>
                        <Interrupteur
                          actif={a(r, app.code)}
                          onChange={(v) => basculer(r, app.code, v)}
                          label={`${libelleRole(r)} : ${app.nom}`}
                          etatOn="Oui"
                          etatOff="Non"
                          enCours={occupe === `${r}-${app.code}`}
                          disabled={!modifiable || enCours}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panneau>

      <Alerte ton="attention" role={null} titre="À savoir avant d'ouvrir une app à un nouveau rôle">
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>
            Cocher une app pour les <b>délégués</b> leur ouvre l&apos;Espace CG (aujourd&apos;hui réservé à l&apos;équipe).
          </li>
          <li>
            Les écrans des apps Actions syndicales, Scan News et Paramètres lisent et écrivent des tables encore
            réservées aux super admins dans la base : pour un autre rôle, l&apos;app s&apos;ouvre mais reste vide tant que
            ces règles ne sont pas adaptées. L&apos;app Démarches & demandes fonctionne pour tous.
          </li>
        </ul>
      </Alerte>
    </div>
  );
}
