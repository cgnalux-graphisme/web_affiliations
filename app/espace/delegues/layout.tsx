import GardeApp from "../_noyau/GardeApp";
import SansAcces from "../_noyau/SansAcces";
import { estSuperAdmin } from "../../../lib/espace/acces";

/** Réservée au SUPER_ADMIN par le rôle : donner l'app à un autre compte n'ouvre rien. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  if (!(await estSuperAdmin())) return <SansAcces nomApp="Gestion délégués CG Link" />;
  return <GardeApp code="delegues">{children}</GardeApp>;
}
