import type { Metadata } from "next";
import { redirect } from "next/navigation";
import "./espace.css";
import "./espace-composants.css";
import { accesEspace, monProfil } from "../../lib/espace/acces";
import { libelleRole } from "../../lib/espace/roles";
import { appsDeLaPersonne } from "./_noyau/registre";
import CadreEspace, { type ProfilCadre } from "./_noyau/CadreEspace";
import EspaceReserve from "./_noyau/EspaceReserve";
import { identite } from "./_noyau/identite";

export const metadata: Metadata = {
  title: "Espace CG — Centrale Générale FGTB Namur-Luxembourg",
  robots: { index: false, follow: false },
};

// Droits lus à chaque requête : jamais de page mise en cache.
export const dynamic = "force-dynamic";

/**
 * Espace CG : 1er niveau de protection (connexion exigée, aussi vérifiée par proxy.ts).
 * 2e niveau : la garde de chaque app (app/espace/<code>/layout.tsx). 3e : chaque page, action et route API.
 */
export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const profil = await monProfil();
  if (!profil) redirect("/login?next=/espace");

  const id = identite(profil.nom, profil.email);
  if ((await accesEspace()) === "refuse") return <EspaceReserve prenom={id.prenom} />;

  const apps = await appsDeLaPersonne();
  const cadre: ProfilCadre = { ...id, email: profil.email, role: libelleRole(profil.role) };
  return (
    <CadreEspace apps={apps} profil={cadre}>
      {children}
    </CadreEspace>
  );
}
