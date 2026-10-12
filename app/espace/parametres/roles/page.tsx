import type { Metadata } from "next";
import { exigerApp, monProfil } from "../../../../lib/espace/acces";
import { getSupabaseService } from "../../../../lib/supabase-service";
import { toutesLesApps } from "../../_noyau/registre";
import { Alerte } from "../../_partage/ui";
import RolesApps from "./RolesApps";

export const metadata: Metadata = { title: "Apps par rôle — Espace CG" };

/** Apps que chaque rôle reçoit par défaut (site_app_roles). */
export default async function RolesPage() {
  await exigerApp("parametres");
  const db = getSupabaseService();
  const [apps, acteur, lignes] = await Promise.all([
    toutesLesApps(),
    monProfil(),
    db ? db.from("site_app_roles").select("app_code, role") : Promise.resolve({ data: null, error: { code: "service" } }),
  ]);

  if (lignes.error || !acteur) {
    return (
      <div className="ecg-ecran">
        <Alerte ton="erreur">Les apps par rôle ne peuvent pas être chargées. Rechargez la page.</Alerte>
      </div>
    );
  }
  return (
    <RolesApps
      apps={apps.map(({ code, nom, couleur, icone, description }) => ({ code, nom, couleur, icone, description }))}
      lignes={(lignes.data ?? []) as { app_code: string; role: string }[]}
      modifiable={acteur.role === "SUPER_ADMIN"}
    />
  );
}
