import type { Metadata } from "next";
import { exigerApp, monProfil } from "../../../../lib/espace/acces";
import { chargerEquipe } from "../../../../lib/espace/equipe-serveur";
import { toutesLesApps } from "../../_noyau/registre";
import { Alerte } from "../../_partage/ui";
import GestionComptes from "./GestionComptes";

export const metadata: Metadata = { title: "Comptes & accès — Espace CG" };

/** Comptes & accès : l'équipe (super admins, admins opérationnels, permanents), leurs rôles et leurs apps. */
export default async function ComptesPage() {
  await exigerApp("parametres");
  const [donnees, apps, acteur] = await Promise.all([chargerEquipe(), toutesLesApps(), monProfil()]);

  if (!donnees || !acteur) {
    return (
      <div className="ecg-ecran">
        <Alerte ton="erreur">
          L&apos;équipe ne peut pas être chargée. Rechargez la page ; si le problème persiste, vérifiez la clé
          SUPABASE_SERVICE_ROLE_KEY.
        </Alerte>
      </div>
    );
  }

  return (
    <GestionComptes
      membres={donnees.membres}
      rolesApps={donnees.rolesApps}
      apps={apps.map(({ code, nom, couleur, icone }) => ({ code, nom, couleur, icone }))}
      acteur={{ id: acteur.id, role: acteur.role }}
    />
  );
}
