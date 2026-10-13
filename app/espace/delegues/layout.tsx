import GardeApp from "../_noyau/GardeApp";

/**
 * SUPER_ADMIN : tous les délégués. Toute autre personne qui a l'app (les permanents, par site_app_roles) : les
 * délégués de ses entreprises seulement, sans les paramètres de connexion (vérifié par chaque page et action).
 */
export default async function Layout({ children }: { children: React.ReactNode }) {
  return <GardeApp code="delegues">{children}</GardeApp>;
}
